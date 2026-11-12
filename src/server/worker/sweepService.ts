import { ethers, HDNodeWallet } from 'ethers';
import { CONFIG, BSC_RPC_ENDPOINTS, createBscProvider } from './config';
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

  console.log(`[SweepService] Sweeping ${task.amount} USDT from derivation index ${task.derivationIndex} (${task.walletAddress})`);

  let lastErr: any;
  for (let attempt = 0; attempt < BSC_RPC_ENDPOINTS.length; attempt++) {
    const rpcUrl = BSC_RPC_ENDPOINTS[attempt % BSC_RPC_ENDPOINTS.length];
    try {
      const provider = createBscProvider(rpcUrl);

      // Derive child wallet from mnemonic using ethers v6 BIP44 path (exact cryptofd implementation)
      const derivedWallet = HDNodeWallet.fromPhrase(
        CONFIG.mnemonic,
        undefined, // no password
        `m/44'/60'/0'/0/${task.derivationIndex}`
      );
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

      // Sweep entire balance to hot wallet
      const amountToSweep = balance;

      console.log(
        `[SweepService] Transferring ${ethers.formatUnits(amountToSweep, USDT_DECIMALS)} USDT to hot wallet ${CONFIG.hotAddress}`
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
      // Don't retry across other RPCs if balance is already < 0.01 USDT
      if (String(err?.message || '').includes('Insufficient on-chain USDT balance')) {
        throw err;
      }
      console.warn(`[SweepService] RPC attempt ${attempt + 1} failed (${rpcUrl}):`, err?.message || err);
    }
  }

  throw lastErr;
}
