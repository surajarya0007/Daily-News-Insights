import cron from 'node-cron';
import { runIngestionPipeline } from '../controllers/ingestionController';
import { pruneOldArticleChunks } from '../services/ragService';

/**
 * Initializes the node-cron scheduler.
 * Registers a task that runs every 15 minutes to pull new articles,
 * and a daily task at 3:00 AM to prune chunks older than 7 days.
 */
export function initScheduler() {
  console.log('[Scheduler] Initializing news ingestion task...');

  // '*/15 * * * *' executes every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('[Scheduler] Cron event triggered: Running ingestion pipeline...');
    try {
      const stats = await runIngestionPipeline();
      console.log(`[Scheduler] Cron event execution complete. Ingested: ${stats.ingestedCount}, Skipped: ${stats.skippedCount}`);
    } catch (error) {
      console.error('[Scheduler] Cron event failed to execute successfully:', error);
    }
  });

  // '0 3 * * *' executes every day at 3:00 AM
  cron.schedule('0 3 * * *', async () => {
    console.log('[Scheduler] Daily cron event triggered: Pruning old article chunks...');
    try {
      const prunedCount = await pruneOldArticleChunks(7);
      console.log(`[Scheduler] Successfully pruned ${prunedCount} old article chunks.`);
    } catch (error) {
      console.error('[Scheduler] Failed to prune old article chunks:', error);
    }
  });

  console.log('[Scheduler] Cron tasks registered successfully.');
}

