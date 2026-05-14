const express = require('express');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const { query, withTransaction } = require('../config/database');
const { authLimiter } = require('../middleware/rateLimiter');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ─── Validation schemas ────────────────────────────────────────────────────────
const registerSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().max(255).required(),
  password: Joi.string().min(8).max(128).required(),
  full_name: Joi.string().trim().min(2).max(100).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().required(),
});

// ─── Token helpers ─────────────────────────────────────────────────────────────
function generateTokens(user) {
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );
  const refreshToken = jwt.sign(
    { sub: user.id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  return { accessToken, refreshToken };
}

// ─── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { email, password, full_name } = value;

    // Check for existing user
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,   // 64 MB
      timeCost: 3,
      parallelism: 4,
    });

    const user = await withTransaction(async (client) => {
      // Create user
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, full_name)
         VALUES ($1, $2, $3)
         RETURNING id, email, full_name, role, created_at`,
        [email, passwordHash, full_name]
      );
      const newUser = userResult.rows[0];

      // Create free subscription
      await client.query(
        `INSERT INTO subscriptions (user_id, plan, status)
         VALUES ($1, 'free', 'active')`,
        [newUser.id]
      );

      return newUser;
    });

    const { accessToken, refreshToken } = generateTokens(user);

    // Store hashed refresh token
    const refreshTokenHash = await argon2.hash(refreshToken, {
      type: argon2.argon2id,
      memoryCost: 32768,
      timeCost: 2,
      parallelism: 2,
    });
    await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [refreshTokenHash, user.id]);

    res.status(201).json({
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { email, password } = value;

    const result = await query(
      'SELECT id, email, password_hash, full_name, role FROM users WHERE email = $1',
      [email]
    );
    const user = result.rows[0];

    // Constant-time response to prevent user enumeration
    if (!user) {
      await argon2.hash('dummy-password-to-prevent-timing-attack');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await argon2.verify(user.password_hash, password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { accessToken, refreshToken } = generateTokens(user);

    const refreshTokenHash = await argon2.hash(refreshToken, {
      type: argon2.argon2id,
      memoryCost: 32768,
      timeCost: 2,
      parallelism: 2,
    });
    await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [refreshTokenHash, user.id]);

    res.json({
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/refresh ────────────────────────────────────────────────────
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    if (payload.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    const result = await query(
      'SELECT id, email, full_name, role, refresh_token FROM users WHERE id = $1',
      [payload.sub]
    );
    const user = result.rows[0];

    if (!user || !user.refresh_token) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    const isValid = await argon2.verify(user.refresh_token, refreshToken);
    if (!isValid) {
      // Possible token reuse attack — revoke all
      await query('UPDATE users SET refresh_token = NULL WHERE id = $1', [user.id]);
      return res.status(401).json({ error: 'Token reuse detected. Please log in again.' });
    }

    const tokens = generateTokens(user);
    const newHash = await argon2.hash(tokens.refreshToken, {
      type: argon2.argon2id,
      memoryCost: 32768,
      timeCost: 2,
      parallelism: 2,
    });
    await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [newHash, user.id]);

    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await query('UPDATE users SET refresh_token = NULL WHERE id = $1', [req.user.id]);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.full_name, u.role, u.created_at,
              s.plan, s.status as subscription_status, s.current_period_end
       FROM users u
       LEFT JOIN subscriptions s ON s.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
