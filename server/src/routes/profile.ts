import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { generateTodoItems } from '../config/todoRules';

const router = Router();
router.use(requireAuth);

// ─── GET /api/profile/family ──────────────────────────────────────────────────
// Return the user's family profile answers + completedAt flag.

router.get('/family', async (req: Request, res: Response) => {
  try {
    const profile = await prisma.familyProfile.findUnique({
      where: { userId: req.user!.userId },
    });

    res.json({
      answers: (profile?.answers as Record<string, unknown>) ?? {},
      completedAt: profile?.completedAt ?? null,
    });
  } catch (err) {
    console.error('[profile GET /family]', err);
    res.status(500).json({ error: 'Failed to load family profile.' });
  }
});

// ─── PUT /api/profile/family ──────────────────────────────────────────────────
// Save (or update) family profile answers.
// When `complete: true` is passed, auto-generates todo items from the answers.

router.put('/family', async (req: Request, res: Response) => {
  const { answers, complete } = req.body as {
    answers?: Record<string, unknown>;
    complete?: boolean;
  };

  if (!answers || typeof answers !== 'object') {
    res.status(400).json({ error: 'answers object is required.' });
    return;
  }

  try {
    const now = new Date();

    const profile = await prisma.familyProfile.upsert({
      where: { userId: req.user!.userId },
      create: {
        userId: req.user!.userId,
        answers: answers as object,
        completedAt: complete ? now : null,
      },
      update: {
        answers: answers as object,
        ...(complete ? { completedAt: now } : {}),
      },
    });

    // ── Auto-generate todo items when questionnaire is completed ────────────
    if (complete) {
      const todos = generateTodoItems(answers);

      // Upsert each generated todo by sourceKey (idempotent)
      for (const todo of todos) {
        await prisma.todoItem.upsert({
          where: {
            userId_sourceKey: {
              userId: req.user!.userId,
              sourceKey: todo.sourceKey,
            },
          },
          create: {
            userId: req.user!.userId,
            title: todo.title,
            description: todo.description,
            category: todo.category,
            priority: todo.priority,
            relatedWing: todo.relatedWing ?? null,
            actionUrl: todo.actionUrl ?? null,
            actionLabel: todo.actionLabel ?? null,
            isInternal: todo.isInternal ?? false,
            sourceKey: todo.sourceKey,
          },
          update: {
            // Update copy + affiliate data in case rules were updated,
            // but don't reset completedAt — user may have already done this.
            title: todo.title,
            description: todo.description,
            priority: todo.priority,
            actionUrl: todo.actionUrl ?? null,
            actionLabel: todo.actionLabel ?? null,
          },
        });
      }
    }

    res.json({
      answers: profile.answers,
      completedAt: profile.completedAt,
    });
  } catch (err) {
    console.error('[profile PUT /family]', err);
    res.status(500).json({ error: 'Failed to save family profile.' });
  }
});

export default router;
