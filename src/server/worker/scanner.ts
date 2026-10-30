import { ethers } from 'ethers';
import {
  getAllAssignedWallets,
  getBlockTracker,
  upsertBlockTracker,
  findTransactionByHashAndLog,
  findSweepTaskByTxHash,
  createTransactionRecord,
  incrementBalance,
  processReferralCommissions,
  createSweepTaskRecord,
} from '../db';
import { CONFIG, BSC_RPC_ENDPOINTS, createBscProvider, GAS_AMOUNT_BNB } from './config';

let currentRpcIndex = 0;
let provider = createBscProvider(BSC_RPC_ENDPOINTS[0]);
let isScanning = false;

export interface LiveScanLogEntry {
  timestamp: string;
  chainHead: number;
  safeBlock: number;
  fromBlock: number;
  toBlock: number;
  scannedBlocks: number;
  depositsFound: number;
  walletsMonitored: number;
  rpcEndpoint: string;
  message: string;
}

let latestChainHead = 0;
let latestSafeBlock = 0;
let latestScannedBlock = 0;
const recentScanLogs: LiveScanLogEntry[] = [];

function recordLiveScanLog(entry: LiveScanLogEntry) {
  recentScanLogs.unshift(entry);
  if (recentScanLogs.length > 40) {
    recentScanLogs.pop();
  }
  console.log(entry.message);
}

export function getScannerLiveState() {
  return {
    isScanning,
    latestChainHead,
    latestSafeBlock,
    latestScannedBlock,
    blocksBehind: Math.max(0, latestSafeBlock - latestScannedBlock),
    currentRpc: BSC_RPC_ENDPOINTS[currentRpcIndex],
    recentLogs: recentScanLogs.slice(0, 20),
  };
}

function rotateProvider(): ethers.JsonRpcProvider {
  currentRpcIndex = (currentRpcIndex + 1) % BSC_RPC_ENDPOINTS.length;
  provider = createBscProvider(BSC_RPC_ENDPOINTS[currentRpcIndex]);
  return provider;
}

const TRANSFER_TOPIC = ethers.id('Transfer(address,address,uint256)');

// BSC USDT uses 18 decimals
const USDT_DECIMALS = 18;

// Max addresses per query (RPC providers usually limit this)
const BATCH_SIZE = 50;

// Max blocks per 15s scan cycle (never skips blocks; catches up sequentially across cycles)
const MAX_BLOCKS_PER_CYCLE = 120;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getLatestBlockWithFallback(): Promise<number> {
  let lastErr: any;
  for (let attempt = 0; attempt < BSC_RPC_ENDPOINTS.length; attempt++) {
    try {
      return await provider.getBlockNumber();
    } catch (err: any) {
      lastErr = err;
      rotateProvider();
      await sleep(200 * (attempt + 1));
    }
  }
  throw lastErr;
}

async function getLogsWithFallback(filter: ethers.Filter): Promise<ethers.Log[]> {
  let lastErr: any;
  for (let attempt = 0; attempt < BSC_RPC_ENDPOINTS.length; attempt++) {
    try {
      return await provider.getLogs(filter);
    } catch (err: any) {
      lastErr = err;
      rotateProvider();
      await sleep(250 * (attempt + 1));
    }
  }
  throw lastErr;
}

