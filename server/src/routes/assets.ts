import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { fetchTickerPrices, fetchSingleTicker } from '../services/polygon';

const router = Router();
router.use(requireAuth);

// ─── Constants ────────────────────────────────────────────────────────────────

const RE_ADJUSTMENT_FACTOR = 0.91; // 91% of estimated value

// ─── Validation schemas ───────────────────────────────────────────────────────

const createAssetSchema = Joi.object({
  assetClass: Joi.string().valid('equity', 'real_estate', 'other', 'restricted').required(),
  assetType: Joi.string().required(),
  name: Joi.string().max(255).required(),

  // Equity fields
  ticker: Joi.string().max(20).uppercase().optional(),
  sharesHeld: Joi.number().positive().optional(),
  costBasisPerShare: Joi.number().positive().optional(),
  purchaseDate: Joi.date().iso().optional(),
  accountLabel: Joi.string().max(100).optional(),

  // Real estate fields
  propertyAddress: Joi.string().optional(),
  purchasePrice: Joi.number().positive().optional(),
  purchaseDateProperty: Joi.date().iso().optional(),
  estimatedValue: Joi.number().positive().optional(),
  mortgageBalance: Joi.number().min(0).optional(),
  monthlyRent: Joi.number().min(0).optional(),
  monthlyPiti: Joi.number().min(0).optional(),

  // Retirement flag
  isPretax: Joi.boolean().optional(),

  // Business equity fields
  valuationMethod: Joi.string()
    .valid('revenue_multiple', 'ebitda_multiple', 'book_value', 'other')
    .optional(),
  valuationNotes: Joi.string().optional(),

  // Restricted asset fields
  vestDate: Joi.date().iso().optional(),
  probability: Joi.number().min(0).max(100).optional(),

  // Shared
  currentValue: Joi.number().min(0).optional(),
  notes: Joi.string().optional(),
});

const updateAssetSchema = createAssetSchema.fork(
  ['assetClass', 'assetType', 'name'],
  field => field.optional()
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Apply smart valuation logic before saving an asset.
 * - Real estate: compute adjustedValue = estimatedValue * 0.91
 * - Equity: currentValue = sharesHeld * currentPrice (price set separately via refresh)
 */
function applyValuationLogic(data: Record<string, unknown>): Record<string, unknown> {
  const result = { ...data };

  if (data.assetClass === 'real_estate' && data.estimatedValue) {
    const estimated = Number(data.estimatedValue);
    result.adjustedValue = parseFloat((estimated * RE_ADJUSTMENT_FACTOR).toFixed(2));
  }

  return result;
}

/**
 * Append a record to asset_history. Always called after create or update.
 * Never updates or deletes history — append only.
 */
async function appendHistory(
  assetId: string,
  userId: string,
  value: number,
  source: string,
  note?: string,
  sourceDocumentId?: string
) {
  await prisma.assetHistory.create({
    data: {
      assetId,
      userId,
      value,
      valueSource: source,
      sourceDocumentId: sourceDocumentId ?? null,
      note: note ?? null,
    },
  });
}

/**
 * Get the current value to record in history for an asset.
 * Uses different fields depending on asset class.
 */
function getHistoryValue(asset: Record<string, unknown>): number {
  if (asset.assetClass === 'real_estate') {
    // Use equity (adjustedValue - mortgageBalance)
    const adjusted = Number(asset.adjustedValue ?? asset.estimatedValue ?? 0);
    const mortgage = Number(asset.mortgageBalance ?? 0);
    return parseFloat((adjusted - mortgage).toFixed(2));
  }
  return Number(asset.currentValue ?? 0);
}

// ─── GET /api/assets ──────────────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  try {
    const { assetClass, activeOnly = 'true' } = req.query;

    const assets = await prisma.asset.findMany({
      where: {
        userId: req.user!.userId,
        ...(activeOnly === 'true' && { isActive: true }),
        ...(assetClass && { assetClass: String(assetClass) }),
      },
      orderBy: [{ assetClass: 'asc' }, { createdAt: 'desc' }],
    });

    // For pre-tax assets, attach after-tax estimate using user's assumed tax rate
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { assumedTaxRate: true },
    });
    const taxRate = Number(user?.assumedTaxRate ?? 25) / 100;

    const enriched = assets.map(asset => {
      if (asset.isPretax && asset.currentValue) {
        const gross = Number(asset.currentValue);
        return {
          ...asset,
          afterTaxValue: parseFloat((gross * (1 - taxRate)).toFixed(2)),
          assumedTaxRate: Number(user?.assumedTaxRate ?? 25),
        };
      }
      return asset;
    });

    res.json({ assets: enriched });
  } catch (err) {
    console.error('[assets GET /]', err);
    res.status(500).json({ error: 'Failed to fetch assets.' });
  }
});

