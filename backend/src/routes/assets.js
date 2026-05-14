const express = require('express');
const Joi = require('joi');
const { query, withTransaction } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ─── Validation Schemas ────────────────────────────────────────────────────────
const equitySchema = Joi.object({
  ticker: Joi.string().uppercase().trim().max(10).required(),
  name: Joi.string().trim().max(200).allow(null, ''),
  shares: Joi.number().positive().required(),
  cost_basis: Joi.number().min(0).allow(null),
  current_price: Joi.number().min(0).allow(null),
  account_type: Joi.string().valid('taxable', 'ira', 'roth_ira', '401k', 'other').allow(null),
  notes: Joi.string().max(1000).allow(null, ''),
});

const realEstateSchema = Joi.object({
  address: Joi.string().trim().max(500).required(),
  property_type: Joi.string()
    .valid('primary_residence', 'rental', 'commercial', 'land', 'other')
    .allow(null),
  estimated_value: Joi.number().min(0).required(),
  adjustment_percent: Joi.number().min(0).max(100).default(91.0),
  mortgage_balance: Joi.number().min(0).default(0),
  purchase_price: Joi.number().min(0).allow(null),
  purchase_date: Joi.date().allow(null),
  notes: Joi.string().max(1000).allow(null, ''),
});

const otherAssetSchema = Joi.object({
  name: Joi.string().trim().max(200).required(),
  category: Joi.string()
    .valid('business_equity', 'collectible', 'vehicle', 'cash', 'crypto', 'whole_life', 'annuity', 'other')
    .allow(null),
  current_value: Joi.number().min(0).required(),
  valuation_method: Joi.string().max(100).allow(null, ''),
  notes: Joi.string().max(1000).allow(null, ''),
});

const restrictedAssetSchema = Joi.object({
  name: Joi.string().trim().max(200).required(),
  category: Joi.string()
    .valid('unvested_equity', 'pending_inheritance', 'lawsuit_settlement', 'deferred_comp', 'other')
    .allow(null),
  estimated_value: Joi.number().min(0).allow(null),
  vest_date: Joi.date().allow(null),
  probability: Joi.number().min(0).max(100).allow(null),
  notes: Joi.string().max(1000).allow(null, ''),
});

// ─── Helper: record asset history snapshot ─────────────────────────────────────
async function recordHistory(client, userId, assetType, assetId, snapshot, source = 'manual') {
  await client.query(
    `INSERT INTO asset_history (user_id, asset_type, asset_id, snapshot, changed_by, source)
     VALUES ($1, $2, $3, $4, $1, $5)`,
    [userId, assetType, assetId, JSON.stringify(snapshot), source]
  );
}

