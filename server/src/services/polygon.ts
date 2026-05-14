import axios from 'axios';

const BASE_URL = 'https://api.polygon.io/v2';
const API_KEY = process.env.POLYGON_API_KEY!;

// Polygon.io free tier: 5 requests/minute
// We batch tickers using the /snapshot/locale/us/markets/stocks/tickers endpoint
// which returns multiple tickers in a single request — so 1 call covers all equities.
const REQUEST_DELAY_MS = 12_500; // 12.5s between calls = safe under 5/min

export interface TickerPrice {
  ticker: string;
  price: number;       // closing price (EOD)
  updatedAt: string;   // ISO date string
}

export interface PolygonSnapshotResponse {
  tickers: Array<{
    ticker: string;
    day: { c: number };         // close price for the day
    lastTrade: { p: number };   // last trade price (fallback)
    updated: number;             // unix timestamp ms
  }>;
  status: string;
}

/**
 * Sleep utility for rate limiting.
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch EOD prices for a batch of tickers in a single Polygon.io API call.
 * Uses the /snapshot endpoint — 1 request handles up to ~100 tickers.
 *
 * Returns a map of ticker → TickerPrice.
 * Tickers not found or errored are omitted from the result.
 */
export async function fetchTickerPrices(tickers: string[]): Promise<Map<string, TickerPrice>> {
  const results = new Map<string, TickerPrice>();

  if (tickers.length === 0) return results;

  // Deduplicate tickers
  const unique = [...new Set(tickers.map(t => t.toUpperCase()))];

  // Polygon free tier supports comma-separated tickers on snapshot endpoint
  // Chunk into groups of 50 to stay safe, with delay between chunks
  const chunkSize = 50;
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += chunkSize) {
    chunks.push(unique.slice(i, i + chunkSize));
  }

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    try {
      const url = `${BASE_URL}/snapshot/locale/us/markets/stocks/tickers`;
      const response = await axios.get<PolygonSnapshotResponse>(url, {
        params: {
          tickers: chunk.join(','),
          apiKey: API_KEY,
        },
        timeout: 10_000,
      });

      if (response.data?.tickers) {
        for (const t of response.data.tickers) {
          // Use day close price, fall back to last trade price
          const price = t.day?.c ?? t.lastTrade?.p;
          if (price && price > 0) {
            results.set(t.ticker, {
              ticker: t.ticker,
              price: parseFloat(price.toFixed(4)),
              updatedAt: new Date(t.updated).toISOString(),
            });
          }
        }
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error(`[polygon] Chunk ${i + 1} failed:`, err.response?.data ?? err.message);
      } else {
        console.error(`[polygon] Chunk ${i + 1} error:`, err);
      }
    }

    // Rate limit: wait between chunks (not after the last one)
    if (i < chunks.length - 1) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  return results;
}

/**
 * Fetch a single ticker price. Used for on-demand lookups (e.g. when user
 * adds a new equity and wants to see current price immediately).
 */
export async function fetchSingleTicker(ticker: string): Promise<TickerPrice | null> {
  try {
    const url = `${BASE_URL}/snapshot/locale/us/markets/stocks/tickers/${ticker.toUpperCase()}`;
    const response = await axios.get(url, {
      params: { apiKey: API_KEY },
      timeout: 10_000,
    });

    const t = response.data?.ticker;
    if (!t) return null;

    const price = t.day?.c ?? t.lastTrade?.p;
    if (!price || price <= 0) return null;

    return {
      ticker: t.ticker,
      price: parseFloat(price.toFixed(4)),
      updatedAt: new Date(t.updated).toISOString(),
    };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.error(`[polygon] Single ticker ${ticker} failed:`, err.response?.data ?? err.message);
    }
    return null;
  }
}
