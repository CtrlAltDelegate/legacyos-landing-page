const express = require('express');
const axios = require('axios');
const { authenticate } = require('../middleware/auth');
const { query } = require('../config/database');

const router = express.Router();
router.use(authenticate);

// Simple in-memory cache to avoid hammering Polygon.io on the free tier
const quoteCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached(ticker) {
  const entry = quoteCache.get(ticker);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    quoteCache.delete(ticker);
    return null;
  }
  return entry.data;
}

function setCache(ticker, data) {
  quoteCache.set(ticker, { data, timestamp: Date.now() });
}

// ─── GET /api/equity/quote/:ticker ────────────────────────────────────────────
router.get('/quote/:ticker', async (req, res, next) => {
  try {
    const ticker = req.params.ticker.toUpperCase().replace(/[^A-Z.]/g, '');
    if (!ticker || ticker.length > 10) {
      return res.status(400).json({ error: 'Invalid ticker symbol' });
    }

    const cached = getCached(ticker);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const apiKey = process.env.POLYGON_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'Equity quotes not configured' });
    }

    // Polygon.io previous close endpoint (free tier compatible)
    const response = await axios.get(
      `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev`,
      {
        params: { adjusted: 'true', apiKey },
        timeout: 8000,
      }
    );

    if (response.data.resultsCount === 0) {
      return res.status(404).json({ error: `No quote data found for ${ticker}` });
    }

    const bar = response.data.results[0];
    const data = {
      ticker,
      close: bar.c,
      open: bar.o,
      high: bar.h,
      low: bar.l,
      volume: bar.v,
      date: new Date(bar.t).toISOString().split('T')[0],
      source: 'polygon',
    };

    setCache(ticker, data);

    // Optionally update the equity price in DB if user has this ticker
    query(
      `UPDATE equities
       SET current_price = $1, price_updated_at = NOW()
       WHERE user_id = $2 AND ticker = $3 AND is_active = TRUE`,
      [data.close, req.user.id, ticker]
    ).catch((err) => console.error('[Equity] Price update error:', err.message));

    res.json(data);
  } catch (err) {
    if (err.response?.status === 403) {
      return res.status(403).json({ error: 'Invalid Polygon.io API key' });
    }
    if (err.response?.status === 429) {
      return res.status(429).json({ error: 'Equity quote rate limit reached. Free tier allows 5 calls/minute.' });
    }
    next(err);
  }
});

// ─── POST /api/equity/refresh-prices ─────────────────────────────────────────
// Refresh prices for all of the user's equity holdings
router.post('/refresh-prices', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT DISTINCT ticker FROM equities WHERE user_id = $1 AND is_active = TRUE`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.json({ message: 'No equities to refresh', updated: 0 });
    }

    const apiKey = process.env.POLYGON_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'Equity quotes not configured' });
    }

    const updates = [];
    const errors = [];

    for (const { ticker } of result.rows) {
      try {
        const cached = getCached(ticker);
        if (cached) {
          updates.push({ ticker, price: cached.close, source: 'cache' });
          continue;
        }

        // Throttle requests on free tier (5 calls/min = 1 per 200ms)
        await new Promise((resolve) => setTimeout(resolve, 250));

        const response = await axios.get(
          `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev`,
          { params: { adjusted: 'true', apiKey }, timeout: 8000 }
        );

        if (response.data.resultsCount > 0) {
          const bar = response.data.results[0];
          const data = {
            ticker,
            close: bar.c,
            open: bar.o,
            high: bar.h,
            low: bar.l,
            volume: bar.v,
            date: new Date(bar.t).toISOString().split('T')[0],
            source: 'polygon',
          };
          setCache(ticker, data);

          await query(
            `UPDATE equities
             SET current_price = $1, price_updated_at = NOW()
             WHERE user_id = $2 AND ticker = $3 AND is_active = TRUE`,
            [bar.c, req.user.id, ticker]
          );
          updates.push({ ticker, price: bar.c, source: 'polygon' });
        }
      } catch (tickerErr) {
        errors.push({ ticker, error: tickerErr.message });
      }
    }

    res.json({ updated: updates.length, updates, errors: errors.length > 0 ? errors : undefined });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
