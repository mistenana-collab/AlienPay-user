import { ethers } from 'ethers';
import { getSweepTasksByStatus, getRetryableSweepTasks, updateSweepTaskRecord } from '../db';
import {
  CONFIG,
  GAS_AMOUNT_BNB,
  getBscRpcEndpoints,
  createBscProvider,
} from './config';

// Constant amount of BNB sent for gas (0.0001 BNB, enough for 1 BEP-20 USDT transfer on BSC)
const GAS_AMOUNT = GAS_AMOUNT_BNB;
const USDT_DECIMALS = 18;
const USDT_ABI = ['function balanceOf(address account) view returns (uint256)'];

let gasRpcIndex = 0;
let isSendingGas = false;

function getWorkingProvider(): ethers.JsonRpcProvider {
  const endpoints = getBscRpcEndpoints();
  const url = endpoints[gasRpcIndex % endpoints.length];
  return createBscProvider(url);
}

function rotateGasProvider(): ethers.JsonRpcProvider {
  const endpoints = getBscRpcEndpoints();
  gasRpcIndex = (gasRpcIndex + 1) % endpoints.length;
  return getWorkingProvider();
}

export async function sendGas(): Promise<{
  processed: number;
  gasSent: number;
  sponsorAddress?: string | null;
  error?: string;
}> {
  if (isSendingGas) {
    return { processed: 0, gasSent: 0 };
  }
  isSendingGas = true;
  let gasSentCount = 0;

  try {
    let provider = getWorkingProvider();

    // 0. Auto-recover any failed or stuck ('sweeping' > 5m) tasks so no user deposit sweep is ever missed
    try {
      const retryable = await getRetryableSweepTasks(5);
      for (const rTask of retryable) {
        try {
          const usdtContract = new ethers.Contract(CONFIG.usdt, USDT_ABI, provider);
          const rawUsdt = await usdtContract.balanceOf(rTask.walletAddress);
          const usdtBal = Number(ethers.formatUnits(rawUsdt, USDT_DECIMALS));
          if (usdtBal >= 0.01) {
            console.log(
              `[GasService] Auto-recovering sweep task ${rTask.id} for wallet ${rTask.walletAddress} (On-chain balance: ${usdtBal} USDT)`
            );
            await updateSweepTaskRecord(rTask.id, {
              status: 'pending',
              errorMessage: null,
            });
          } else {
            // Balance already swept on-chain
            await updateSweepTaskRecord(rTask.id, {
              status: 'completed',
              errorMessage: null,
            });
          }
        } catch {
          provider = rotateGasProvider();
        }
      }
    } catch {}

    // Get pending sweep tasks that need gas
    const tasks = await getSweepTasksByStatus('pending', 5);

    if (!tasks || tasks.length === 0) {
      return { processed: 0, gasSent: 0 };
    }

    // Strictly use ONLY the Hot Wallet (HOT_WALLET_PRIVATE_KEY) as the Gas Sponsor Wallet.
    // HD Wallet (m/44'/60'/0'/0/index) is reserved exclusively for User Deposit Addresses and is NEVER used as Gas Sponsor.
    if (!CONFIG.hotKey) {
      const msg =
        'HOT_WALLET_PRIVATE_KEY is not configured. Hot Wallet is required as the Gas Sponsor Wallet.';
      console.warn(`[GasService] ${msg}`);
      for (const task of tasks) {
        await updateSweepTaskRecord(task.id, { errorMessage: msg }).catch(() => {});
      }
      return { processed: tasks.length, gasSent: 0, sponsorAddress: null, error: msg };
    }

    let gasSponsorWallet: ethers.Wallet;
    try {
      gasSponsorWallet = new ethers.Wallet(CONFIG.hotKey, provider);
    } catch (err: any) {
      const msg = `Invalid HOT_WALLET_PRIVATE_KEY (${err?.message || 'malformed key'}). Hot Wallet must be valid to act as Gas Sponsor Wallet.`;
      console.error(`[GasService] ${msg}`);
      for (const task of tasks) {
        await updateSweepTaskRecord(task.id, { errorMessage: msg }).catch(() => {});
      }
      return { processed: tasks.length, gasSent: 0, sponsorAddress: null, error: msg };
    }

    if (
      CONFIG.hotAddress &&
      CONFIG.hotAddress.toLowerCase() !== gasSponsorWallet.address.toLowerCase()
    ) {
      console.log(
        `[GasService] Gas Sponsor Hot Wallet: ${gasSponsorWallet.address} | Sweep Destination Hot Wallet: ${CONFIG.hotAddress}`
      );
    }

    console.log(
      `[GasService] Processing ${tasks.length} pending sweep tasks | Gas Sponsor (Hot Wallet): ${gasSponsorWallet.address} | Constant: ${GAS_AMOUNT} BNB`
    );

    const gasNeeded = ethers.parseEther(GAS_AMOUNT);
    // 21,000 gas * ~1.5 gwei safety buffer so sending GAS_AMOUNT doesn't fail due to tx fee overhead
    const txFeeBuffer = ethers.parseEther('0.000035');

    for (const task of tasks) {
      try {
        // 1. Check if the user's derived deposit wallet already has at least 0.0001 BNB gas
        const userBalance = await provider.getBalance(task.walletAddress);

        if (userBalance >= gasNeeded) {
          console.log(
            `[GasService] Wallet ${task.walletAddress} already has ${ethers.formatEther(userBalance)} BNB (>= ${GAS_AMOUNT} BNB), marking as gas_sent`
          );
          await updateSweepTaskRecord(task.id, { status: 'gas_sent', errorMessage: null });
          gasSentCount++;
          continue;
        }

        // 2. Prevent self-sponsorship if deposit address matches Hot Wallet
        if (gasSponsorWallet.address.toLowerCase() === task.walletAddress.toLowerCase()) {
          const selfMsg = `Deposit wallet ${task.walletAddress} is identical to Hot Wallet Gas Sponsor and needs at least ${GAS_AMOUNT} BNB.`;
          console.warn(`[GasService] ${selfMsg}`);
          await updateSweepTaskRecord(task.id, { errorMessage: selfMsg }).catch(() => {});
          continue;
        }

        const sponsorBalance = await provider.getBalance(gasSponsorWallet.address);
        if (sponsorBalance < gasNeeded + txFeeBuffer) {
          const lowBalMsg = `Insufficient BNB in Hot Wallet Gas Sponsor (${gasSponsorWallet.address}). Need ~${ethers.formatEther(gasNeeded + txFeeBuffer)} BNB, have ${ethers.formatEther(sponsorBalance)} BNB.`;
          console.warn(`[GasService] ${lowBalMsg}`);
          await updateSweepTaskRecord(task.id, { errorMessage: lowBalMsg }).catch(() => {});
          continue;
        }

        console.log(
          `[GasService] Sending ${GAS_AMOUNT} BNB gas from Hot Wallet (${gasSponsorWallet.address}) -> ${task.walletAddress}`
        );

        const tx = await gasSponsorWallet.sendTransaction({
          to: task.walletAddress,
          value: gasNeeded,
        });

        console.log(`[GasService] Gas TX sent: ${tx.hash}`);

        // Wait for 1 confirmation
        const receipt = await tx.wait(1);

        if (receipt && receipt.status === 1) {
          await updateSweepTaskRecord(task.id, {
            status: 'gas_sent',
            gasTxHash: tx.hash,
            errorMessage: null,
          });
          gasSentCount++;
          console.log(
            `[GasService] ${GAS_AMOUNT} BNB gas sent successfully from Hot Wallet to ${task.walletAddress} (${tx.hash})`
          );
        } else {
          throw new Error('Gas transaction reverted on-chain');
        }
      } catch (e: any) {
        provider = rotateGasProvider();
        gasSponsorWallet = gasSponsorWallet.connect(provider);
        const errMsg = e?.shortMessage || e?.message || 'Failed to send BNB gas';
        console.error(
          `[GasService] Failed to send gas to ${task.walletAddress} (will retry next cycle):`,
          errMsg
        );
        await updateSweepTaskRecord(task.id, { errorMessage: errMsg }).catch(() => {});
      }
    }

    return {
      processed: tasks.length,
      gasSent: gasSentCount,
      sponsorAddress: gasSponsorWallet.address.toLowerCase(),
    };
  } catch (e: any) {
    rotateGasProvider();
    console.error('[GasService] Fatal error:', e.message || e);
    return { processed: 0, gasSent: gasSentCount, error: e?.message || 'Gas service error' };
  } finally {
    isSendingGas = false;
  }
}
