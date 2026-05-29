import { runWeeklyDigest } from './weeklyDigest';

/**
 * Runs the weekly digest every Monday at 8 AM UTC.
 * Uses a simple setInterval-based scheduler (compatible with Railway's
 * always-on deployment model — no external cron service needed).
 */
export function startWeeklyDigestCron(): void {
  // Run once at startup if it's Monday and past 8 AM UTC (handles restarts)
  scheduleNextRun();
  console.log('[weeklyDigest] Cron scheduled — fires every Monday at 08:00 UTC');
}

function msUntilNextMonday8am(): number {
  const now = new Date();
  const target = new Date(now);

  // Find next Monday
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysUntilMonday = dayOfWeek === 1 ? 7 : (8 - dayOfWeek) % 7 || 7;

  target.setUTCDate(now.getUTCDate() + daysUntilMonday);
  target.setUTCHours(8, 0, 0, 0);

  // If we're already past this Monday's 8am, schedule for NEXT Monday
  if (dayOfWeek === 1 && now.getUTCHours() >= 8) {
    target.setUTCDate(target.getUTCDate() + 7);
  }

  return target.getTime() - now.getTime();
}

function scheduleNextRun(): void {
  const ms = msUntilNextMonday8am();
  const hoursUntil = Math.round(ms / 1000 / 60 / 60);
  console.log(`[weeklyDigest] Next run in ~${hoursUntil}h`);

  setTimeout(async () => {
    try {
      await runWeeklyDigest();
    } catch (err) {
      console.error('[weeklyDigest] Cron run failed:', err);
    }
    // Schedule the following Monday
    scheduleNextRun();
  }, ms);
}
