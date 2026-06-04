import axios from 'axios';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const YahooFinanceLib = require('yahoo-finance2').default;
const yahooFinance = new YahooFinanceLib({ suppressNotices: ['yahooSurvey'] });

const POLYGON_BASE   = 'https://api.polygon.io/v2';
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const POLYGON_KEY    = process.env.POLYGON_API_KEY!;

export interface TickerPrice {
  ticker: string;
  price: number;
  name?: string;
  updatedAt: string;
  // Enrichment — populated for stocks/ETFs via Yahoo Finance, null for crypto
  sector?: string | null;
  geography?: string | null;         // 'domestic' | 'international' | 'emerging'
  marketCapCategory?: string | null; // 'mega_cap' | 'large_cap' | 'mid_cap' | 'small_cap' | 'micro_cap'
}

/** Classify a market cap number into a category. */
export function classifyMarketCap(marketCap: number | null | undefined): string | null {
  if (!marketCap || marketCap <= 0) return null;
  if (marketCap >= 200_000_000_000) return 'mega_cap';     // $200B+
  if (marketCap >= 10_000_000_000)  return 'large_cap';    // $10B–$200B
  if (marketCap >= 2_000_000_000)   return 'mid_cap';      // $2B–$10B
  if (marketCap >= 300_000_000)     return 'small_cap';    // $300M–$2B
  return 'micro_cap';                                       // < $300M
}