// ─── GET /api/assets/:id ──────────────────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const asset = await prisma.asset.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!asset) {
      res.status(404).json({ error: 'Asset not found.' });
      return;
    }

    res.json({ asset });
  } catch (err) {
    console.error('[assets GET /:id]', err);
    res.status(500).json({ error: 'Failed to fetch asset.' });
  }
});

// ─── GET /api/assets/:id/history ─────────────────────────────────────────────

router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const asset = await prisma.asset.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!asset) {
      res.status(404).json({ error: 'Asset not found.' });
      return;
    }

    const history = await prisma.assetHistory.findMany({
      where: { assetId: req.params.id },
      orderBy: { recordedAt: 'desc' },
      take: 100,
    });

    res.json({ history });
  } catch (err) {
    console.error('[assets GET /:id/history]', err);
    res.status(500).json({ error: 'Failed to fetch asset history.' });
  }
});

// ─── POST /api/assets ─────────────────────────────────────────────────────────

router.post('/', validate(createAssetSchema), async (req: Request, res: Response) => {
  try {
    const data = applyValuationLogic({ ...req.body });

    const asset = await prisma.asset.create({
      data: {
        userId: req.user!.userId,
        assetClass: data.assetClass as string,
        assetType: data.assetType as string,
        name: data.name as string,
        ticker: (data.ticker as string) ?? null,
        sharesHeld: data.sharesHeld != null ? Number(data.sharesHeld) : null,
        costBasisPerShare: data.costBasisPerShare != null ? Number(data.costBasisPerShare) : null,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate as string) : null,
        accountLabel: (data.accountLabel as string) ?? null,
        propertyAddress: (data.propertyAddress as string) ?? null,
        purchasePrice: data.purchasePrice != null ? Number(data.purchasePrice) : null,
        purchaseDateProperty: data.purchaseDateProperty ? new Date(data.purchaseDateProperty as string) : null,
        estimatedValue: data.estimatedValue != null ? Number(data.estimatedValue) : null,
        adjustedValue: data.adjustedValue != null ? Number(data.adjustedValue) : null,
        mortgageBalance: data.mortgageBalance != null ? Number(data.mortgageBalance) : null,
        monthlyRent: data.monthlyRent != null ? Number(data.monthlyRent) : null,
        monthlyPiti: data.monthlyPiti != null ? Number(data.monthlyPiti) : null,
        isPretax: Boolean(data.isPretax ?? false),
        valuationMethod: (data.valuationMethod as string) ?? null,
        valuationNotes: (data.valuationNotes as string) ?? null,
        vestDate: data.vestDate ? new Date(data.vestDate as string) : null,
        probability: data.probability != null ? Number(data.probability) : null,
        currentValue: data.currentValue != null ? Number(data.currentValue) : null,
        currentValueSource: 'manual',
        currentValueUpdatedAt: data.currentValue != null ? new Date() : null,
        notes: (data.notes as string) ?? null,
      },
    });

    // Append initial history record
    const historyValue = getHistoryValue({ ...asset, assetClass: asset.assetClass });
    if (historyValue > 0) {
      await appendHistory(asset.id, req.user!.userId, historyValue, 'manual', 'Initial entry');
    }

    // Build response with smart valuation explanation for real estate
    const response: Record<string, unknown> = { asset };
    if (asset.assetClass === 'real_estate' && asset.estimatedValue) {
      response.valuationNote = `We've used ${RE_ADJUSTMENT_FACTOR * 100}% of your estimated value ($${Number(asset.adjustedValue).toLocaleString()}) to account for typical selling costs and market variance. Your original estimate is kept on record.`;
    }

    res.status(201).json(response);
  } catch (err) {
    console.error('[assets POST /]', err);
    res.status(500).json({ error: 'Failed to create asset.' });
  }
});

// ─── PUT /api/assets/:id ──────────────────────────────────────────────────────

