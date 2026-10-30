import { ethers, HDNodeWallet } from 'ethers';
import { getSweepTasksByStatus, getRetryableSweepTasks, updateSweepTaskRecord } from '../db';
import { CONFIG, GAS_AMOUNT_BNB, BSC_RPC_ENDPOINTS, createBscProvider } from './config';

// Constant amount of BNB sent for gas (0.0001 BNB, enough for 1 BEP-20 USDT transfer on BSC)
const GAS_AMOUNT = GAS_AMOUNT_BNB;
const USDT_DECIMALS = 18;
const USDT_ABI = ['function balanceOf(address account) view returns (uint256)'];

let gasRpcIndex = 0;
function getWorkingProvider(): ethers.JsonRpcProvider {
  const url = BSC_RPC_ENDPOINTS[gasRpcIndex % BSC_RPC_ENDPOINTS.length];
  return createBscProvider(url);
}
function rotateGasProvider(): ethers.JsonRpcProvider {
  gasRpcIndex = (gasRpcIndex + 1) % BSC_RPC_ENDPOINTS.length;
  return getWorkingProvider();
}

export async function sendGas(): Promise<{ processed: number; gasSent: number }> {
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
          rotateGasProvider();
        }
      }
    } catch {}

    // Get pending sweep tasks that need gas
    const tasks = await getSweepTasksByStatus('pending', 5);

    if (!tasks || tasks.length === 0) {
      return { processed: 0, gasSent: 0 };
    }

    console.log(`[GasService] Processing ${tasks.length} pending sweep tasks (gas constant: ${GAS_AMOUNT} BNB)`);

    const gasNeeded = ethers.parseEther(GAS_AMOUNT);

    // Support both HOT_WALLET_PRIVATE_KEY (cryptofd exact) and HD Master Gas Wallet (index 0) fallback
    let gasSponsorWallet: ethers.Wallet | ethers.HDNodeWallet;
    if (CONFIG.hotKey) {
      try {
        gasSponsorWallet = new ethers.Wallet(CONFIG.hotKey, provider);
      } catch (err) {
        console.warn('[GasService] Invalid HOT_WALLET_PRIVATE_KEY, falling back to HD Master index 0:', err);
        const masterDerived = HDNodeWallet.fromPhrase(
          CONFIG.mnemonic,
          undefined,
          `m/44'/60'/0'/0/0`
        );
        gasSponsorWallet = masterDerived.connect(provider);
      }
    } else {
      const masterDerived = HDNodeWallet.fromPhrase(
        CONFIG.mnemonic,
        undefined,
        `m/44'/60'/0'/0/0`
      );
      gasSponsorWallet = masterDerived.connect(provider);
    }

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

        // 2. If the deposit wallet is not the gas sponsor itself, send 0.0001 BNB gas
        if (gasSponsorWallet.address.toLowerCase() === task.walletAddress.toLowerCase()) {
          console.warn(
            `[GasService] Deposit wallet ${task.walletAddress} (index 0) needs ${GAS_AMOUNT} BNB gas to sweep USDT to Hot Wallet (${CONFIG.hotAddress}). Current balance: ${ethers.formatEther(userBalance)} BNB.`
          );
          continue;
        }

        const sponsorBalance = await provider.getBalance(gasSponsorWallet.address);
        if (sponsorBalance < gasNeeded) {
          console.warn(
            `[GasService] Insufficient BNB in gas sponsor wallet (${gasSponsorWallet.address}) to send ${GAS_AMOUNT} BNB to ${task.walletAddress}. Have: ${ethers.formatEther(sponsorBalance)} BNB.`
          );
          continue;
        }

        console.log(`[GasService] Sending ${GAS_AMOUNT} BNB gas from ${gasSponsorWallet.address} to ${task.walletAddress}`);

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
          console.log(`[GasService] ${GAS_AMOUNT} BNB gas sent successfully to ${task.walletAddress} (${tx.hash})`);
        } else {
          throw new Error('Gas transaction failed');
        }
      } catch (e: any) {
        rotateGasProvider();
        console.error(`[GasService] Failed to send gas to ${task.walletAddress} (will retry next cycle):`, e.message);
      }
    }

    return { processed: tasks.length, gasSent: gasSentCount };
  } catch (e: any) {
    rotateGasProvider();
    console.error('[GasService] Fatal error:', e.message || e);
    return { processed: 0, gasSent: gasSentCount };
  }
}
