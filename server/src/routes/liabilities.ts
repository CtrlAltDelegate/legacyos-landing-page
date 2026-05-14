import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(requireAuth);

// ─── Validation schemas ───────────────────────────────────────────────────────

const createLiabilitySchema = Joi.object({
  name: Joi.string().max(255).required(),
  liabilityType: Joi.string()
    .valid('student_loan', 'auto', 'heloc', 'credit_card', 'cosigned', 'other')
    .optional(),
  balance: Joi.number().min(0).required(),
  interestRate: Joi.number().min(0).max(100).optional(),
  monthlyPayment: Joi.number().min(0).optional(),
});

const updateLiabilitySchema = createLiabilitySchema.fork(
  ['name', 'balance'],
  field => field.optional()
);

// ─── GET /api/liabilities ─────────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  try {
    const liabilities = await prisma.liability.findMany({
      where: { userId: req.user!.userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    const totalBalance = liabilities.reduce((sum, l) => sum + Number(l.balance), 0);

    res.json({ liabilities, totalBalance: parseFloat(totalBalance.toFixed(2)) });
  } catch (err) {
    console.error('[liabilities GET /]', err);
    res.status(500).json({ error: 'Failed to fetch liabilities.' });
  }
});

// ─── POST /api/liabilities ────────────────────────────────────────────────────

router.post('/', validate(createLiabilitySchema), async (req: Request, res: Response) => {
  try {
    const { name, liabilityType, balance, interestRate, monthlyPayment } = req.body;

    const liability = await prisma.liability.create({
      data: {
        userId: req.user!.userId,
        name,
        liabilityType: liabilityType ?? null,
        balance,
        interestRate: interestRate ?? null,
        monthlyPayment: monthlyPayment ?? null,
      },
    });

    res.status(201).json({ liability });
  } catch (err) {
    console.error('[liabilities POST /]', err);
    res.status(500).json({ error: 'Failed to create liability.' });
  }
});

// ─── PUT /api/liabilities/:id ─────────────────────────────────────────────────

router.put('/:id', validate(updateLiabilitySchema), async (req: Request, res: Response) => {
  try {
    const existing = await prisma.liability.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Liability not found.' });
      return;
    }

    const liability = await prisma.liability.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json({ liability });
  } catch (err) {
    console.error('[liabilities PUT /:id]', err);
    res.status(500).json({ error: 'Failed to update liability.' });
  }
});

// ─── DELETE /api/liabilities/:id ─────────────────────────────────────────────
// Soft delete

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.liability.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Liability not found.' });
      return;
    }

    await prisma.liability.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({ message: 'Liability removed.' });
  } catch (err) {
    console.error('[liabilities DELETE /:id]', err);
    res.status(500).json({ error: 'Failed to remove liability.' });
  }
});

export default router;
