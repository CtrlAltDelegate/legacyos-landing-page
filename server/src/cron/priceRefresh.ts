import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { fetchTickerPrices, fetchCryptoPrices, fetchEnrichmentFromYahoo } from '../services/polygon';

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
        assetType: true,
        currentValueSource: true,
        sharesHeld: true,
        currentValue: true,
        name: true,
        sector: true,
      },
    });

    if (equityAssets.length === 0) {
      console.log('[priceRefresh] No equity assets to refresh.');
      return { updated: 0, skipped: 0, errors: 0 };
    }

    // Split into stocks/ETFs vs crypto — they use different price APIs
    const isCrypto = (a: { assetType: string; currentValueSource: string | null }) =>
      a.assetType === 'crypto' ||
      ['coingecko', 'binance', 'coinbase'].some(s => a.currentValueSource?.includes(s));

    const stockAssets  = equityAssets.filter(a => !isCrypto(a));
    const cryptoAssets = equityAssets.filter(a =>  isCrypto(a));

    const stockTickers  = [...new Set(stockAssets.map(a => a.ticker!).filter(Boolean))];
    const cryptoTickers = [...new Set(cryptoAssets.map(a => a.ticker!).filter(Boolean))];
    const totalTickers  = stockTickers.length + cryptoTickers.length;

    console.log(`[priceRefresh] Fetching prices for ${totalTickers} unique tickers across ${equityAssets.length} assets (${stockTickers.length} stocks, ${cryptoTickers.length} crypto)...`);

    // Fetch stocks via Polygon → Yahoo; crypto via CoinGecko → Coinbase → Binance
    const [stockPriceMap, cryptoPriceMap] = await Promise.all([
      stockTickers.length  ? fetchTickerPrices(stockTickers)   : Promise.resolve(new Map()),
      cryptoTickers.length ? fetchCryptoPrices(cryptoTickers)  : Promise.resolve(new Map()),
    ]);
    const priceMap = new Map([...stockPriceMap, ...cryptoPriceMap]);
    console.log(`[priceRefresh] Got prices for ${priceMap.size}/${totalTickers} tickers.`);

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

        // For non-crypto stocks: fetch enrichment from Yahoo if not yet populated
        const needsEnrichment = !isCrypto(asset) && !asset.sector;
        const enrichment = needsEnrichment
          ? await fetchEnrichmentFromYahoo(asset.ticker!.toUpperCase())
          : null;

        await prisma.asset.update({
          where: { id: asset.id },
          data: {
            currentValue: newValue,
            currentValueSource: 'ticker_api',
            currentValueUpdatedAt: new Date(priceData.updatedAt),
            // Save enrichment (priceData from Yahoo fallback, or fresh enrichment call)
            ...(priceData.sector             && { sector: priceData.sector }),
            ...(priceData.geography          && { geography: priceData.geography }),
            ...(priceData.marketCapCategory  && { marketCapCategory: priceData.marketCapCategory }),
            ...(enrichment?.sector           && { sector: enrichment.sector }),
            ...(enrichment?.geography        && { geography: enrichment.geography }),
            ...(enrichment?.marketCapCategory && { marketCapCategory: enrichment.marketCapCategory }),
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
