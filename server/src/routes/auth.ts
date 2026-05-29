import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthPayload } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { rateLimit } from 'express-rate-limit';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email';

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

function safeUser(user: {
  id: string; email: string; fullName: string | null; plan: string;
  assumedTaxRate: unknown; onboardingComplete: boolean; isAdmin: boolean;
  createdAt: Date; emailVerifiedAt: Date | null;
}) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    plan: user.plan,
    assumedTaxRate: user.assumedTaxRate,
    onboardingComplete: user.onboardingComplete,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt,
    emailVerified: !!user.emailVerifiedAt,
  };
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ─── Validation schemas ───────────────────────────────────────────────────────

const registerSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().min(8).max(128).required(),
  fullName: Joi.string().max(255).optional(),
  referralCode: Joi.string().max(20).optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().required(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(8).max(128).required(),
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────

router.post('/register', authLimiter, validate(registerSchema), async (req: Request, res: Response) => {
  const { email, password, fullName, referralCode } = req.body;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verificationToken = generateToken();

    // Resolve referral code → referrer
    let referrerId: string | null = null;
    if (referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: String(referralCode).toUpperCase() },
        select: { id: true },
      });
      referrerId = referrer?.id ?? null;
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: fullName || null,
        plan: 'free',
        emailVerificationToken: verificationToken,
        referredBy: referrerId,
      },
    });

    // Record referral
    if (referrerId) {
      await prisma.referral.create({
        data: { referrerId, referredEmail: email },
      }).catch(() => { /* non-blocking */ });
    }

    const payload: AuthPayload = { userId: user.id, email: user.email, plan: user.plan, isAdmin: user.isAdmin };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: await bcrypt.hash(refreshToken, 8) },
    });

    // Send verification email (non-blocking — don't fail registration if email fails)
    sendVerificationEmail(email, verificationToken).catch((err) =>
      console.error('[auth/register] verification email failed:', err)
    );

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

    const payload: AuthPayload = { userId: user.id, email: user.email, plan: user.plan, isAdmin: user.isAdmin };
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

    const newPayload: AuthPayload = { userId: user.id, email: user.email, plan: user.plan, isAdmin: user.isAdmin };
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

// ─── GET /api/auth/verify-email ───────────────────────────────────────────────
// Called when user clicks the link in their verification email.

router.get('/verify-email', async (req: Request, res: Response) => {
  const { token } = req.query;
  if (!token || typeof token !== 'string') {
    res.status(400).json({ error: 'Invalid verification token.' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      res.status(400).json({ error: 'Verification token is invalid or has already been used.' });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date(), emailVerificationToken: null },
    });

    res.json({ message: 'Email verified successfully.' });
  } catch (err) {
    console.error('[auth/verify-email]', err);
    res.status(500).json({ error: 'Email verification failed.' });
  }
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
// Always returns 200 to avoid user enumeration.

router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const token = generateToken();
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: token, passwordResetExpiry: expiry },
      });

      sendPasswordResetEmail(email, token).catch((err) =>
        console.error('[auth/forgot-password] email failed:', err)
      );
    }

    // Always return 200 — don't reveal whether the email exists
    res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
  } catch (err) {
    console.error('[auth/forgot-password]', err);
    res.status(500).json({ error: 'Failed to process reset request.' });
  }
});

// ─── POST /api/auth/reset-password ───────────────────────────────────────────

router.post('/reset-password', authLimiter, validate(resetPasswordSchema), async (req: Request, res: Response) => {
  const { token, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { passwordResetToken: token },
    });

    if (!user || !user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
      res.status(400).json({ error: 'Reset token is invalid or has expired.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
        refreshToken: null, // invalidate all existing sessions
      },
    });

    res.json({ message: 'Password reset successfully. Please log in with your new password.' });
  } catch (err) {
    console.error('[auth/reset-password]', err);
    res.status(500).json({ error: 'Password reset failed.' });
  }
});

// ─── POST /api/auth/resend-verification ──────────────────────────────────────

router.post('/resend-verification', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) { res.status(404).json({ error: 'User not found.' }); return; }
    if (user.emailVerifiedAt) { res.json({ message: 'Email is already verified.' }); return; }

    const token = generateToken();
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerificationToken: token },
    });

    await sendVerificationEmail(user.email, token);
    res.json({ message: 'Verification email sent.' });
  } catch (err) {
    console.error('[auth/resend-verification]', err);
    res.status(500).json({ error: 'Failed to resend verification email.' });
  }
});

export default router;
