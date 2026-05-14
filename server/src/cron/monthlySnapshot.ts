import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { captureSnapshot } from '../services/networth';

/**
 * Capture monthly net worth snapshots for all users.
 * Called by cron on the 1st of each month.
 */
async function captureSnapshotsForAllUsers(): Promise<void> {
  console.log('[monthlySnapshot] Starting monthly snapshot capture...', new Date().toISOString());

  let succeeded = 0;
  let failed = 0;

  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true },
    });

    for (const user of users) {
      try {
        await captureSnapshot(user.id);
        succeeded++;
      } catch (err) {
        console.error(`[monthlySnapshot] Failed for user ${user.id}:`, err);
        failed++;
      }
    }

    console.log(`[monthlySnapshot] Done. Succeeded: ${succeeded}, Failed: ${failed}`);
  } catch (err) {
    console.error('[monthlySnapshot] Fatal error:', err);
  }
}

/**
 * Monthly cron job — runs at midnight on the 1st of every month.
 * Schedule: '0 0 1 * *'
 */
export function startMonthlySnapshotCron(): void {
  cron.schedule('0 0 1 * *', async () => {
    console.log('[monthlySnapshot] Monthly cron triggered at', new Date().toISOString());
    await captureSnapshotsForAllUsers();
  }, {
    timezone: 'America/Los_Angeles',
  });

  console.log('[monthlySnapshot] Monthly snapshot cron scheduled (1st of month, 00:00 PT)');
}
