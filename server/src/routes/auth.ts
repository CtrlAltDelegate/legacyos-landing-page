import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthPayload } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { rateLimit } from 'express-rate-limit';

const router = Router();

// Strict rate limit on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: { error: 'Too many attempts, please try again in 15 minutes.' },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function signAccessToken(payload: AuthPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '15m' });
}

function signRefreshToken(payload: AuthPayload): string {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' });
}

function safeUser(user: { id: string; email: string; fullName: string | null; plan: string; assumedTaxRate: unknown; onboardingComplete: boolean; createdAt: Date }) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    plan: user.plan,
    assumedTaxRate: user.assumedTaxRate,
    onboardingComplete: user.onboardingComplete,
    createdAt: user.createdAt,
  };
}

// ─── Validation schemas ───────────────────────────────────────────────────────

const registerSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().min(8).max(128).required(),
  fullName: Joi.string().max(255).optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().required(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────

router.post('/register', authLimiter, validate(registerSchema), async (req: Request, res: Response) => {
  const { email, password, fullName } = req.body;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: fullName || null,
        plan: 'free',
      },
    });

    const payload: AuthPayload = { userId: user.id, email: user.email, plan: user.plan };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Store hashed refresh token
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: await bcrypt.hash(refreshToken, 8) },
    });

    res.status(201).json({
      accessToken,
      refreshToken,
      user: safeUser(user),
    });
  } catch (err) {
    console.error('[auth/register]', err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

router.post('/login', authLimiter, validate(loginSchema), async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    // Constant-time comparison to avoid user enumeration
    const passwordMatch = user
      ? await bcrypt.compare(password, user.passwordHash)
      : await bcrypt.compare(password, '$2a$12$invalidhashfortimingprotection00000000000000000000');

    if (!user || !passwordMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const payload: AuthPayload = { userId: user.id, email: user.email, plan: user.plan };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: await bcrypt.hash(refreshToken, 8) },
    });

    res.json({
      accessToken,
      refreshToken,
      user: safeUser(user),
    });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────

router.post('/refresh', validate(refreshSchema), async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as AuthPayload;

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user?.refreshToken) {
      res.status(401).json({ error: 'Invalid refresh token.' });
      return;
    }

    const tokenMatch = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!tokenMatch) {
      res.status(401).json({ error: 'Invalid refresh token.' });
      return;
    }

    const newPayload: AuthPayload = { userId: user.id, email: user.email, plan: user.plan };
    const newAccessToken = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: await bcrypt.hash(newRefreshToken, 8) },
    });

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid or expired refresh token.' });
    } else {
      console.error('[auth/refresh]', err);
      res.status(500).json({ error: 'Token refresh failed.' });
    }
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

router.post('/logout', requireAuth, async (req: Request, res: Response) => {
  try {
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { refreshToken: null },
    });
    res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    console.error('[auth/logout]', err);
    res.status(500).json({ error: 'Logout failed.' });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    res.json({ user: safeUser(user) });
  } catch (err) {
    console.error('[auth/me]', err);
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
});

export default router;