export async function scan(): Promise<{
  scannedBlocks: number;
  lastBlock: number;
  depositsFound: number;
}> {
  if (isScanning) {
    return { scannedBlocks: 0, lastBlock: latestScannedBlock, depositsFound: 0 };
  }
  isScanning = true;
  let depositsFound = 0;

  try {
    // Get all assigned user HD wallets
    const wallets = await getAllAssignedWallets();

    if (!wallets || wallets.length === 0) {
      return { scannedBlocks: 0, lastBlock: 0, depositsFound: 0 };
    }

    // Create a map for quick lookup
    const walletMap = new Map(wallets.map((w) => [w.address.toLowerCase(), w]));

    const latest = await getLatestBlockWithFallback();
    // Use 15 confirmations for safety on BSC (~45s) to prevent chain reorgs or edge RPC nodes reporting block out-of-range
    const safe = latest - 15;

    latestChainHead = latest;
    latestSafeBlock = safe;

    const tracker = await getBlockTracker('bsc');
    // If tracker exists in DB, strictly resume from tracker.lastBlock so ZERO blocks are ever skipped!
    const last = tracker && tracker.lastBlock > 0 ? tracker.lastBlock : safe - 30;
    latestScannedBlock = last;

    if (last >= safe) {
      recordLiveScanLog({
        timestamp: new Date().toISOString(),
        chainHead: latest,
        safeBlock: safe,
        fromBlock: last,
        toBlock: safe,
        scannedBlocks: 0,
        depositsFound: 0,
        walletsMonitored: wallets.length,
        rpcEndpoint: BSC_RPC_ENDPOINTS[currentRpcIndex],
        message: `[BSC Live Scanner] Up-to-date at Block #${last} (Latest Chain Head: #${latest} | Safe Block: #${safe}) | Monitoring ${wallets.length} HD Wallets`,
      });
      return { scannedBlocks: 0, lastBlock: last, depositsFound: 0 };
    }

    // Never advance `last` forward! Instead cap `targetTo` so we scan sequentially without ever missing a block.
    const targetTo = Math.min(safe, last + MAX_BLOCKS_PER_CYCLE);
    const backlogBlocks = safe - targetTo;

    console.log(
      `[BSC Live Scanner] Chain Head: #${latest} | Safe Block: #${safe} | Last Tracked: #${last} | Scanning Blocks #${last + 1} -> #${targetTo} (${targetTo - last} blocks${backlogBlocks > 0 ? `, ${backlogBlocks} queued next` : ''}) | Wallets: ${wallets.length}`
    );

    const addresses = wallets.map((w) => w.address.toLowerCase());
    const CHUNK_SIZE = 10;
    let scannedUpTo = last;

    // Outer loop over contiguous block chunks [from, to]; inner loop over wallet batches.
    // This guarantees we only advance `block_tracker` to `to` when ALL wallet batches for [from, to] succeed.
    for (let from = last + 1; from <= targetTo; from += CHUNK_SIZE) {
      const to = Math.min(from + CHUNK_SIZE - 1, targetTo);
      let chunkSucceededForAllBatches = true;
      let chunkEventsCount = 0;

      for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
        const batch = addresses.slice(i, i + BATCH_SIZE);
        const paddedAddresses = batch.map((addr) => ethers.zeroPadValue(addr, 32));

        try {
          const logs = await getLogsWithFallback({
            address: CONFIG.usdt,
            fromBlock: from,
            toBlock: to,
            topics: [
              TRANSFER_TOPIC,
              null, // from address - any
              paddedAddresses, // to address - our user BEP-20 addresses
            ],
          });

          chunkEventsCount += logs.length;

          for (const log of logs) {
            const processed = await processLog(log, walletMap);
            if (processed) depositsFound++;
          }
        } catch (e: any) {
          chunkSucceededForAllBatches = false;
          console.warn(
            `[BSC Live Scanner] RPC error on block chunk #${from}-#${to} (will retry exact block #${from} on next cycle):`,
            e.shortMessage || e.message || e
          );
          break;
        }
      }

      if (!chunkSucceededForAllBatches) {
        // Stop immediately so we do not advance past the failed chunk; next cycle will resume from `scannedUpTo + 1`
        break;
      }

      scannedUpTo = to;
      latestScannedBlock = scannedUpTo;
      // Checkpoint after each verified contiguous chunk so even a server restart never re-scans or skips blocks
      await upsertBlockTracker('bsc', scannedUpTo);

      recordLiveScanLog({
        timestamp: new Date().toISOString(),
        chainHead: latest,
        safeBlock: safe,
        fromBlock: from,
        toBlock: to,
        scannedBlocks: to - from + 1,
        depositsFound,
        walletsMonitored: wallets.length,
        rpcEndpoint: BSC_RPC_ENDPOINTS[currentRpcIndex],
        message: `[BSC Live Scanner] Scanned Blocks #${from} -> #${to} (Latest Head: #${latest} | Safe: #${safe}) | Matched Logs: ${chunkEventsCount} | Deposits Credited: ${depositsFound}`,
      });

      if (to < targetTo) {
        await sleep(100);
      }
    }

    return { scannedBlocks: scannedUpTo - last, lastBlock: scannedUpTo, depositsFound };
  } catch (e: any) {
    console.error('[BSC Live Scanner] Error:', e.message || e);
    return { scannedBlocks: 0, lastBlock: latestScannedBlock, depositsFound };
  } finally {
    isScanning = false;
  }
}

