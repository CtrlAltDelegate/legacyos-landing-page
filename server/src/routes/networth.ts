import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { calculateNetWorth, captureSnapshot } from '../services/networth';

const router = Router();
router.use(requireAuth);

// ─── GET /api/networth/current ────────────────────────────────────────────────
// Live calculated net worth — not from snapshots, computed fresh each time

router.get('/current', async (req: Request, res: Response) => {
  try {
    const result = await calculateNetWorth(req.user!.userId);
    res.json(result);
  } catch (err) {
    console.error('[networth/current]', err);
    res.status(500).json({ error: 'Failed to calculate net worth.' });
  }
});

// ─── GET /api/networth/snapshots ──────────────────────────────────────────────
// Historical monthly snapshots — used by the dashboard chart

router.get('/snapshots', async (req: Request, res: Response) => {
  try {
    const { limit = '24' } = req.query;

    const snapshots = await prisma.netWorthSnapshot.findMany({
      where: { userId: req.user!.userId },
      orderBy: { snapshotDate: 'asc' },
      take: Math.min(parseInt(String(limit), 10), 60), // cap at 60 months (5 years)
      select: {
        snapshotDate: true,
        netWorth: true,
        totalAssets: true,
        totalLiabilities: true,
        equityValue: true,
        realEstateValue: true,
        otherValue: true,
        restrictedValue: true,
      },
    });

    // Month-over-month change on the most recent snapshot
    let monthOverMonth: number | null = null;
    if (snapshots.length >= 2) {
      const latest = Number(snapshots[snapshots.length - 1].netWorth);
      const previous = Number(snapshots[snapshots.length - 2].netWorth);
      monthOverMonth = parseFloat((latest - previous).toFixed(2));
    }

    res.json({ snapshots, monthOverMonth });
  } catch (err) {
    console.error('[networth/snapshots]', err);
    res.status(500).json({ error: 'Failed to fetch snapshots.' });
  }
});

// ─── POST /api/networth/snapshot ──────────────────────────────────────────────
// Manually trigger a snapshot capture (also called by the monthly cron)

router.post('/snapshot', async (req: Request, res: Response) => {
  try {
    await captureSnapshot(req.user!.userId);
    res.json({ message: 'Snapshot captured successfully.' });
  } catch (err) {
    console.error('[networth/snapshot]', err);
    res.status(500).json({ error: 'Failed to capture snapshot.' });
  }
});

export default router;
