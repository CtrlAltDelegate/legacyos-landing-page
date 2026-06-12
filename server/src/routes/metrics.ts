import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { requirePlan } from '../middleware/planGate';
import { METRIC_META } from '../services/metrics';

const router = Router();
router.use(requireAuth);
router.use(requirePlan('core'));

// ─── GET /api/metrics ─────────────────────────────────────────────────────────
// Returns all financial metric time-series for the user, grouped by metricType.
// Optional query params:
//   ?types=loan_balance,gross_income   — filter to specific types
//   ?months=24                         — limit to last N months (default: all)

router.get('/', async (req: Request, res: Response) => {
  try {
    const { types, months } = req.query as { types?: string; months?: string };

    const typeFilter = types ? types.split(',').map((t) => t.trim()) : undefined;
    const monthsBack = months ? parseInt(months, 10) : undefined;
    const since = monthsBack
      ? new Date(Date.now() - monthsBack * 30 * 24 * 60 * 60 * 1000)
      : undefined;

    const rows = await prisma.financialMetric.findMany({
      where: {
        userId: req.user!.userId,
        ...(typeFilter && { metricType: { in: typeFilter } }),
        ...(since && { recordedDate: { gte: since } }),
      },
      orderBy: [{ metricType: 'asc' }, { recordedDate: 'asc' }],
      select: {
        id: true,
        metricType: true,
        metricLabel: true,
        value: true,
        recordedDate: true,
        sourceDocumentId: true,
      },
    });

    // Group by metricType
    const grouped: Record<string, {
      meta: typeof METRIC_META[string] | null;
      series: { id: string; label: string; date: string; value: number; sourceDocumentId: string | null }[];
    }> = {};

    for (const row of rows) {
      if (!grouped[row.metricType]) {
        grouped[row.metricType] = {
          meta: METRIC_META[row.metricType] ?? null,
          series: [],
        };
      }
      grouped[row.metricType].series.push({
        id:               row.id,
        label:            row.metricLabel ?? row.metricType,
        date:             row.recordedDate.toISOString().slice(0, 10),
        value:            Number(row.value),
        sourceDocumentId: row.sourceDocumentId,
      });
    }

    // Summary: latest value per type
    const summary: Record<string, { latestValue: number; latestDate: string; label: string }> = {};
    for (const [type, { series }] of Object.entries(grouped)) {
      const last = series[series.length - 1];
      if (last) summary[type] = { latestValue: last.value, latestDate: last.date, label: last.label };
    }

    res.json({ grouped, summary, metricMeta: METRIC_META });
  } catch (err) {
    console.error('[metrics GET /]', err);
    res.status(500).json({ error: 'Failed to fetch metrics.' });
  }
});

// ─── GET /api/metrics/categories ─────────────────────────────────────────────
// Returns which metric categories the user has data for (used to render tabs).

router.get('/categories', async (req: Request, res: Response) => {
  try {
    const rows = await prisma.financialMetric.findMany({
      where:   { userId: req.user!.userId },
      select:  { metricType: true },
      distinct: ['metricType'],
    });

    const categories = [...new Set(
      rows.map((r) => METRIC_META[r.metricType]?.category ?? 'Other')
    )];

    res.json({ categories });
  } catch (err) {
    console.error('[metrics GET /categories]', err);
    res.status(500).json({ error: 'Failed to fetch metric categories.' });
  }
});

export default router;
