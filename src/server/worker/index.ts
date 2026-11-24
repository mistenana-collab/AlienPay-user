import cron from 'node-cron';
import { scan, getScannerLiveState } from './scanner';
import { sendGas } from './gasService';
import { executeSweeps } from './sweepExecutor';
import { CONFIG, GAS_AMOUNT_BNB, getHotWalletSponsorAddress } from './config';

let workerStarted = false;
let lastScanAt: string | null = null;
let lastGasAt: string | null = null;
let lastSweepAt: string | null = null;

export function startBackgroundWorker(): void {
  if (workerStarted) return;
  workerStarted = true;

  const sponsorInfo = getHotWalletSponsorAddress();

  console.log('====================================================');
  console.log('  AlienPay / CryptoFD Background Worker');
  console.log(`  BEP-20 USDT Deposit Scanner, ${GAS_AMOUNT_BNB} BNB Gas & Hot Wallet Sweep`);
  console.log(`  Hot Wallet (Sweep Destination): ${CONFIG.hotAddress || 'NOT SET'}`);
  console.log(
    `  Gas Sponsor Wallet (Hot Wallet ONLY): ${sponsorInfo.address || `NOT CONFIGURED (${sponsorInfo.error})`}`
  );
  console.log('  HD Wallet (m/44\'/60\'/0\'/0/index): User Deposit Addresses ONLY (never gas sponsor)');
  console.log('====================================================');

  // Run an initial scan 3 seconds after server boot so Render logs show live block scanning immediately
  setTimeout(async () => {
    try {
      lastScanAt = new Date().toISOString();
      await scan();
    } catch (err) {
      console.error('[Worker Boot Scan] Error:', err);
    }
  }, 3000);

  // 1. Scan BSC for BEP-20 USDT deposits every 15 seconds
  cron.schedule('*/15 * * * * *', async () => {
    try {
      lastScanAt = new Date().toISOString();
      await scan();
    } catch (err) {
      console.error('[CRON] Deposit scanner error:', err);
    }
  });

  // 2. Ensure 0.0001 BNB gas from Hot Wallet for pending (and auto-recovered) sweep tasks every 30 seconds
  cron.schedule('*/30 * * * * *', async () => {
    try {
      lastGasAt = new Date().toISOString();
      await sendGas();
    } catch (err) {
      console.error('[CRON] Gas service error:', err);
    }
  });

  // 3. Execute USDT sweeps from derived user wallets to Hot Wallet every 45 seconds
  cron.schedule('*/45 * * * * *', async () => {
    try {
      lastSweepAt = new Date().toISOString();
      await executeSweeps();
    } catch (err) {
      console.error('[CRON] Sweep executor error:', err);
    }
  });

  console.log('[Worker] Cron jobs scheduled:');
  console.log('  - Deposit scanner (BSC BEP-20 live block logs): every 15 seconds');
  console.log(`  - Gas service (Hot Wallet -> ${GAS_AMOUNT_BNB} BNB constant + auto sweep retry): every 30 seconds`);
  console.log('  - Sweep executor (to Hot Wallet): every 45 seconds');
}

export function getWorkerStatus() {
  const sponsorInfo = getHotWalletSponsorAddress();
  return {
    running: workerStarted,
    rpcUrl: CONFIG.rpc,
    usdtContract: CONFIG.usdt,
    hotWalletConfigured: Boolean(CONFIG.hotAddress),
    hotWalletAddress: CONFIG.hotAddress || null,
    hotWalletKeyConfigured: Boolean(CONFIG.hotKey),
    gasSponsorMode: 'hot_wallet' as const,
    gasSponsorWalletAddress: sponsorInfo.address,
    gasSponsorReady: Boolean(sponsorInfo.address),
    gasSponsorError: sponsorInfo.error,
    gasAmountBnb: GAS_AMOUNT_BNB,
    withdrawalMode: 'manual_admin_panel',
    lastScanAt,
    lastGasAt,
    lastSweepAt,
    liveScanner: getScannerLiveState(),
  };
}
