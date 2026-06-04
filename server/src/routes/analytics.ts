import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { requirePlan } from '../middleware/planGate';
import { prisma } from '../lib/prisma';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const YahooFinanceLib = require('yahoo-finance2').default;
const yahooFinance = new YahooFinanceLib({ suppressNotices: ['yahooSurvey'] });

const router = Router();
router.use(requireAuth);

// ─── GET /api/analytics/benchmark ─────────────────────────────────────────────
// Returns user net worth snapshots + SPY (S&P 500 proxy) monthly closes,
// both normalized to 100 at the first snapshot date.
// Premium plan required.

router.get('/benchmark', requirePlan('premium'), async (req: Request, res: Response) => {
  try {
    const { months = '24' } = req.query;
    const limit = Math.min(parseInt(String(months), 10), 60);

    const snapshots = await prisma.netWorthSnapshot.findMany({
      where: { userId: req.user!.userId },
      orderBy: { snapshotDate: 'asc' },
      take: limit,
      select: { snapshotDate: true, netWorth: true },
    });

    if (snapshots.length < 2) {
      res.json({ data: [], hasData: false });
      return;
    }

    // Fetch SPY monthly bars starting one month before first snapshot
    const startDate = new Date(snapshots[0].snapshotDate);
    startDate.setMonth(startDate.getMonth() - 1);

    type SpyBar = { date: Date; adjClose?: number; close: number };
    let spyBars: SpyBar[] = [];
    try {
      spyBars = await yahooFinance.historical(
        'SPY',
        { period1: startDate, period2: new Date(), interval: '1mo' },
        { validateResult: false }
      );
    } catch (e) {
      console.warn('[analytics/benchmark] SPY historical fetch failed:', e);
    }

    // Build SPY price lookup keyed by "YYYY-MM"
    const spyByMonth = new Map<string, number>();
    for (const bar of spyBars) {
      const d = new Date(bar.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      spyByMonth.set(key, bar.adjClose ?? bar.close);
    }

    // Pair each snapshot with the nearest SPY price (exact month or ±2 months)
    type Row = { label: string; portfolio: number; spy: number | null };
    const rows: Row[] = snapshots.map((snap) => {
      const d = new Date(snap.snapshotDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      let spy = spyByMonth.get(key) ?? null;
      if (!spy) {
        // Look up to 2 prior months for alignment slack
        for (let delta = 1; delta <= 2; delta++) {
          const prev = new Date(d);
          prev.setMonth(prev.getMonth() - delta);
          const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
          spy = spyByMonth.get(prevKey) ?? null;
          if (spy) break;
        }
      }

      return { label, portfolio: Number(snap.netWorth), spy };
    });

    // Keep only rows where both values are present and portfolio > 0
    const valid = rows.filter((r) => r.spy !== null && r.portfolio > 0);
    if (valid.length < 2) {
      res.json({ data: [], hasData: false });
      return;
    }

    // Normalize both to 100 at the first valid point
    const basePortfolio = valid[0].portfolio;
    const baseSpy = valid[0].spy!;

    const data = valid.map((r) => ({
      label: r.label,
      portfolio: parseFloat(((r.portfolio / basePortfolio) * 100).toFixed(2)),
      spy: parseFloat(((r.spy! / baseSpy) * 100).toFixed(2)),
    }));

    res.json({ data, hasData: true });
  } catch (err) {
    console.error('[analytics/benchmark]', err);
    res.status(500).json({ error: 'Failed to fetch benchmark data.' });
  }
});

export default router;
