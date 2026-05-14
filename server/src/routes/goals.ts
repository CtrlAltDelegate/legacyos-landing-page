import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(requireAuth);

// ─── Validation schemas ───────────────────────────────────────────────────────

/**
 * Allocation percentages must sum to 100 (±1 for rounding).
 * Each individual target is 0–100.
 */
const allocationFields = {
  targetEquityPct:     Joi.number().min(0).max(100),
  targetRealEstatePct: Joi.number().min(0).max(100),
  targetCashPct:       Joi.number().min(0).max(100),
  targetBusinessPct:   Joi.number().min(0).max(100),
  targetInsurancePct:  Joi.number().min(0).max(100),
  targetOtherPct:      Joi.number().min(0).max(100),
};

const createGoalSchema = Joi.object({
  primaryGoal: Joi.string()
    .valid(
      'retirement',
      'financial_independence',
      'wealth_transfer',
      'real_estate_growth',
      'debt_freedom',
      'education_funding',
      'other'
    )
    .required(),
  primaryGoalLabel: Joi.string().max(255).optional(),
  targetMonthlyIncome: Joi.number().min(0).max(10_000_000).optional(),
  targetDate: Joi.string().isoDate().optional(),
  riskTolerance: Joi.string()
    .valid('conservative', 'moderate', 'aggressive')
    .optional(),
  emergencyFundMonths: Joi.number().min(0).max(60).optional(),
  ...allocationFields,
});

const updateGoalSchema = Joi.object({
  primaryGoal: Joi.string()
    .valid(
      'retirement',
      'financial_independence',
      'wealth_transfer',
      'real_estate_growth',
      'debt_freedom',
      'education_funding',
      'other'
    )
    .optional(),
  primaryGoalLabel: Joi.string().max(255).optional().allow(''),
  targetMonthlyIncome: Joi.number().min(0).max(10_000_000).optional().allow(null),
  targetDate: Joi.string().isoDate().optional().allow(null),
  riskTolerance: Joi.string()
    .valid('conservative', 'moderate', 'aggressive')
    .optional()
    .allow(null),
  emergencyFundMonths: Joi.number().min(0).max(60).optional().allow(null),
  ...allocationFields,
}).min(1); // at least one field required for an update

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Validate that allocation targets sum to 100 (±1 for floating-point rounding).
 * Only checks if all 6 targets are provided; partial updates skip this check.
 */
function validateAllocationSum(data: Record<string, unknown>): string | null {
  const keys = [
    'targetEquityPct',
    'targetRealEstatePct',
    'targetCashPct',
    'targetBusinessPct',
    'targetInsurancePct',
    'targetOtherPct',
  ];

  const provided = keys.filter((k) => data[k] != null);
  if (provided.length !== 6) return null; // partial update — skip

  const sum = keys.reduce((acc, k) => acc + Number(data[k] ?? 0), 0);
  if (Math.abs(sum - 100) > 1) {
    return `Allocation targets must sum to 100. Current sum: ${sum.toFixed(1)}`;
  }
  return null;
}

// ─── GET /api/goals ───────────────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  try {
    const goal = await prisma.goal.findFirst({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
    });

    // Also include whether onboarding is complete
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { onboardingComplete: true },
    });

    res.json({ goal, onboardingComplete: user?.onboardingComplete ?? false });
  } catch (err) {
    console.error('[goals GET /]', err);
    res.status(500).json({ error: 'Failed to fetch goals.' });
  }
});

// ─── POST /api/goals ──────────────────────────────────────────────────────────
// Create initial goals and mark onboarding as complete.
// If a goal already exists, returns 409 — use PUT to update.

