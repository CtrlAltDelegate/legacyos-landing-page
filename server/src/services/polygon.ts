import axios from 'axios';

const POLYGON_BASE = 'https://api.polygon.io/v2';
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const POLYGON_KEY = process.env.POLYGON_API_KEY!;

// Polygon.io free tier: 5 requests/minute
const REQUEST_DELAY_MS = 12_500;

export interface TickerPrice {
  ticker: string;
  price: number;
  name?: string;
  updatedAt: string;
}

export interface PolygonSnapshotResponse {
  tickers: Array<{
    ticker: string;
    name?: string;
    day: { c: number };
    lastTrade: { p: number };
    prevDay: { c: number };   // previous trading day close — reliable on weekends/pre-market
    updated: number;
  }>;
  status: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── CoinGecko (crypto) ───────────────────────────────────────────────────────

/**
 * Look up a single crypto token by symbol via CoinGecko.
 * Uses search to resolve the symbol → CoinGecko ID, then fetches price.
 * CoinGecko free tier: ~30 calls/min, no API key required.
 */
async function fetchFromCoinGecko(symbol: string): Promise<TickerPrice | null> {
  try {
    // Step 1: Resolve symbol → CoinGecko ID via search
    const searchRes = await axios.get(`${COINGECKO_BASE}/search`, {
      params: { query: symbol },
      timeout: 10_000,
    });

    const coins: Array<{
      id: string;
      symbol: string;
      name: string;
      market_cap_rank: number | null;
    }> = searchRes.data?.coins ?? [];

    // Exact symbol match, prefer highest market cap rank (lowest number = bigger coin)
    const matches = coins.filter(c => c.symbol.toUpperCase() === symbol.toUpperCase());
    if (matches.length === 0) return null;

    matches.sort((a, b) => {
      if (a.market_cap_rank === null) return 1;
      if (b.market_cap_rank === null) return -1;
      return a.market_cap_rank - b.market_cap_rank;
    });

    const best = matches[0];

    // Step 2: Fetch current USD price
    const priceRes = await axios.get(`${COINGECKO_BASE}/simple/price`, {
      params: {
        ids: best.id,
        vs_currencies: 'usd',
        include_last_updated_at: 'true',
      },
      timeout: 10_000,
    });

    const pd = priceRes.data?.[best.id];
    if (!pd?.usd) return null;

    return {
      ticker: symbol.toUpperCase(),
      name: best.name,
      price: pd.usd,
      updatedAt: pd.last_updated_at
        ? new Date(pd.last_updated_at * 1000).toISOString()
        : new Date().toISOString(),
    };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.error(`[coingecko] ${symbol} failed:`, err.response?.data ?? err.message);
    } else {
      console.error(`[coingecko] ${symbol} error:`, err);
    }
    return null;
  }
}

/**
 * Batch fetch crypto prices via CoinGecko's coins/markets endpoint.
 * Resolves symbols → IDs first via search, then batch fetches prices.
 */
