import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// All user routes require auth
router.use(requireAuth);

// ─── Validation schemas ───────────────────────────────────────────────────────

const updateProfileSchema = Joi.object({
  fullName: Joi.string().max(255).optional(),
  email: Joi.string().email().lowercase().optional(),
});

const updateTaxRateSchema = Joi.object({
  assumedTaxRate: Joi.number().min(0).max(60).required(),
});

// ─── GET /api/user/profile ────────────────────────────────────────────────────

router.get('/profile', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        plan: true,
        assumedTaxRate: true,
        onboardingComplete: true,
        createdAt: true,
        stripeCustomerId: true,
        goals: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    res.json({ user });
  } catch (err) {
    console.error('[user/profile GET]', err);
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// ─── PUT /api/user/profile ────────────────────────────────────────────────────

router.put('/profile', validate(updateProfileSchema), async (req: Request, res: Response) => {
  const { fullName, email } = req.body;

  try {
    // Check email uniqueness if changing
    if (email) {
      const existing = await prisma.user.findFirst({
        where: { email, NOT: { id: req.user!.userId } },
      });
      if (existing) {
        res.status(409).json({ error: 'Email already in use.' });
        return;
      }
    }

    const updated = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        ...(fullName !== undefined && { fullName }),
        ...(email !== undefined && { email }),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        plan: true,
        assumedTaxRate: true,
        onboardingComplete: true,
      },
    });

    res.json({ user: updated });
  } catch (err) {
    console.error('[user/profile PUT]', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// ─── PUT /api/user/tax-rate ───────────────────────────────────────────────────
// Updates the assumed tax rate used for pre-tax retirement account discounting

router.put('/tax-rate', validate(updateTaxRateSchema), async (req: Request, res: Response) => {
  const { assumedTaxRate } = req.body;

  try {
    const updated = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { assumedTaxRate },
      select: { id: true, assumedTaxRate: true },
    });

    res.json({
      message: 'Tax rate updated.',
      assumedTaxRate: updated.assumedTaxRate,
    });
  } catch (err) {
    console.error('[user/tax-rate]', err);
    res.status(500).json({ error: 'Failed to update tax rate.' });
  }
});

export default router;
