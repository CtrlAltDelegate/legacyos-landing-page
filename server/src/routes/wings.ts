import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { WINGS, WING_ORDER, LEVEL_LABELS, MAX_WING_LEVEL, calculateLevel, WingId, WingStep } from '../config/wingSteps';

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
      assessments.map((a) => [a.wing, {
        level: a.level,
        answers: a.answers,
        completedAt: a.completedAt,
        stepCompletedAt: a.stepCompletedAt ?? null,
        stepNotes: a.stepNotes,
      }])
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
        beyondExpert: cfg.beyondExpert,
        level,
        levelLabel: LEVEL_LABELS[level] ?? LEVEL_LABELS[LEVEL_LABELS.length - 1],
        assessed: !!saved?.completedAt,
        stepCompletedAt: saved?.stepCompletedAt ?? null,
        nextStep: step,
        questions: cfg.questions,
        answers: (saved?.answers as Record<string, boolean>) ?? {},
        stepNotes: (saved?.stepNotes as Record<string, string>) ?? {},
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
      beyondExpert: cfg.beyondExpert,
      level,
      levelLabel: LEVEL_LABELS[level] ?? LEVEL_LABELS[LEVEL_LABELS.length - 1],
      assessed: !!saved?.completedAt,
      stepCompletedAt: saved?.stepCompletedAt ?? null,
      steps,
      nextStep: step,
      questions: cfg.questions,
      answers: (saved?.answers as Record<string, boolean>) ?? {},
      stepNotes: (saved?.stepNotes as Record<string, string>) ?? {},
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
      levelLabel: LEVEL_LABELS[level] ?? LEVEL_LABELS[LEVEL_LABELS.length - 1],
      nextStep: step,
      assessment,
    });
  } catch (err) {
    console.error('[wings POST /:wing/assess]', err);
    res.status(500).json({ error: 'Failed to save assessment.' });
  }
});

// ─── POST /api/wings/:wing/complete-step ──────────────────────────────────────
// Mark the current next step as completed. Upserts to ensure the record exists.

router.post('/:wing/complete-step', async (req: Request, res: Response) => {
  const wingId = req.params.wing as WingId;

  if (!WINGS[wingId]) {
    res.status(404).json({ error: 'Wing not found.' });
    return;
  }

  const now = new Date();

  try {
    await prisma.wingAssessment.upsert({
      where: { userId_wing: { userId: req.user!.userId, wing: wingId } },
      create: {
        userId: req.user!.userId,
        wing: wingId,
        level: 0,
        answers: {},
        completedAt: now,
        stepCompletedAt: now,
      },
      update: {
        stepCompletedAt: now,
      },
    });

    res.json({ message: 'Step marked as complete.', stepCompletedAt: now.toISOString() });
  } catch (err) {
    console.error('[wings POST /:wing/complete-step]', err);
    res.status(500).json({ error: 'Failed to mark step complete.' });
  }
});

// ─── DELETE /api/wings/:wing/complete-step ────────────────────────────────────
// Unmark a step completion (undo).

router.delete('/:wing/complete-step', async (req: Request, res: Response) => {
  const wingId = req.params.wing as WingId;

  if (!WINGS[wingId]) {
    res.status(404).json({ error: 'Wing not found.' });
    return;
  }

  try {
    await prisma.wingAssessment.updateMany({
      where: { userId: req.user!.userId, wing: wingId },
      data: { stepCompletedAt: null },
    });

    res.json({ message: 'Step completion cleared.' });
  } catch (err) {
    console.error('[wings DELETE /:wing/complete-step]', err);
    res.status(500).json({ error: 'Failed to clear step completion.' });
  }
});

// ─── PUT /api/wings/:wing/notes ───────────────────────────────────────────────
// Save a step note (plain text written by the user for a write-type step).

router.put('/:wing/notes', async (req: Request, res: Response) => {
  const wingId = req.params.wing as WingId;

  if (!WINGS[wingId]) {
    res.status(404).json({ error: 'Wing not found.' });
    return;
  }

  const { level, note } = req.body as { level?: number; note?: string };

  if (typeof level !== 'number' || level < 0 || level > MAX_WING_LEVEL) {
    res.status(400).json({ error: 'level must be a number 0–5.' });
    return;
  }
  if (typeof note !== 'string') {
    res.status(400).json({ error: 'note must be a string.' });
    return;
  }

  const now = new Date();

  try {
    const existing = await prisma.wingAssessment.findUnique({
      where: { userId_wing: { userId: req.user!.userId, wing: wingId } },
    });

    const currentNotes = (existing?.stepNotes as Record<string, string>) ?? {};
    const updatedNotes = { ...currentNotes, [String(level)]: note };

    await prisma.wingAssessment.upsert({
      where: { userId_wing: { userId: req.user!.userId, wing: wingId } },
      create: {
        userId: req.user!.userId,
        wing: wingId,
        level: 0,
        answers: {},
        completedAt: now,
        stepNotes: updatedNotes,
      },
      update: { stepNotes: updatedNotes },
    });

    res.json({ message: 'Note saved.', stepNotes: updatedNotes });
  } catch (err) {
    console.error('[wings PUT /:wing/notes]', err);
    res.status(500).json({ error: 'Failed to save note.' });
  }
});

export default router;