// ─── Helper: write a net worth snapshot ───────────────────────────────────────
async function upsertNetWorthSnapshot(client, userId) {
  const result = await client.query(
    `SELECT
       COALESCE(SUM(e.shares * COALESCE(e.current_price, 0)), 0) AS equities_total
     FROM equities e
     WHERE e.user_id = $1 AND e.is_active = TRUE`,
    [userId]
  );
  const { equities_total } = result.rows[0];

  const reResult = await client.query(
    `SELECT COALESCE(SUM(COALESCE(adjusted_value, estimated_value) - COALESCE(mortgage_balance, 0)), 0) AS re_total
     FROM real_estate
     WHERE user_id = $1 AND is_active = TRUE`,
    [userId]
  );
  const { re_total } = reResult.rows[0];

  const otherResult = await client.query(
    `SELECT COALESCE(SUM(current_value), 0) AS other_total
     FROM other_assets
     WHERE user_id = $1 AND is_active = TRUE`,
    [userId]
  );
  const { other_total } = otherResult.rows[0];

  const restrictedResult = await client.query(
    `SELECT COALESCE(SUM(estimated_value), 0) AS restricted_total
     FROM restricted_assets
     WHERE user_id = $1 AND is_active = TRUE`,
    [userId]
  );
  const { restricted_total } = restrictedResult.rows[0];

  const liabilities = parseFloat(re_total) < 0
    ? Math.abs(Math.min(0, parseFloat(re_total)))
    : 0;

  const totalAssets = parseFloat(equities_total) + Math.max(0, parseFloat(re_total)) + parseFloat(other_total);
  const netWorth = totalAssets - liabilities;

  await client.query(
    `INSERT INTO net_worth_snapshots
       (user_id, total_assets, total_liabilities, net_worth, equities_total, real_estate_total, other_total, restricted_total, snapshot_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE)
     ON CONFLICT (user_id, snapshot_date) DO UPDATE SET
       total_assets = EXCLUDED.total_assets,
       total_liabilities = EXCLUDED.total_liabilities,
       net_worth = EXCLUDED.net_worth,
       equities_total = EXCLUDED.equities_total,
       real_estate_total = EXCLUDED.real_estate_total,
       other_total = EXCLUDED.other_total,
       restricted_total = EXCLUDED.restricted_total`,
    [userId, totalAssets, liabilities, netWorth, equities_total, re_total, other_total, restricted_total]
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EQUITIES
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/equities', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT *, (shares * COALESCE(current_price, 0)) AS market_value
       FROM equities
       WHERE user_id = $1 AND is_active = TRUE
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

router.post('/equities', async (req, res, next) => {
  try {
    const { error, value } = equitySchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const result = await withTransaction(async (client) => {
      const r = await client.query(
        `INSERT INTO equities (user_id, ticker, name, shares, cost_basis, current_price, account_type, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [req.user.id, value.ticker, value.name, value.shares, value.cost_basis,
         value.current_price, value.account_type, value.notes]
      );
      const asset = r.rows[0];
      await recordHistory(client, req.user.id, 'equity', asset.id, asset);
      await upsertNetWorthSnapshot(client, req.user.id);
      return asset;
    });

    res.status(201).json(result);
  } catch (err) { next(err); }
});

router.put('/equities/:id', async (req, res, next) => {
  try {
    const { error, value } = equitySchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const result = await withTransaction(async (client) => {
      const r = await client.query(
        `UPDATE equities
         SET ticker=$1, name=$2, shares=$3, cost_basis=$4, current_price=$5,
             account_type=$6, notes=$7
         WHERE id=$8 AND user_id=$9
         RETURNING *`,
        [value.ticker, value.name, value.shares, value.cost_basis, value.current_price,
         value.account_type, value.notes, req.params.id, req.user.id]
      );
      if (!r.rows[0]) throw Object.assign(new Error('Asset not found'), { status: 404 });
      await recordHistory(client, req.user.id, 'equity', r.rows[0].id, r.rows[0]);
      await upsertNetWorthSnapshot(client, req.user.id);
      return r.rows[0];
    });

    res.json(result);
  } catch (err) { next(err); }
});

router.delete('/equities/:id', async (req, res, next) => {
  try {
    await withTransaction(async (client) => {
      const r = await client.query(
        `UPDATE equities SET is_active = FALSE WHERE id = $1 AND user_id = $2 RETURNING *`,
        [req.params.id, req.user.id]
      );
      if (!r.rows[0]) throw Object.assign(new Error('Asset not found'), { status: 404 });
      await upsertNetWorthSnapshot(client, req.user.id);
    });
    res.json({ message: 'Asset removed' });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// REAL ESTATE
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/real-estate', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM real_estate WHERE user_id = $1 AND is_active = TRUE ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

router.post('/real-estate', async (req, res, next) => {
  try {
    const { error, value } = realEstateSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const adjustedValue = value.estimated_value * (value.adjustment_percent / 100);

    const result = await withTransaction(async (client) => {
      const r = await client.query(
        `INSERT INTO real_estate
           (user_id, address, property_type, estimated_value, adjusted_value, adjustment_percent,
            mortgage_balance, purchase_price, purchase_date, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING *`,
        [req.user.id, value.address, value.property_type, value.estimated_value, adjustedValue,
         value.adjustment_percent, value.mortgage_balance, value.purchase_price,
         value.purchase_date, value.notes]
      );
      const asset = r.rows[0];
      await recordHistory(client, req.user.id, 'real_estate', asset.id, asset);
      await upsertNetWorthSnapshot(client, req.user.id);
      return asset;
    });

    res.status(201).json(result);
  } catch (err) { next(err); }
});

router.put('/real-estate/:id', async (req, res, next) => {
  try {
    const { error, value } = realEstateSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const adjustedValue = value.estimated_value * (value.adjustment_percent / 100);

    const result = await withTransaction(async (client) => {
      const r = await client.query(
        `UPDATE real_estate
         SET address=$1, property_type=$2, estimated_value=$3, adjusted_value=$4,
             adjustment_percent=$5, mortgage_balance=$6, purchase_price=$7, purchase_date=$8, notes=$9
         WHERE id=$10 AND user_id=$11
         RETURNING *`,
        [value.address, value.property_type, value.estimated_value, adjustedValue,
         value.adjustment_percent, value.mortgage_balance, value.purchase_price,
         value.purchase_date, value.notes, req.params.id, req.user.id]
      );
      if (!r.rows[0]) throw Object.assign(new Error('Asset not found'), { status: 404 });
      await recordHistory(client, req.user.id, 'real_estate', r.rows[0].id, r.rows[0]);
      await upsertNetWorthSnapshot(client, req.user.id);
      return r.rows[0];
    });

    res.json(result);
  } catch (err) { next(err); }
});

router.delete('/real-estate/:id', async (req, res, next) => {
  try {
    await withTransaction(async (client) => {
      const r = await client.query(
        `UPDATE real_estate SET is_active = FALSE WHERE id = $1 AND user_id = $2 RETURNING id`,
        [req.params.id, req.user.id]
      );
      if (!r.rows[0]) throw Object.assign(new Error('Asset not found'), { status: 404 });
      await upsertNetWorthSnapshot(client, req.user.id);
    });
    res.json({ message: 'Property removed' });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// OTHER ASSETS
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/other', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM other_assets WHERE user_id = $1 AND is_active = TRUE ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

router.post('/other', async (req, res, next) => {
  try {
    const { error, value } = otherAssetSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const result = await withTransaction(async (client) => {
      const r = await client.query(
        `INSERT INTO other_assets (user_id, name, category, current_value, valuation_method, notes)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [req.user.id, value.name, value.category, value.current_value,
         value.valuation_method, value.notes]
      );
      const asset = r.rows[0];
      await recordHistory(client, req.user.id, 'other', asset.id, asset);
      await upsertNetWorthSnapshot(client, req.user.id);
      return asset;
    });

    res.status(201).json(result);
  } catch (err) { next(err); }
});

router.put('/other/:id', async (req, res, next) => {
  try {
    const { error, value } = otherAssetSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const result = await withTransaction(async (client) => {
      const r = await client.query(
        `UPDATE other_assets
         SET name=$1, category=$2, current_value=$3, valuation_method=$4, notes=$5
         WHERE id=$6 AND user_id=$7 RETURNING *`,
        [value.name, value.category, value.current_value, value.valuation_method,
         value.notes, req.params.id, req.user.id]
      );
      if (!r.rows[0]) throw Object.assign(new Error('Asset not found'), { status: 404 });
      await recordHistory(client, req.user.id, 'other', r.rows[0].id, r.rows[0]);
      await upsertNetWorthSnapshot(client, req.user.id);
      return r.rows[0];
    });

    res.json(result);
  } catch (err) { next(err); }
});

router.delete('/other/:id', async (req, res, next) => {
  try {
    await withTransaction(async (client) => {
      const r = await client.query(
        `UPDATE other_assets SET is_active = FALSE WHERE id = $1 AND user_id = $2 RETURNING id`,
        [req.params.id, req.user.id]
      );
      if (!r.rows[0]) throw Object.assign(new Error('Asset not found'), { status: 404 });
      await upsertNetWorthSnapshot(client, req.user.id);
    });
    res.json({ message: 'Asset removed' });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// RESTRICTED ASSETS
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/restricted', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM restricted_assets WHERE user_id = $1 AND is_active = TRUE ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

router.post('/restricted', async (req, res, next) => {
  try {
    const { error, value } = restrictedAssetSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const result = await withTransaction(async (client) => {
      const r = await client.query(
        `INSERT INTO restricted_assets (user_id, name, category, estimated_value, vest_date, probability, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [req.user.id, value.name, value.category, value.estimated_value,
         value.vest_date, value.probability, value.notes]
      );
      const asset = r.rows[0];
      await recordHistory(client, req.user.id, 'restricted', asset.id, asset);
      await upsertNetWorthSnapshot(client, req.user.id);
      return asset;
    });

    res.status(201).json(result);
  } catch (err) { next(err); }
});

router.put('/restricted/:id', async (req, res, next) => {
  try {
    const { error, value } = restrictedAssetSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const result = await withTransaction(async (client) => {
      const r = await client.query(
        `UPDATE restricted_assets
         SET name=$1, category=$2, estimated_value=$3, vest_date=$4, probability=$5, notes=$6
         WHERE id=$7 AND user_id=$8 RETURNING *`,
        [value.name, value.category, value.estimated_value, value.vest_date,
         value.probability, value.notes, req.params.id, req.user.id]
      );
      if (!r.rows[0]) throw Object.assign(new Error('Asset not found'), { status: 404 });
      await recordHistory(client, req.user.id, 'restricted', r.rows[0].id, r.rows[0]);
      await upsertNetWorthSnapshot(client, req.user.id);
      return r.rows[0];
    });

    res.json(result);
  } catch (err) { next(err); }
});

router.delete('/restricted/:id', async (req, res, next) => {
  try {
    await withTransaction(async (client) => {
      const r = await client.query(
        `UPDATE restricted_assets SET is_active = FALSE WHERE id = $1 AND user_id = $2 RETURNING id`,
        [req.params.id, req.user.id]
      );
      if (!r.rows[0]) throw Object.assign(new Error('Asset not found'), { status: 404 });
      await upsertNetWorthSnapshot(client, req.user.id);
    });
    res.json({ message: 'Asset removed' });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY — GET /api/assets/summary
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/summary', async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [equitiesResult, reResult, otherResult, restrictedResult] = await Promise.all([
      query(
        `SELECT
           COUNT(*) AS count,
           COALESCE(SUM(shares * COALESCE(current_price, 0)), 0) AS total_value,
           COALESCE(SUM(cost_basis * shares), 0) AS total_cost_basis
         FROM equities
         WHERE user_id = $1 AND is_active = TRUE`,
        [userId]
      ),
      query(
        `SELECT
           COUNT(*) AS count,
           COALESCE(SUM(COALESCE(adjusted_value, estimated_value) - COALESCE(mortgage_balance, 0)), 0) AS total_equity,
           COALESCE(SUM(COALESCE(adjusted_value, estimated_value)), 0) AS total_value,
           COALESCE(SUM(COALESCE(mortgage_balance, 0)), 0) AS total_liabilities
         FROM real_estate
         WHERE user_id = $1 AND is_active = TRUE`,
        [userId]
      ),
      query(
        `SELECT COUNT(*) AS count, COALESCE(SUM(current_value), 0) AS total_value
         FROM other_assets
         WHERE user_id = $1 AND is_active = TRUE`,
        [userId]
      ),
      query(
        `SELECT COUNT(*) AS count, COALESCE(SUM(estimated_value), 0) AS total_value
         FROM restricted_assets
         WHERE user_id = $1 AND is_active = TRUE`,
        [userId]
      ),
    ]);

    const equities = equitiesResult.rows[0];
    const re = reResult.rows[0];
    const other = otherResult.rows[0];
    const restricted = restrictedResult.rows[0];

    const totalAssets =
      parseFloat(equities.total_value) +
      Math.max(0, parseFloat(re.total_equity)) +
      parseFloat(other.total_value);
    const totalLiabilities = parseFloat(re.total_liabilities);
    const netWorth = totalAssets - totalLiabilities;

    res.json({
      net_worth: netWorth,
      total_assets: totalAssets,
      total_liabilities: totalLiabilities,
      equities: {
        count: parseInt(equities.count),
        total_value: parseFloat(equities.total_value),
        total_cost_basis: parseFloat(equities.total_cost_basis),
        unrealized_gain: parseFloat(equities.total_value) - parseFloat(equities.total_cost_basis),
      },
      real_estate: {
        count: parseInt(re.count),
        total_value: parseFloat(re.total_value),
        total_equity: parseFloat(re.total_equity),
        total_liabilities: parseFloat(re.total_liabilities),
      },
      other: {
        count: parseInt(other.count),
        total_value: parseFloat(other.total_value),
      },
      restricted: {
        count: parseInt(restricted.count),
        total_value: parseFloat(restricted.total_value),
        note: 'Restricted assets are tracked separately and excluded from net worth calculations',
      },
    });
  } catch (err) { next(err); }
});

// ─── GET /api/assets/history ──────────────────────────────────────────────────
router.get('/history', async (req, res, next) => {
  try {
    const { limit = 30, asset_type, asset_id } = req.query;

    let sql = `
      SELECT asset_type, asset_id, snapshot, source, created_at
      FROM asset_history
      WHERE user_id = $1
    `;
    const params = [req.user.id];

    if (asset_type) {
      params.push(asset_type);
      sql += ` AND asset_type = $${params.length}`;
    }
    if (asset_id) {
      params.push(asset_id);
      sql += ` AND asset_id = $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(Math.min(parseInt(limit, 10) || 30, 200));

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) { next(err); }
});

// ─── GET /api/snapshots ────────────────────────────────────────────────────────
router.get('/snapshots', async (req, res, next) => {
  try {
    const { months = 12 } = req.query;
    const result = await query(
      `SELECT snapshot_date, net_worth, total_assets, total_liabilities,
              equities_total, real_estate_total, other_total, restricted_total
       FROM net_worth_snapshots
       WHERE user_id = $1
         AND snapshot_date >= CURRENT_DATE - INTERVAL '1 month' * $2
       ORDER BY snapshot_date ASC`,
      [req.user.id, parseInt(months, 10) || 12]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

module.exports = router;
