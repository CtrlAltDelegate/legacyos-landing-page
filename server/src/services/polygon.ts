import axios from 'axios';

const POLYGON_BASE = 'https://api.polygon.io/v2';
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const POLYGON_KEY = process.env.POLYGON_API_KEY!;

export interface TickerPrice {
  ticker: string;
  price: number;
  name?: string;
  updatedAt: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── In-memory price cache (5-minute TTL) ────────────────────────────────────
// Prevents hammering external APIs when multiple positions refresh simultaneously.

interface CacheEntry { data: TickerPrice; expiresAt: number; }
const priceCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function cacheGet(key: string): TickerPrice | null {
  const entry = priceCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { priceCache.delete(key); return null; }
  return entry.data;
}

function cacheSet(key: string, data: TickerPrice): void {
  priceCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── Polygon (stocks / ETFs) ──────────────────────────────────────────────────
// Uses /v2/aggs/ticker/{ticker}/prev — the "previous day close" endpoint.
// This is available on Polygon's free tier and always returns data regardless
// of whether the market is currently open.

async function fetchFromPolygon(ticker: string): Promise<TickerPrice | null> {
  try {
    const url = `${POLYGON_BASE}/aggs/ticker/${ticker.toUpperCase()}/prev`;
    const response = await axios.get(url, {
      params: { apiKey: POLYGON_KEY, adjusted: 'true' },
      timeout: 10_000,
    });

    const results = response.data?.results;
    if (!results || results.length === 0) return null;

    const price = results[0].c; // previous day close
    if (!price || price <= 0) return null;

    return {
      ticker: ticker.toUpperCase(),
      price: parseFloat(price.toFixed(6)),
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// ─── CoinGecko (crypto tokens) ────────────────────────────────────────────────
// Free tier: ~30 req/min. We use search to resolve symbol → ID, then price.

async function fetchFromCoinGecko(symbol: string): Promise<TickerPrice | null> {
  try {
    // Step 1: resolve symbol → CoinGecko ID
    const searchRes = await axios.get(`${COINGECKO_BASE}/search`, {
      params: { query: symbol },
      timeout: 10_000,
      headers: { 'Accept': 'application/json' },
    });

    const coins: Array<{
      id: string;
      symbol: string;
      name: string;
      market_cap_rank: number | null;
    }> = searchRes.data?.coins ?? [];

    const matches = coins
      .filter(c => c.symbol.toUpperCase() === symbol.toUpperCase())
      .sort((a, b) => {
        if (a.market_cap_rank === null) return 1;
        if (b.market_cap_rank === null) return -1;
        return a.market_cap_rank - b.market_cap_rank;
      });

    if (matches.length === 0) return null;
    const best = matches[0];

    // Step 2: get current USD price
    const priceRes = await axios.get(`${COINGECKO_BASE}/simple/price`, {
      params: { ids: best.id, vs_currencies: 'usd', include_last_updated_at: 'true' },
      timeout: 10_000,
      headers: { 'Accept': 'application/json' },
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
      const status = err.response?.status;
      if (status === 429) {
        console.warn(`[coingecko] Rate limited for ${symbol} — try again shortly`);
      } else {
        console.error(`[coingecko] ${symbol} failed:`, err.response?.data ?? err.message);
      }
    }
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch a single ticker price.
 * - Checks cache first (5-min TTL)
 * - Tries Polygon /aggs/prev (stocks, ETFs, mutual funds)
 * - Falls back to CoinGecko (crypto tokens)
 */
export async function fetchSingleTicker(ticker: string): Promise<TickerPrice | null> {
  const key = ticker.toUpperCase();

  // Cache hit
  const cached = cacheGet(key);
  if (cached) return cached;

  // Try Polygon first (stocks/ETFs)
  const polygonResult = await fetchFromPolygon(key);
  if (polygonResult) {
    cacheSet(key, polygonResult);
    return polygonResult;
  }

  // Fall back to CoinGecko (crypto)
  console.log(`[ticker] ${key} not on Polygon, trying CoinGecko...`);
  const cryptoResult = await fetchFromCoinGecko(key);
  if (cryptoResult) {
    cacheSet(key, cryptoResult);
  }
  return cryptoResult;
}

/**
 * Batch fetch for stock/ETF tickers via Polygon.
 * Used by the weekly price-refresh cron.
 */
export async function fetchTickerPrices(tickers: string[]): Promise<Map<string, TickerPrice>> {
  const results = new Map<string, TickerPrice>();
  if (tickers.length === 0) return results;

  const unique = [...new Set(tickers.map(t => t.toUpperCase()))];

  // Polygon free tier: 5 req/min → space calls 13s apart to stay safe
  for (let i = 0; i < unique.length; i++) {
    const ticker = unique[i];

    const cached = cacheGet(ticker);
    if (cached) { results.set(ticker, cached); continue; }

    const result = await fetchFromPolygon(ticker);
    if (result) {
      results.set(ticker, result);
      cacheSet(ticker, result);
    }

    if (i < unique.length - 1) await sleep(13_000);
  }

  return results;
}

/**
 * Batch fetch crypto prices via CoinGecko.
 * Resolves symbols → IDs then fetches in one batch call.
 */
export async function fetchCryptoPrices(symbols: string[]): Promise<Map<string, TickerPrice>> {
  const results = new Map<string, TickerPrice>();
  if (symbols.length === 0) return results;

  const symbolToMeta = new Map<string, { id: string; name: string }>();

  // Resolve each symbol (sequential to avoid CoinGecko rate limits)
  for (const sym of symbols) {
    const key = sym.toUpperCase();

    const cached = cacheGet(key);
    if (cached) { results.set(key, cached); continue; }

    try {
      const searchRes = await axios.get(`${COINGECKO_BASE}/search`, {
        params: { query: sym },
        timeout: 10_000,
      });
      const coins: Array<{ id: string; symbol: string; name: string; market_cap_rank: number | null }> =
        searchRes.data?.coins ?? [];
      const matches = coins
        .filter(c => c.symbol.toUpperCase() === key)
        .sort((a, b) => {
          if (a.market_cap_rank === null) return 1;
          if (b.market_cap_rank === null) return -1;
          return a.market_cap_rank - b.market_cap_rank;
        });
      if (matches.length > 0) symbolToMeta.set(key, { id: matches[0].id, name: matches[0].name });
    } catch {
      console.warn(`[coingecko] Could not resolve: ${sym}`);
    }
    await sleep(500); // ~2 req/s — safe under free tier
  }

  if (symbolToMeta.size === 0) return results;

  // Batch price fetch
  const ids = Array.from(symbolToMeta.values()).map(v => v.id);
  try {
    const priceRes = await axios.get(`${COINGECKO_BASE}/simple/price`, {
      params: { ids: ids.join(','), vs_currencies: 'usd', include_last_updated_at: 'true' },
      timeout: 15_000,
    });

    for (const [sym, meta] of symbolToMeta.entries()) {
      const pd = priceRes.data?.[meta.id];
      if (pd?.usd) {
        const result: TickerPrice = {
          ticker: sym,
          name: meta.name,
          price: pd.usd,
          updatedAt: pd.last_updated_at
            ? new Date(pd.last_updated_at * 1000).toISOString()
            : new Date().toISOString(),
        };
        results.set(sym, result);
        cacheSet(sym, result);
      }
    }
  } catch (err) {
    console.error('[coingecko] Batch price fetch failed:', err);
  }

  return results;
}

/**
 * Fetch all equity prices — stocks/ETFs via Polygon, crypto via CoinGecko.
 */
export async function fetchAllEquityPrices(
  assets: Array<{ ticker: string; assetType: string }>
): Promise<Map<string, TickerPrice>> {
  const stockAssets = assets.filter(a => a.assetType !== 'crypto');
  const cryptoAssets = assets.filter(a => a.assetType === 'crypto');

  const [stockPrices, cryptoPrices] = await Promise.all([
    fetchTickerPrices(stockAssets.map(a => a.ticker)),
    fetchCryptoPrices(cryptoAssets.map(a => a.ticker)),
  ]);

  const merged = new Map<string, TickerPrice>();
  for (const [k, v] of stockPrices) merged.set(k, v);
  for (const [k, v] of cryptoPrices) merged.set(k, v);
  return merged;
}
