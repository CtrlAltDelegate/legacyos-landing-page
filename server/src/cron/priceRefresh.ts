import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { fetchTickerPrices } from '../services/polygon';

/**
 * refreshPricesForAllUsers — the core refresh logic.
 * Called by the cron job and also exposed for manual trigger via API.
 *
 * Strategy:
 * 1. Gather all unique active equity/crypto tickers across all users
 * 2. Fetch prices in one batched Polygon.io call (respects 5 req/min limit)
 * 3. Update each asset's currentValue and append to asset_history
 */
export async function refreshPricesForAllUsers(): Promise<{
  updated: number;
  skipped: number;
  errors: number;
}> {
  console.log('[priceRefresh] Starting equity price refresh...');

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  try {
    // Gather all active equity/crypto assets across all users
    const equityAssets = await prisma.asset.findMany({
      where: {
        isActive: true,
        assetClass: 'equity',
        ticker: { not: null },
      },
      select: {
        id: true,
        userId: true,
        ticker: true,
        sharesHeld: true,
        currentValue: true,
        name: true,
      },
    });

    if (equityAssets.length === 0) {
      console.log('[priceRefresh] No equity assets to refresh.');
      return { updated: 0, skipped: 0, errors: 0 };
    }

    // Collect unique tickers
    const tickers = [...new Set(
      equityAssets
        .map(a => a.ticker!)
        .filter(Boolean)
    )];

    console.log(`[priceRefresh] Fetching prices for ${tickers.length} unique tickers across ${equityAssets.length} assets...`);

    // Batch fetch from Polygon.io
    const priceMap = await fetchTickerPrices(tickers);
    console.log(`[priceRefresh] Got prices for ${priceMap.size}/${tickers.length} tickers.`);

    // Update each asset
    for (const asset of equityAssets) {
      if (!asset.ticker) { skipped++; continue; }

      const priceData = priceMap.get(asset.ticker.toUpperCase());
      if (!priceData) {
        console.warn(`[priceRefresh] No price found for ${asset.ticker}`);
        skipped++;
        continue;
      }

      try {
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

        // Append to history only if value changed
        if (newValue !== oldValue) {
          await prisma.assetHistory.create({
            data: {
              assetId: asset.id,
              userId: asset.userId,
              value: newValue,
              valueSource: 'ticker_api',
              note: `${asset.ticker} @ $${priceData.price} × ${shares} shares`,
            },
          });
        }

        updated++;
      } catch (err) {
        console.error(`[priceRefresh] Failed to update asset ${asset.id}:`, err);
        errors++;
      }
    }

    console.log(`[priceRefresh] Done. Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`);
  } catch (err) {
    console.error('[priceRefresh] Fatal error:', err);
    errors++;
  }

  return { updated, skipped, errors };
}

/**
 * Weekly cron job — runs every Sunday at midnight.
 * Schedule: '0 0 * * 0'
 */
export function startPriceRefreshCron(): void {
  cron.schedule('0 0 * * 0', async () => {
    console.log('[priceRefresh] Weekly cron triggered at', new Date().toISOString());
    await refreshPricesForAllUsers();
  }, {
    timezone: 'America/Los_Angeles',
  });

  console.log('[priceRefresh] Weekly price refresh cron scheduled (Sun 00:00 PT)');
}