async function processLog(
  log: ethers.Log,
  walletMap: Map<string, { address: string; userId: string; derivationIndex: number }>
): Promise<boolean> {
  const txHash = log.transactionHash;
  const logIndex = log.index;

  if (!log.topics[2]) return false;

  // Extract recipient address from topics
  const to = ('0x' + log.topics[2].slice(26)).toLowerCase();

  // Get wallet from our map (we already filtered at RPC level)
  const wallet = walletMap.get(to);
  if (!wallet || !wallet.userId) return false;

  // Parse amount (BSC USDT has 18 decimals)
  const amount = Number(ethers.formatUnits(log.data, USDT_DECIMALS));
  if (amount <= 0) return false;

  // Check if already processed in transactions table
  const exists = await findTransactionByHashAndLog(txHash, logIndex);
  if (exists) {
    // Ensure a sweep task exists even if a previous crash happened right after transaction creation
    const existingSweep = await findSweepTaskByTxHash(txHash);
    if (!existingSweep) {
      await createSweepTaskRecord({
        userId: wallet.userId,
        address: to,
        walletAddress: to,
        amount,
        derivationIndex: wallet.derivationIndex,
        txHash,
        status: 'pending',
      });
      console.log(`[BSC Live Scanner] Recovered missing sweep task for existing deposit tx ${txHash}`);
    }
    return false;
  }

  console.log(`[BSC Live Scanner] Deposit detected at Block #${log.blockNumber}: ${amount} USDT -> ${to} (User: ${wallet.userId}, TX: ${txHash})`);

  try {
    // 1. Save completed deposit transaction
    const depositTx = await createTransactionRecord({
      userId: wallet.userId,
      type: 'deposit',
      amount,
      status: 'completed',
      txHash,
      logIndex,
      description: `Deposit of ${amount} USDT (BEP-20)`,
    });

    // 2. Credit user balance in Render PostgreSQL
    await incrementBalance(wallet.userId, amount);

    // 3. Process 3-tier referral commissions (10% / 5% / 2%)
    try {
      await processReferralCommissions(wallet.userId, depositTx.id, amount);
    } catch (refErr: any) {
      console.error('[BSC Live Scanner] Referral commission calculation error:', refErr?.message || refErr);
    }

    // 4. Create sweep task (status: 'pending') so GasService sends 0.0001 BNB gas and SweepExecutor sweeps USDT to Hot Wallet
    await createSweepTaskRecord({
      userId: wallet.userId,
      address: to,
      walletAddress: to,
      amount,
      derivationIndex: wallet.derivationIndex,
      txHash,
      status: 'pending',
    });

    console.log(`[BSC Live Scanner] Deposit credited & sweep task queued (${GAS_AMOUNT_BNB} BNB gas): ${amount} USDT for user ${wallet.userId}`);
    return true;
  } catch (e: any) {
    console.error('[BSC Live Scanner] Failed to process log:', e.message || e);
    return false;
  }
}
