import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { WINGS, WING_ORDER } from '../config/wingSteps';

const router = Router();
router.use(requireAuth, requireAdmin);

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
// List all users with plan, admin status, wing assessment counts.

router.get('/users', async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        plan: true,
        isAdmin: true,
        onboardingComplete: true,
        createdAt: true,
        _count: { select: { wingAssessments: true, assets: true } },
      },
    });
    res.json({ users });
  } catch (err) {
    console.error('[admin GET /users]', err);
    res.status(500).json({ error: 'Failed to load users.' });
  }
});

// ─── PATCH /api/admin/users/:id ───────────────────────────────────────────────
// Update a user's plan or admin status.

router.patch('/users/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { plan, isAdmin } = req.body as { plan?: string; isAdmin?: boolean };

  const validPlans = ['free', 'core', 'premium'];
  if (plan !== undefined && !validPlans.includes(plan)) {
    res.status(400).json({ error: 'Invalid plan. Must be free, core, or premium.' });
    return;
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(plan !== undefined && { plan }),
        ...(isAdmin !== undefined && { isAdmin }),
      },
      select: { id: true, email: true, plan: true, isAdmin: true },
    });
    res.json({ user });
  } catch (err: any) {
    if (err?.code === 'P2025') {
      res.status(404).json({ error: 'User not found.' });
    } else {
      console.error('[admin PATCH /users/:id]', err);
      res.status(500).json({ error: 'Failed to update user.' });
    }
  }
});

// ─── GET /api/admin/affiliate-links ──────────────────────────────────────────
// Return all affiliate-eligible wing steps merged with any DB overrides.

router.get('/affiliate-links', async (_req: Request, res: Response) => {
  try {
    const dbLinks = await prisma.affiliateLink.findMany();
    const overrideMap = Object.fromEntries(
      dbLinks.map((l) => [`${l.wingId}:${l.level}`, l])
    );

    const links = WING_ORDER.flatMap((wingId) => {
      const cfg = WINGS[wingId];
      return cfg.steps
        .filter((step) => step.isAffiliate)
        .map((step) => {
          const key = `${wingId}:${step.level}`;
          const override = overrideMap[key];
          return {
            wingId,
            wingName: cfg.name,
            wingEmoji: cfg.emoji,
            level: step.level,
            productName: override?.productName ?? step.actionLabel,
            actionLabel: override?.actionLabel ?? step.actionLabel,
            actionUrl: override?.actionUrl ?? step.actionUrl,
            isActive: override?.isActive ?? true,
            hasOverride: !!override,
          };
        });
    });

    res.json({ links });
  } catch (err) {
    console.error('[admin GET /affiliate-links]', err);
    res.status(500).json({ error: 'Failed to load affiliate links.' });
  }
});

// ─── PUT /api/admin/affiliate-links/:wingId/:level ────────────────────────────
// Upsert a DB override for a specific wing step's affiliate link.

router.put('/affiliate-links/:wingId/:level', async (req: Request, res: Response) => {
  const wingId = req.params.wingId;
  const level = parseInt(req.params.level, 10);

  if (!WINGS[wingId as keyof typeof WINGS]) {
    res.status(400).json({ error: 'Invalid wingId.' });
    return;
  }
  if (isNaN(level) || level < 0 || level > 3) {
    res.status(400).json({ error: 'Level must be 0–3.' });
    return;
  }

  const { productName, actionLabel, actionUrl, isActive } = req.body as {
    productName?: string;
    actionLabel?: string;
    actionUrl?: string;
    isActive?: boolean;
  };

  if (!actionUrl) {
    res.status(400).json({ error: 'actionUrl is required.' });
    return;
  }

  try {
    const cfg = WINGS[wingId as keyof typeof WINGS];
    const step = cfg.steps.find((s) => s.level === level);
    const link = await prisma.affiliateLink.upsert({
      where: { wingId_level: { wingId, level } },
      create: {
        wingId,
        level,
        productName: productName ?? step?.actionLabel ?? '',
        actionLabel: actionLabel ?? step?.actionLabel ?? '',
        actionUrl,
        isActive: isActive ?? true,
      },
      update: {
        ...(productName !== undefined && { productName }),
        ...(actionLabel !== undefined && { actionLabel }),
        actionUrl,
        ...(isActive !== undefined && { isActive }),
      },
    });
    res.json({ link });
  } catch (err) {
    console.error('[admin PUT /affiliate-links]', err);
    res.status(500).json({ error: 'Failed to save affiliate link.' });
  }
});

// ─── DELETE /api/admin/affiliate-links/:wingId/:level ─────────────────────────
// Remove a DB override — reverts to the static config URL.

router.delete('/affiliate-links/:wingId/:level', async (req: Request, res: Response) => {
  const wingId = req.params.wingId;
  const level = parseInt(req.params.level, 10);

  try {
    await prisma.affiliateLink.delete({
      where: { wingId_level: { wingId, level } },
    });
    res.json({ message: 'Override removed. Static config URL restored.' });
  } catch (err: any) {
    if (err?.code === 'P2025') {
      res.status(404).json({ error: 'No override found for this wing/level.' });
    } else {
      console.error('[admin DELETE /affiliate-links]', err);
      res.status(500).json({ error: 'Failed to delete override.' });
    }
  }
});

export default router;
