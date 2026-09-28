import { runIngestionPipeline } from '../controllers/ingestionController';
import prisma from '../config/db';
import redis from '../config/redis';

async function main() {
  console.log('[Ingestion Job] Starting scheduled ingestion pipeline...');
  const start = Date.now();
  
  try {
    const stats = await runIngestionPipeline();
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[Ingestion Job] Pipeline execution complete in ${duration}s.`);
    console.log(`[Ingestion Job] Stats - Ingested: ${stats.ingestedCount}, Skipped: ${stats.skippedCount}, Errors: ${stats.errorsCount}`);
    process.exit(0);
  } catch (error) {
    console.error('[Ingestion Job] Fatal error during pipeline execution:', error);
    process.exit(1);
  } finally {
    // Ensure all connections are closed
    try {
      await prisma.$disconnect();
      if (redis) {
        await redis.quit();
      }
    } catch (cleanupError) {
      console.error('[Ingestion Job] Cleanup error:', cleanupError);
    }
  }
}

main();