/** Map a country/locale string to a geography category. */
export function classifyGeography(country: string | null | undefined): string | null {
  if (!country) return null;
  const c = country.toLowerCase();
  // Emerging market countries
  const emerging = ['china', 'india', 'brazil', 'russia', 'mexico', 'indonesia',
                    'turkey', 'thailand', 'malaysia', 'philippines', 'south africa',
                    'colombia', 'egypt', 'vietnam', 'taiwan'];
  if (emerging.some((e) => c.includes(e))) return 'emerging';
  // US / Canada / Western Europe / Australia / Japan / South Korea = domestic-adjacent
  if (['united states', 'usa', 'us'].some((e) => c.includes(e))) return 'domestic';
  return 'international';
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── In-memory price cache (30-min TTL) ───────────────────────────────────────
// Prevents hammering external APIs when multiple positions refresh at once.

interface CacheEntry { data: TickerPrice; expiresAt: number; }
const priceCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function cacheGet(key: string): TickerPrice | null {
  const entry = priceCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { priceCache.delete(key); return null; }
  return entry.data;
}
function cacheSet(key: string, data: TickerPrice): void {
  priceCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── Source 1: Polygon (stocks / ETFs) ───────────────────────────────────────
// Uses /aggs/ticker/{ticker}/prev — previous trading day close.
// Available on Polygon free tier. Works regardless of market hours.

async function fetchFromPolygon(ticker: string): Promise<TickerPrice | null> {
  try {
    const url = `${POLYGON_BASE}/aggs/ticker/${ticker}/prev`;
    const res = await axios.get(url, {
      params: { apiKey: POLYGON_KEY, adjusted: 'true' },
      timeout: 8_000,
    });

    const results = res.data?.results;
    if (!results?.length) return null;

    const price = results[0].c;
    if (!price || price <= 0) return null;

    return {
      ticker,
      price: parseFloat(price.toFixed(6)),
      updatedAt: new Date().toISOString(),
    };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.warn(`[polygon] ${ticker}: ${err.response?.status ?? err.message}`);
    }
    return null;
  }
}

// ─── Source 2: Yahoo Finance (stocks / ETFs / indices) ───────────────────────
// Uses the yahoo-finance2 npm package — free, no API key, covers every US
// stock and ETF reliably. Falls back to previousClose when market is closed.

async function fetchFromYahoo(ticker: string): Promise<TickerPrice | null> {
  try {
    const quote = await yahooFinance.quote(ticker, {}, { validateResult: false });
    if (!quote) return null;

    const price = quote.regularMarketPrice ?? quote.previousClose;
    if (!price || price <= 0) return null;

    return {
      ticker,
      name: (quote.longName || quote.shortName) ?? undefined,
      price: parseFloat(price.toFixed(6)),
      updatedAt: new Date().toISOString(),
      // Enrichment fields — available for most stocks/ETFs
      sector: (quote.sector as string | undefined) ?? null,
      geography: classifyGeography((quote.country as string | undefined) ?? null),
      marketCapCategory: classifyMarketCap((quote.marketCap as number | undefined) ?? null),
    };
  } catch (err) {
    console.warn(`[yahoo] ${ticker}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

// ─── Source 3: CoinGecko (crypto tokens) ────────────────────────────────────
// Free tier: ~30 req/min. Used only after Polygon + Yahoo both fail.
// Short/ambiguous symbols (e.g. "W" for Wormhole) can slip through the search
// filter — CoinCap is used as a fallback in that case.

async function fetchFromCoinGecko(symbol: string): Promise<TickerPrice | null> {
  try {
    // Resolve symbol → CoinGecko ID
    const searchRes = await axios.get(`${COINGECKO_BASE}/search`, {
      params: { query: symbol },
      timeout: 10_000,
      headers: { 'Accept': 'application/json' },
    });

    const coins: Array<{
      id: string; symbol: string; name: string; market_cap_rank: number | null;
    }> = searchRes.data?.coins ?? [];

    const matches = coins
      .filter(c => c.symbol.toUpperCase() === symbol.toUpperCase())
      .sort((a, b) => {
        if (a.market_cap_rank === null) return 1;
        if (b.market_cap_rank === null) return -1;
        return a.market_cap_rank - b.market_cap_rank;
      });

    if (!matches.length) {
      console.warn(`[coingecko] No symbol match for "${symbol}" in search results`);
      return null;
    }
    const best = matches[0];

    // Fetch USD price
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
        console.warn(`[coingecko] Rate limited for ${symbol} — try again in a minute`);
      } else {
        console.warn(`[coingecko] ${symbol}: ${err.response?.status ?? err.message}`);
      }
    }
    return null;
  }
}

// ─── Source 4: Coinbase (crypto — best coverage for US retail coins) ─────────
// Free public API, no key required. Covers every coin listed on Coinbase
// including Wormhole (W), which CoinGecko search and Binance both miss.

async function fetchFromCoinbase(symbol: string): Promise<TickerPrice | null> {
  try {
    const res = await axios.get(
      `https://api.coinbase.com/v2/prices/${symbol.toUpperCase()}-USD/spot`,
      { timeout: 8_000, headers: { 'Accept': 'application/json' } }
    );
    const price = parseFloat(res.data?.data?.amount ?? '0');
    if (!price || price <= 0) return null;
    return {
      ticker: symbol.toUpperCase(),
      price,
      updatedAt: new Date().toISOString(),
    };
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return null; // Not listed on Coinbase — silent
    }
    console.warn(`[coinbase] ${symbol}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

// ─── Source 5: Binance (broader crypto fallback) ──────────────────────────────
// Free public API, no key required. Tries USDT and FDUSD pairs.
// Note: BUSD pairs removed — Binance killed BUSD in 2024 (returns 451).

async function fetchFromBinance(symbol: string): Promise<TickerPrice | null> {
  const pairs = [`${symbol}USDT`, `${symbol}FDUSD`];
  for (const pair of pairs) {
    try {
      const res = await axios.get('https://api.binance.com/api/v3/ticker/price', {
        params: { symbol: pair },
        timeout: 8_000,
        headers: { 'Accept': 'application/json' },
      });
      const price = parseFloat(res.data?.price ?? '0');
      if (!price || price <= 0) continue;
      return {
        ticker: symbol.toUpperCase(),
        price,
        updatedAt: new Date().toISOString(),
      };
    } catch (err) {
      if (axios.isAxiosError(err) && (err.response?.status === 400 || err.response?.status === 451)) {
        continue; // 400 = bad pair, 451 = legal restriction — try next
      }
      console.warn(`[binance] ${pair}:`, err instanceof Error ? err.message : err);
    }
  }
  return null;
}

// ─── Public: single ticker lookup ────────────────────────────────────────────

/**
 * Fetch one ticker price.
 *
 * For stocks/ETFs: Polygon → Yahoo Finance → (crypto sources skipped)
 * For crypto:      CoinGecko → Coinbase → Binance  (stock sources skipped entirely
 *                  to prevent ticker collisions like W=Wormhole vs W=Wayfair)
 * When assetType is unknown: full chain (legacy behaviour)
 */
export async function fetchSingleTicker(
  ticker: string,
  assetType?: string,
): Promise<TickerPrice | null> {
  const key = ticker.toUpperCase();
  const isCrypto = assetType === 'crypto';
  const isStock  = assetType && assetType !== 'crypto';

  const cached = cacheGet(key);
  if (cached) return cached;

  // ── Stock / ETF path ────────────────────────────────────────────────────────
  if (!isCrypto) {
    const polygon = await fetchFromPolygon(key);
    if (polygon) { cacheSet(key, polygon); return polygon; }

    const yahoo = await fetchFromYahoo(key);
    if (yahoo) { cacheSet(key, yahoo); return yahoo; }

    // If we know it's a stock, don't fall into crypto sources
    if (isStock) return null;
  }

  // ── Crypto path ─────────────────────────────────────────────────────────────
  const gecko = await fetchFromCoinGecko(key);
  if (gecko) { cacheSet(key, gecko); return gecko; }

  const coinbase = await fetchFromCoinbase(key);
  if (coinbase) { cacheSet(key, coinbase); return coinbase; }

  const binance = await fetchFromBinance(key);
  if (binance) { cacheSet(key, binance); }
  return binance;
}

// ─── Public: batch stock/ETF prices ──────────────────────────────────────────

/**
 * Batch fetch for stock/ETF tickers — Polygon with Yahoo fallback per ticker.
 * Used by the weekly price-refresh cron for non-crypto assets.
 */
export async function fetchTickerPrices(tickers: string[]): Promise<Map<string, TickerPrice>> {
  const results = new Map<string, TickerPrice>();
  if (!tickers.length) return results;

  const unique = [...new Set(tickers.map(t => t.toUpperCase()))];

  for (let i = 0; i < unique.length; i++) {
    const ticker = unique[i];

    const cached = cacheGet(ticker);
    if (cached) { results.set(ticker, cached); continue; }

    let result = await fetchFromPolygon(ticker);
    if (!result) {
      await sleep(300); // small gap before Yahoo
      result = await fetchFromYahoo(ticker);
    }
    if (result) { results.set(ticker, result); cacheSet(ticker, result); }

    // Polygon free tier: 5 req/min — wait between tickers
    if (i < unique.length - 1) await sleep(13_000);
  }

  return results;
}

// ─── Public: batch crypto prices ─────────────────────────────────────────────

/**
 * Batch fetch crypto prices via CoinGecko.
 * Resolves symbols → IDs sequentially (to avoid rate limits), then
 * fetches all prices in a single batched request.
 */
export async function fetchCryptoPrices(symbols: string[]): Promise<Map<string, TickerPrice>> {
  const results = new Map<string, TickerPrice>();
  if (!symbols.length) return results;

  const symbolToMeta = new Map<string, { id: string; name: string }>();

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
      if (matches.length) symbolToMeta.set(key, { id: matches[0].id, name: matches[0].name });
    } catch {
      console.warn(`[coingecko] Could not resolve symbol: ${sym}`);
    }
    await sleep(500); // ~2 req/s — well within the 30/min free limit
  }

  // ── CoinGecko batch price call ──────────────────────────────────────────────
  if (symbolToMeta.size > 0) {
    try {
      const ids = Array.from(symbolToMeta.values()).map(v => v.id);
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
  }

  // ── Coinbase + Binance fallback for any symbol CoinGecko missed ─────────────
  const missed = symbols.map(s => s.toUpperCase()).filter(s => !results.has(s));
  for (const sym of missed) {
    const coinbase = await fetchFromCoinbase(sym);
    if (coinbase) { results.set(sym, coinbase); cacheSet(sym, coinbase); continue; }
    const binance = await fetchFromBinance(sym);
    if (binance) { results.set(sym, binance); cacheSet(sym, binance); }
    await sleep(200);
  }

  return results;
}

// ─── Public: combined stock + crypto batch ────────────────────────────────────

export async function fetchAllEquityPrices(
  assets: Array<{ ticker: string; assetType: string }>
): Promise<Map<string, TickerPrice>> {
  const stocks = assets.filter(a => a.assetType !== 'crypto').map(a => a.ticker);
  const crypto = assets.filter(a => a.assetType === 'crypto').map(a => a.ticker);

  const [stockPrices, cryptoPrices] = await Promise.all([
    fetchTickerPrices(stocks),
    fetchCryptoPrices(crypto),
  ]);

  const merged = new Map<string, TickerPrice>();
  for (const [k, v] of stockPrices) merged.set(k, v);
  for (const [k, v] of cryptoPrices) merged.set(k, v);
  return merged;
}
