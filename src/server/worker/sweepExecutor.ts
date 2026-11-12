import { getSweepTasksByStatus, updateSweepTaskRecord } from '../db';
import { sweep } from './sweepService';
import { CONFIG } from './config';

export async function executeSweeps(): Promise<{ processed: number; swept: number }> {
  let sweptCount = 0;
  try {
    // Get tasks that have gas_sent and are ready to sweep to hot wallet
    const tasks = await getSweepTasksByStatus('gas_sent', 5);

    if (!tasks || tasks.length === 0) {
      return { processed: 0, swept: 0 };
    }

    if (!CONFIG.hotAddress) {
      console.warn('[SweepExecutor] HOT_WALLET_ADDRESS not configured yet. Skipping live sweep execution.');
      return { processed: tasks.length, swept: 0 };
    }

    console.log(`[SweepExecutor] Processing ${tasks.length} sweep tasks`);

    for (const task of tasks) {
      try {
        // Mark as sweeping
        await updateSweepTaskRecord(task.id, { status: 'sweeping' });

        // Execute sweep from derived HD wallet to Hot Wallet
        const txHash = await sweep(task);

        // Mark as completed
        await updateSweepTaskRecord(task.id, {
          status: 'completed',
          sweepTxHash: txHash,
          errorMessage: null,
        });

        sweptCount++;
        console.log(`[SweepExecutor] Sweep completed for task ${task.id}: ${txHash}`);
      } catch (e: any) {
        console.error(`[SweepExecutor] Failed to sweep task ${task.id}:`, e.message);

        // Mark as failed
        await updateSweepTaskRecord(task.id, {
          status: 'failed',
          errorMessage: e.message || 'Unknown error',
        });
      }
    }

    return { processed: tasks.length, swept: sweptCount };
  } catch (e: any) {
    console.error('[SweepExecutor] Fatal error:', e.message || e);
    return { processed: 0, swept: sweptCount };
  }
}
