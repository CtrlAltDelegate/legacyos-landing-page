import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { WINGS, WING_ORDER, calculateLevel, WingId, WingStep } from '../config/wingSteps';

/** Apply any admin-managed affiliate link overrides to a step array. */
async function applyAffiliateOverrides(wingId: string, steps: WingStep[]): Promise<WingStep[]> {
  const overrides = await prisma.affiliateLink.findMany({
    where: { wingId, isActive: true },
  });
  if (overrides.length === 0) return steps;
  const overrideMap = Object.fromEntries(overrides.map((o) => [o.level, o]));
  return steps.map((step) => {
    const o = overrideMap[step.level];
    if (!o) return step;
    return { ...step, actionLabel: o.actionLabel, actionUrl: o.actionUrl };
  });
}

const router = Router();
router.use(requireAuth);

// ─── GET /api/wings ───────────────────────────────────────────────────────────
// Return all six wing configs + user's saved assessment levels.
// Unauthenticated wings default to level 0.

router.get('/', async (req: Request, res: Response) => {
  try {
    const assessments = await prisma.wingAssessment.findMany({
      where: { userId: req.user!.userId },
    });

    const assessmentMap = Object.fromEntries(
      assessments.map((a) => [a.wing, { level: a.level, answers: a.answers, completedAt: a.completedAt }])
    );

    const wings = await Promise.all(WING_ORDER.map(async (wingId) => {
      const cfg = WINGS[wingId];
      const saved = assessmentMap[wingId];
      const level = saved?.level ?? 0;
      const steps = await applyAffiliateOverrides(wingId, cfg.steps);
      const step = steps[level] ?? steps[steps.length - 1];

      return {
        id: cfg.id,
        name: cfg.name,
        emoji: cfg.emoji,
        tagline: cfg.tagline,
        philosophy: cfg.philosophy,
        color: cfg.color,
        level,
        levelLabel: ['Foundation', 'Building', 'Established', 'Advanced'][level] ?? 'Advanced',
        assessed: !!saved?.completedAt,
        nextStep: step,
        questions: cfg.questions,
        answers: (saved?.answers as Record<string, boolean>) ?? {},
      };
    }));

    res.json({ wings });
  } catch (err) {
    console.error('[wings GET /]', err);
    res.status(500).json({ error: 'Failed to load wings.' });
  }
});

// ─── GET /api/wings/:wing ─────────────────────────────────────────────────────
// Return config + assessment for a single wing.

router.get('/:wing', async (req: Request, res: Response) => {
  const wingId = req.params.wing as WingId;

  if (!WINGS[wingId]) {
    res.status(404).json({ error: 'Wing not found.' });
    return;
  }

  try {
    const cfg = WINGS[wingId];
    const saved = await prisma.wingAssessment.findUnique({
      where: { userId_wing: { userId: req.user!.userId, wing: wingId } },
    });

    const level = saved?.level ?? 0;
    const steps = await applyAffiliateOverrides(wingId, cfg.steps);
    const step = steps[level] ?? steps[steps.length - 1];

    res.json({
      id: cfg.id,
      name: cfg.name,
      emoji: cfg.emoji,
      tagline: cfg.tagline,
      philosophy: cfg.philosophy,
      color: cfg.color,
      level,
      levelLabel: ['Foundation', 'Building', 'Established', 'Advanced'][level] ?? 'Advanced',
      assessed: !!saved?.completedAt,
      steps,
      nextStep: step,
      questions: cfg.questions,
      answers: (saved?.answers as Record<string, boolean>) ?? {},
    });
  } catch (err) {
    console.error('[wings GET /:wing]', err);
    res.status(500).json({ error: 'Failed to load wing.' });
  }
});

// ─── POST /api/wings/:wing/assess ─────────────────────────────────────────────
// Submit assessment answers → calculates + stores level.

router.post('/:wing/assess', async (req: Request, res: Response) => {
  const wingId = req.params.wing as WingId;

  if (!WINGS[wingId]) {
    res.status(404).json({ error: 'Wing not found.' });
    return;
  }

  const { answers } = req.body as { answers?: Record<string, boolean> };

  if (!answers || typeof answers !== 'object') {
    res.status(400).json({ error: 'answers object is required.' });
    return;
  }

  // Validate that answers only contain known question IDs
  const cfg = WINGS[wingId];
  const validIds = new Set(cfg.questions.map((q) => q.id));
  const sanitized: Record<string, boolean> = {};
  for (const [key, val] of Object.entries(answers)) {
    if (validIds.has(key)) sanitized[key] = Boolean(val);
  }

  const level = calculateLevel(sanitized);
  const step = cfg.steps[level] ?? cfg.steps[cfg.steps.length - 1];

  try {
    const assessment = await prisma.wingAssessment.upsert({
      where: { userId_wing: { userId: req.user!.userId, wing: wingId } },
      create: {
        userId: req.user!.userId,
        wing: wingId,
        level,
        answers: sanitized,
        completedAt: new Date(),
      },
      update: {
        level,
        answers: sanitized,
        completedAt: new Date(),
      },
    });

    res.json({
      level,
      levelLabel: ['Foundation', 'Building', 'Established', 'Advanced'][level] ?? 'Advanced',
      nextStep: step,
      assessment,
    });
  } catch (err) {
    console.error('[wings POST /:wing/assess]', err);
    res.status(500).json({ error: 'Failed to save assessment.' });
  }
});

export default router;