router.post('/', validate(createGoalSchema), async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  // Allocation sum check (only when all 6 are provided)
  const sumError = validateAllocationSum(req.body);
  if (sumError) {
    res.status(400).json({ error: sumError });
    return;
  }

  try {
    // Prevent duplicate goals — one record per user
    const existing = await prisma.goal.findFirst({ where: { userId } });
    if (existing) {
      res.status(409).json({
        error: 'Goals already exist for this user. Use PUT /api/goals to update.',
        goalId: existing.id,
      });
      return;
    }

    const {
      primaryGoal,
      primaryGoalLabel,
      targetMonthlyIncome,
      targetDate,
      riskTolerance,
      emergencyFundMonths,
      targetEquityPct,
      targetRealEstatePct,
      targetCashPct,
      targetBusinessPct,
      targetInsurancePct,
      targetOtherPct,
    } = req.body;

    // Create goals + mark onboarding complete in a transaction
    const [goal] = await prisma.$transaction([
      prisma.goal.create({
        data: {
          userId,
          primaryGoal,
          primaryGoalLabel: primaryGoalLabel ?? null,
          targetMonthlyIncome: targetMonthlyIncome ?? null,
          targetDate: targetDate ? new Date(targetDate) : null,
          riskTolerance: riskTolerance ?? null,
          emergencyFundMonths: emergencyFundMonths ?? null,
          ...(targetEquityPct != null && { targetEquityPct }),
          ...(targetRealEstatePct != null && { targetRealEstatePct }),
          ...(targetCashPct != null && { targetCashPct }),
          ...(targetBusinessPct != null && { targetBusinessPct }),
          ...(targetInsurancePct != null && { targetInsurancePct }),
          ...(targetOtherPct != null && { targetOtherPct }),
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { onboardingComplete: true },
      }),
    ]);

    res.status(201).json({
      goal,
      message: 'Goals saved. Onboarding complete — Flo is ready.',
    });
  } catch (err) {
    console.error('[goals POST /]', err);
    res.status(500).json({ error: 'Failed to save goals.' });
  }
});

// ─── PUT /api/goals ───────────────────────────────────────────────────────────
// Update existing goals. Partial updates are supported.

router.put('/', validate(updateGoalSchema), async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  // Allocation sum check (only when all 6 are provided together)
  const sumError = validateAllocationSum(req.body);
  if (sumError) {
    res.status(400).json({ error: sumError });
    return;
  }

  try {
    const existing = await prisma.goal.findFirst({ where: { userId } });
    if (!existing) {
      res.status(404).json({
        error: 'No goals found. Use POST /api/goals to create them first.',
      });
      return;
    }

    const {
      primaryGoal,
      primaryGoalLabel,
      targetMonthlyIncome,
      targetDate,
      riskTolerance,
      emergencyFundMonths,
      targetEquityPct,
      targetRealEstatePct,
      targetCashPct,
      targetBusinessPct,
      targetInsurancePct,
      targetOtherPct,
    } = req.body;

    const updated = await prisma.goal.update({
      where: { id: existing.id },
      data: {
        ...(primaryGoal !== undefined && { primaryGoal }),
        ...(primaryGoalLabel !== undefined && { primaryGoalLabel: primaryGoalLabel || null }),
        ...(targetMonthlyIncome !== undefined && { targetMonthlyIncome: targetMonthlyIncome ?? null }),
        ...(targetDate !== undefined && { targetDate: targetDate ? new Date(targetDate) : null }),
        ...(riskTolerance !== undefined && { riskTolerance: riskTolerance ?? null }),
        ...(emergencyFundMonths !== undefined && { emergencyFundMonths: emergencyFundMonths ?? null }),
        ...(targetEquityPct != null && { targetEquityPct }),
        ...(targetRealEstatePct != null && { targetRealEstatePct }),
        ...(targetCashPct != null && { targetCashPct }),
        ...(targetBusinessPct != null && { targetBusinessPct }),
        ...(targetInsurancePct != null && { targetInsurancePct }),
        ...(targetOtherPct != null && { targetOtherPct }),
      },
    });

    res.json({ goal: updated, message: 'Goals updated.' });
  } catch (err) {
    console.error('[goals PUT /]', err);
    res.status(500).json({ error: 'Failed to update goals.' });
  }
});

export default router;
