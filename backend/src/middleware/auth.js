const jwt = require('jsonwebtoken');

/**
 * Middleware to verify JWT access tokens.
 * Attaches { id, email, role } to req.user on success.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Access token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid access token' });
  }
}

/**
 * Middleware factory to restrict access by role.
 * @param {...string} roles - allowed roles
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

/**
 * Middleware to require a paid subscription plan.
 * Reads subscription from DB; must be used after authenticate().
 */
function requirePlan(...plans) {
  const { query } = require('../config/database');
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const result = await query(
        'SELECT plan, status FROM subscriptions WHERE user_id = $1 LIMIT 1',
        [req.user.id]
      );
      const sub = result.rows[0];
      if (!sub || !plans.includes(sub.plan) || sub.status !== 'active') {
        return res.status(403).json({
          error: 'This feature requires a paid subscription',
          code: 'PLAN_REQUIRED',
          required: plans,
        });
      }
      req.subscription = sub;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { authenticate, requireRole, requirePlan };
