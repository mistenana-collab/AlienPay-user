import { ethers, HDNodeWallet } from 'ethers';
import { CONFIG, getBscRpcEndpoints, createBscProvider } from './config';
import type { DbSweepTask } from '../db';

// BSC USDT uses 18 decimals
const USDT_DECIMALS = 18;

const USDT_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
];

export async function sweep(task: DbSweepTask): Promise<string> {
  if (!CONFIG.hotAddress || !ethers.isAddress(CONFIG.hotAddress)) {
    throw new Error('HOT_WALLET_ADDRESS is not configured');
  }

  console.log(
    `[SweepService] Sweeping ${task.amount} USDT from derivation index ${task.derivationIndex} (${task.walletAddress})`
  );

  // Derive child wallet from mnemonic using ethers v6 BIP44 path
  const derivedWallet = HDNodeWallet.fromPhrase(
    CONFIG.mnemonic,
    undefined, // no password
    `m/44'/60'/0'/0/${task.derivationIndex}`
  );

  if (derivedWallet.address.toLowerCase() !== task.walletAddress.toLowerCase()) {
    throw new Error(
      `Mnemonic mismatch: derived m/44'/60'/0'/0/${task.derivationIndex} (${derivedWallet.address}) does not match task wallet (${task.walletAddress})`
    );
  }

  const endpoints = getBscRpcEndpoints();
  let lastErr: any;

  for (let attempt = 0; attempt < endpoints.length; attempt++) {
    const rpcUrl = endpoints[attempt % endpoints.length];
    try {
      const provider = createBscProvider(rpcUrl);
      const wallet = derivedWallet.connect(provider);

      console.log(`[SweepService] Derived wallet: ${wallet.address} (RPC: ${rpcUrl})`);

      // Create USDT contract instance connected to derived user wallet
      const contract = new ethers.Contract(CONFIG.usdt, USDT_ABI, wallet);

      // Check actual on-chain USDT balance
      const balance = await contract.balanceOf(wallet.address);
      const balanceFormatted = Number(ethers.formatUnits(balance, USDT_DECIMALS));

      console.log(`[SweepService] Wallet USDT balance: ${balanceFormatted}`);

      if (balanceFormatted < 0.01) {
        throw new Error(`Insufficient on-chain USDT balance: ${balanceFormatted}`);
      }

      // Verify BNB gas balance in derived wallet before attempting transfer
      const bnbBalance = await provider.getBalance(wallet.address);
      if (bnbBalance === 0n) {
        throw new Error(`Wallet ${wallet.address} has 0 BNB for gas (needs 0.0001 BNB from Hot Wallet)`);
      }

      // Sweep entire balance to hot wallet
      const amountToSweep = balance;

      console.log(
        `[SweepService] Transferring ${ethers.formatUnits(amountToSweep, USDT_DECIMALS)} USDT to hot wallet ${CONFIG.hotAddress} (Wallet BNB: ${ethers.formatEther(bnbBalance)} BNB)`
      );

      const tx = await contract.transfer(CONFIG.hotAddress, amountToSweep);

      console.log(`[SweepService] Sweep TX sent: ${tx.hash}`);

      // Wait for 1 confirmation
      const receipt = await tx.wait(1);

      if (!receipt || receipt.status !== 1) {
        throw new Error('Sweep transaction failed');
      }

      console.log(`[SweepService] Sweep confirmed to Hot Wallet (${CONFIG.hotAddress}): ${tx.hash}`);
      return tx.hash;
    } catch (err: any) {
      lastErr = err;
      const errMsg = String(err?.message || '');
      // Don't retry across other RPCs if balance is already < 0.01 USDT or 0 BNB
      if (
        errMsg.includes('Insufficient on-chain USDT balance') ||
        errMsg.includes('0 BNB for gas') ||
        errMsg.includes('Mnemonic mismatch')
      ) {
        throw err;
      }
      console.warn(`[SweepService] RPC attempt ${attempt + 1} failed (${rpcUrl}):`, errMsg || err);
    }
  }

  throw lastErr;
}