router.put('/:id', validate(updateAssetSchema), async (req: Request, res: Response) => {
  try {
    const existing = await prisma.asset.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Asset not found.' });
      return;
    }

    const data = applyValuationLogic({ ...req.body });

    // Build update payload — only include fields that were sent
    const updateData: Record<string, unknown> = {};
    const fieldMap: Record<string, string> = {
      assetClass: 'assetClass', assetType: 'assetType', name: 'name',
      ticker: 'ticker', sharesHeld: 'sharesHeld', costBasisPerShare: 'costBasisPerShare',
      purchaseDate: 'purchaseDate', accountLabel: 'accountLabel',
      propertyAddress: 'propertyAddress', purchasePrice: 'purchasePrice',
      purchaseDateProperty: 'purchaseDateProperty', estimatedValue: 'estimatedValue',
      adjustedValue: 'adjustedValue', mortgageBalance: 'mortgageBalance',
      monthlyRent: 'monthlyRent', monthlyPiti: 'monthlyPiti',
      isPretax: 'isPretax', valuationMethod: 'valuationMethod',
      valuationNotes: 'valuationNotes', vestDate: 'vestDate',
      probability: 'probability', currentValue: 'currentValue', notes: 'notes',
    };

    for (const [key, prismaKey] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) {
        if (['purchaseDate', 'purchaseDateProperty', 'vestDate'].includes(key)) {
          updateData[prismaKey] = data[key] ? new Date(data[key] as string) : null;
        } else {
          updateData[prismaKey] = data[key];
        }
      }
    }

    if (data.currentValue !== undefined) {
      updateData.currentValueSource = 'manual';
      updateData.currentValueUpdatedAt = new Date();
    }

    const updated = await prisma.asset.update({
      where: { id: req.params.id },
      data: updateData,
    });

    // Append history on value change
    const newValue = getHistoryValue({ ...updated, assetClass: updated.assetClass });
    const oldValue = getHistoryValue({ ...existing, assetClass: existing.assetClass });
    if (newValue !== oldValue && newValue > 0) {
      await appendHistory(updated.id, req.user!.userId, newValue, 'manual', 'Value updated manually');
    }

    const response: Record<string, unknown> = { asset: updated };
    if (updated.assetClass === 'real_estate' && updated.estimatedValue) {
      response.valuationNote = `Using ${RE_ADJUSTMENT_FACTOR * 100}% of your estimated value ($${Number(updated.adjustedValue).toLocaleString()}).`;
    }

    res.json(response);
  } catch (err) {
    console.error('[assets PUT /:id]', err);
    res.status(500).json({ error: 'Failed to update asset.' });
  }
});

// ─── DELETE /api/assets/:id ───────────────────────────────────────────────────
// Soft delete only — sets isActive = false, preserves all history

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.asset.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Asset not found.' });
      return;
    }

    await prisma.asset.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({ message: 'Asset removed.' });
  } catch (err) {
    console.error('[assets DELETE /:id]', err);
    res.status(500).json({ error: 'Failed to remove asset.' });
  }
});

// ─── POST /api/assets/refresh-prices ─────────────────────────────────────────
// Batch refresh all equity/crypto prices for this user from Polygon.io

router.post('/refresh-prices', async (req: Request, res: Response) => {
  try {
    const equityAssets = await prisma.asset.findMany({
      where: {
        userId: req.user!.userId,
        isActive: true,
        assetClass: 'equity',
        ticker: { not: null },
      },
      select: { id: true, ticker: true, sharesHeld: true, currentValue: true, name: true },
    });

    if (equityAssets.length === 0) {
      res.json({ message: 'No equity assets to refresh.', updated: 0 });
      return;
    }

    const tickers = [...new Set(equityAssets.map(a => a.ticker!))];
    const priceMap = await fetchTickerPrices(tickers);

    let updated = 0;
    const refreshed: Array<{ ticker: string; price: number; totalValue: number }> = [];

    for (const asset of equityAssets) {
      if (!asset.ticker) continue;
      const priceData = priceMap.get(asset.ticker.toUpperCase());
      if (!priceData) continue;

      const shares = Number(asset.sharesHeld ?? 0);
      const newValue = parseFloat((priceData.price * shares).toFixed(2));
      const oldValue = Number(asset.currentValue ?? 0);

      await prisma.asset.update({
        where: { id: asset.id },
        data: {
          currentValue: newValue,
          currentValueSource: 'ticker_api',
          currentValueUpdatedAt: new Date(priceData.updatedAt),
        },
      });

      if (newValue !== oldValue) {
        await prisma.assetHistory.create({
          data: {
            assetId: asset.id,
            userId: req.user!.userId,
            value: newValue,
            valueSource: 'ticker_api',
            note: `${asset.ticker} @ $${priceData.price} × ${shares} shares`,
          },
        });
      }

      refreshed.push({ ticker: asset.ticker, price: priceData.price, totalValue: newValue });
      updated++;
    }

    res.json({ message: `Refreshed ${updated} asset(s).`, updated, refreshed });
  } catch (err) {
    console.error('[assets/refresh-prices]', err);
    res.status(500).json({ error: 'Price refresh failed.' });
  }
});

// ─── GET /api/assets/ticker/:symbol ──────────────────────────────────────────
// On-demand single ticker lookup — used when user adds a new equity

router.get('/ticker/:symbol', async (req: Request, res: Response) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const data = await fetchSingleTicker(symbol);
    if (!data) {
      res.status(404).json({ error: `No price data found for ${symbol}.` });
      return;
    }
    res.json(data);
  } catch (err) {
    console.error('[assets/ticker/:symbol]', err);
    res.status(500).json({ error: 'Ticker lookup failed.' });
  }
});

export default router;