async function fetchCryptoPrices(symbols: string[]): Promise<Map<string, TickerPrice>> {
  const results = new Map<string, TickerPrice>();
  if (symbols.length === 0) return results;

  // Resolve each symbol to a CoinGecko ID (sequential to avoid rate limiting)
  const symbolToId = new Map<string, { id: string; name: string }>();
  for (const sym of symbols) {
    try {
      const searchRes = await axios.get(`${COINGECKO_BASE}/search`, {
        params: { query: sym },
        timeout: 10_000,
      });
      const coins: Array<{ id: string; symbol: string; name: string; market_cap_rank: number | null }> =
        searchRes.data?.coins ?? [];
      const matches = coins
        .filter(c => c.symbol.toUpperCase() === sym.toUpperCase())
        .sort((a, b) => {
          if (a.market_cap_rank === null) return 1;
          if (b.market_cap_rank === null) return -1;
          return a.market_cap_rank - b.market_cap_rank;
        });
      if (matches.length > 0) symbolToId.set(sym.toUpperCase(), { id: matches[0].id, name: matches[0].name });
    } catch {
      console.warn(`[coingecko] Could not resolve symbol: ${sym}`);
    }
    await sleep(400); // ~2.5 req/s — well within free tier
  }

  if (symbolToId.size === 0) return results;

  // Batch price fetch (up to 250 IDs per call)
  const ids = Array.from(symbolToId.values()).map(v => v.id);
  const chunkSize = 250;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    try {
      const priceRes = await axios.get(`${COINGECKO_BASE}/simple/price`, {
        params: {
          ids: chunk.join(','),
          vs_currencies: 'usd',
          include_last_updated_at: 'true',
        },
        timeout: 15_000,
      });

      for (const [sym, meta] of symbolToId.entries()) {
        const pd = priceRes.data?.[meta.id];
        if (pd?.usd) {
          results.set(sym, {
            ticker: sym,
            name: meta.name,
            price: pd.usd,
            updatedAt: pd.last_updated_at
              ? new Date(pd.last_updated_at * 1000).toISOString()
              : new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.error('[coingecko] Batch price fetch failed:', err);
    }
  }

  return results;
}

// ─── Polygon (stocks / ETFs) ──────────────────────────────────────────────────

/**
 * Fetch EOD prices for a batch of stock tickers via Polygon.io.
 */
export async function fetchTickerPrices(tickers: string[]): Promise<Map<string, TickerPrice>> {
  const results = new Map<string, TickerPrice>();
  if (tickers.length === 0) return results;

  const unique = [...new Set(tickers.map(t => t.toUpperCase()))];
  const chunkSize = 50;
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += chunkSize) chunks.push(unique.slice(i, i + chunkSize));

  for (let i = 0; i < chunks.length; i++) {
    try {
      const url = `${POLYGON_BASE}/snapshot/locale/us/markets/stocks/tickers`;
      const response = await axios.get<PolygonSnapshotResponse>(url, {
        params: { tickers: chunks[i].join(','), apiKey: POLYGON_KEY },
        timeout: 10_000,
      });

      if (response.data?.tickers) {
        for (const t of response.data.tickers) {
          // day.c = today's close (0 before market opens / on weekends)
          // lastTrade.p = last trade price
          // prevDay.c = previous trading day's close — most reliable fallback
          const price = t.day?.c || t.lastTrade?.p || t.prevDay?.c;
          if (price && price > 0) {
            results.set(t.ticker, {
              ticker: t.ticker,
              price: parseFloat(price.toFixed(6)),
              updatedAt: new Date(t.updated).toISOString(),
            });
          }
        }
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error(`[polygon] Chunk ${i + 1} failed:`, err.response?.data ?? err.message);
      }
    }

    if (i < chunks.length - 1) await sleep(REQUEST_DELAY_MS);
  }

  return results;
}

/**
 * Fetch all equity prices — stocks via Polygon, crypto via CoinGecko.
 * Pass assetType alongside tickers so we can route correctly.
 */
export async function fetchAllEquityPrices(
  assets: Array<{ ticker: string; assetType: string }>
): Promise<Map<string, TickerPrice>> {
  const stockTickers = assets.filter(a => a.assetType !== 'crypto').map(a => a.ticker);
  const cryptoTickers = assets.filter(a => a.assetType === 'crypto').map(a => a.ticker);

  const [stockPrices, cryptoPrices] = await Promise.all([
    fetchTickerPrices(stockTickers),
    fetchCryptoPrices(cryptoTickers),
  ]);

  const merged = new Map<string, TickerPrice>();
  for (const [k, v] of stockPrices) merged.set(k, v);
  for (const [k, v] of cryptoPrices) merged.set(k, v);
  return merged;
}

/**
 * Fetch a single ticker — tries Polygon (stocks) first, then CoinGecko (crypto).
 */
export async function fetchSingleTicker(ticker: string): Promise<TickerPrice | null> {
  // Try Polygon first (stocks/ETFs)
  try {
    const url = `${POLYGON_BASE}/snapshot/locale/us/markets/stocks/tickers/${ticker.toUpperCase()}`;
    const response = await axios.get(url, {
      params: { apiKey: POLYGON_KEY },
      timeout: 10_000,
    });

    const t = response.data?.ticker;
    if (t) {
      // Use today's close → last trade → previous day's close (handles weekends/pre-market)
      const price = t.day?.c || t.lastTrade?.p || t.prevDay?.c;
      if (price && price > 0) {
        return {
          ticker: t.ticker,
          name: t.name,
          price: parseFloat(price.toFixed(6)),
          updatedAt: new Date(t.updated).toISOString(),
        };
      }
    }
  } catch {
    // Polygon returned 404 or error — fall through to CoinGecko
  }

  // Fall back to CoinGecko (crypto tokens)
  console.log(`[ticker] ${ticker} not found on Polygon, trying CoinGecko...`);
  return fetchFromCoinGecko(ticker);
}
