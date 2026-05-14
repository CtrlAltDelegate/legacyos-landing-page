const express = require('express');
const { authenticate } = require('../middleware/auth');
const { chatLimiter } = require('../middleware/rateLimiter');
const { getFloResponse } = require('../services/flo');
const { query } = require('../config/database');

const router = express.Router();
router.use(authenticate);
router.use(chatLimiter);

/**
 * POST /api/flo/chat
 *
 * Accepts { message, conversation_history } from the client.
 * Loads the user's full portfolio context from DB, passes to Flo service,
 * returns AI response with compliance disclaimer.
 */
router.post('/chat', async (req, res, next) => {
  try {
    const { message, conversation_history = [] } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }
    if (message.trim().length > 2000) {
      return res.status(400).json({ error: 'Message exceeds 2000 character limit' });
    }
    if (!Array.isArray(conversation_history)) {
      return res.status(400).json({ error: 'conversation_history must be an array' });
    }
    // Cap history at 20 turns to manage token costs
    const trimmedHistory = conversation_history.slice(-20);

    // Load portfolio context for this user
    const userId = req.user.id;
    const [userResult, summaryResult, equitiesResult, reResult, otherResult, subResult] = await Promise.all([
      query(`SELECT full_name, email, created_at FROM users WHERE id = $1`, [userId]),
      query(
        `SELECT net_worth, total_assets, total_liabilities, equities_total,
                real_estate_total, other_total, restricted_total, snapshot_date
         FROM net_worth_snapshots
         WHERE user_id = $1
         ORDER BY snapshot_date DESC LIMIT 1`,
        [userId]
      ),
      query(
        `SELECT ticker, name, shares, current_price, (shares * COALESCE(current_price,0)) AS market_value, account_type
         FROM equities WHERE user_id = $1 AND is_active = TRUE ORDER BY (shares * COALESCE(current_price,0)) DESC LIMIT 20`,
        [userId]
      ),
      query(
        `SELECT address, property_type, COALESCE(adjusted_value, estimated_value) AS value, mortgage_balance,
                (COALESCE(adjusted_value, estimated_value) - COALESCE(mortgage_balance,0)) AS equity
         FROM real_estate WHERE user_id = $1 AND is_active = TRUE`,
        [userId]
      ),
      query(
        `SELECT name, category, current_value FROM other_assets WHERE user_id = $1 AND is_active = TRUE`,
        [userId]
      ),
      query(
        `SELECT plan, status, current_period_end FROM subscriptions WHERE user_id = $1 LIMIT 1`,
        [userId]
      ),
    ]);

    const portfolioContext = {
      user: userResult.rows[0],
      subscription: subResult.rows[0],
      netWorthSnapshot: summaryResult.rows[0] || null,
      equities: equitiesResult.rows,
      realEstate: reResult.rows,
      otherAssets: otherResult.rows,
    };

    const response = await getFloResponse({
      userMessage: message.trim(),
      conversationHistory: trimmedHistory,
      portfolioContext,
    });

    res.json({
      message: response.content,
      disclaimer: response.disclaimer,
      model: response.model,
      usage: response.usage,
    });
  } catch (err) {
    if (err.status === 429) {
      return res.status(429).json({ error: 'AI service rate limit reached. Please try again in a moment.' });
    }
    next(err);
  }
});

module.exports = router;
