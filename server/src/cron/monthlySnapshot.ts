import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { captureSnapshot } from '../services/networth';
import { sendNetWorthMilestone, sendMonthlySnapshot, type MonthlySnapshotData } from '../services/email';

const NW_MILESTONES = [100_000, 250_000, 500_000, 1_000_000];

/** Gather supplemental data needed for the monthly snapshot email. */
async function gatherSnapshotEmailData(userId: string): Promise<Omit<MonthlySnapshotData, 'netWorth' | 'momChange' | 'momPct' | 'yoyChange' | 'snapshotMonth'>> {
  const [goal, liabilities, wings, snapshots] = await Promise.all([
    prisma.goal.findFirst({ where: { userId } }),
    prisma.liability.findMany({ where: { userId, isActive: true }, select: { monthlyPayment: true } }),
    prisma.wingAssessment.findMany({ where: { userId } }),
    prisma.netWorthSnapshot.findMany({
      where: { userId },
      orderBy: { snapshotDate: 'desc' },
      take: 13,
      select: { netWorth: true, snapshotDate: true },
    }),
  ]);

  const wingConfig = await import('../config/wingSteps').then(m => m.WINGS);
  const LEVEL_LABELS = await import('../config/wingSteps').then(m => m.LEVEL_LABELS);

  const wingLevels = wings.map(w => {
    const cfg = wingConfig[w.wing as keyof typeof wingConfig];
    return {
      name: cfg?.name ?? w.wing,
      emoji: cfg?.emoji ?? '',
      level: w.level,
      levelLabel: LEVEL_LABELS[w.level] ?? LEVEL_LABELS[LEVEL_LABELS.length - 1],
    };
  });

  return {
    totalAssets: 0,  // filled by caller from snapshot
    totalLiabilities: 0,
    monthlyIncome: goal?.monthlyIncome != null ? Number(goal.monthlyIncome) : null,
    monthlyObligations: liabilities.reduce((s, l) => s + Number(l.monthlyPayment ?? 0), 0),
    accumulationBudget: goal?.monthlyCryptoBudget != null ? Number(goal.monthlyCryptoBudget) : null,
    financialMode: goal?.financialMode ?? null,
    wingLevels,
  };
}

/**
 * Capture monthly net worth snapshots for all users.
 * Also checks for net worth milestone crossings and sends emails.
 * Called by cron on the 1st of each month.
 */
async function captureSnapshotsForAllUsers(): Promise<void> {
  console.log('[monthlySnapshot] Starting monthly snapshot capture...', new Date().toISOString());

  let succeeded = 0;
  let failed = 0;

  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, fullName: true },
    });

    for (const user of users) {
      try {
        // Get previous snapshot for milestone detection
        const prevSnapshot = await prisma.netWorthSnapshot.findFirst({
          where: { userId: user.id },
          orderBy: { snapshotDate: 'desc' },
          select: { netWorth: true },
        });
        const prevNW = prevSnapshot ? Number(prevSnapshot.netWorth) : 0;

        const newNW = await captureSnapshot(user.id);
        succeeded++;

        // Check for milestone crossings
        for (const milestone of NW_MILESTONES) {
          if (prevNW < milestone && newNW >= milestone) {
            await sendNetWorthMilestone(user.email, user.fullName ?? '', milestone).catch((e) => {
              console.error(`[monthlySnapshot] Milestone email failed for ${user.id}:`, e);
            });
          }
        }

        // Send monthly snapshot email
        try {
          const now = new Date();
          const snapshotMonth = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          const supplemental = await gatherSnapshotEmailData(user.id);

          // Fetch the newly written snapshot for asset/liability totals
          const latestSnap = await prisma.netWorthSnapshot.findFirst({
            where: { userId: user.id },
            orderBy: { snapshotDate: 'desc' },
          });
          const prevSnap = await prisma.netWorthSnapshot.findMany({
            where: { userId: user.id },
            orderBy: { snapshotDate: 'desc' },
            skip: 1,
            take: 12,
          });

          const momChange = latestSnap && prevSnap[0]
            ? Number(latestSnap.netWorth) - Number(prevSnap[0].netWorth)
            : null;
          const momPct = momChange != null && prevSnap[0] && Number(prevSnap[0].netWorth) > 0
            ? (momChange / Number(prevSnap[0].netWorth)) * 100
            : null;
          const yoyChange = prevSnap.length >= 11
            ? Number(latestSnap?.netWorth ?? 0) - Number(prevSnap[prevSnap.length - 1].netWorth)
            : null;

          await sendMonthlySnapshot(user.email, user.fullName ?? '', {
            ...supplemental,
            netWorth: newNW,
            totalAssets: latestSnap ? Number(latestSnap.totalAssets) : 0,
            totalLiabilities: latestSnap ? Number(latestSnap.totalLiabilities) : 0,
            momChange,
            momPct,
            yoyChange,
            snapshotMonth,
          });
        } catch (e) {
          console.error(`[monthlySnapshot] Snapshot email failed for ${user.id}:`, e);
        }
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
