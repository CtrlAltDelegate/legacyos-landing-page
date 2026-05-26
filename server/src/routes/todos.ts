import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// ─── GET /api/todos ───────────────────────────────────────────────────────────
// Return all todo items for the user, sorted by priority then createdAt.

router.get('/', async (req: Request, res: Response) => {
  try {
    const { includeCompleted = 'false' } = req.query;
    const showCompleted = includeCompleted === 'true';

    const todos = await prisma.todoItem.findMany({
      where: {
        userId: req.user!.userId,
        ...(showCompleted ? {} : { completedAt: null }),
      },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    res.json({ todos });
  } catch (err) {
    console.error('[todos GET /]', err);
    res.status(500).json({ error: 'Failed to load todos.' });
  }
});

// ─── PATCH /api/todos/:id/complete ───────────────────────────────────────────
// Mark a todo item as complete.

router.patch('/:id/complete', async (req: Request, res: Response) => {
  try {
    const todo = await prisma.todoItem.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!todo) {
      res.status(404).json({ error: 'Todo not found.' });
      return;
    }

    const updated = await prisma.todoItem.update({
      where: { id: req.params.id },
      data: { completedAt: new Date() },
    });

    res.json(updated);
  } catch (err) {
    console.error('[todos PATCH /complete]', err);
    res.status(500).json({ error: 'Failed to complete todo.' });
  }
});

// ─── PATCH /api/todos/:id/uncomplete ─────────────────────────────────────────
// Unmark a todo item.

router.patch('/:id/uncomplete', async (req: Request, res: Response) => {
  try {
    const todo = await prisma.todoItem.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!todo) {
      res.status(404).json({ error: 'Todo not found.' });
      return;
    }

    const updated = await prisma.todoItem.update({
      where: { id: req.params.id },
      data: { completedAt: null },
    });

    res.json(updated);
  } catch (err) {
    console.error('[todos PATCH /uncomplete]', err);
    res.status(500).json({ error: 'Failed to uncomplete todo.' });
  }
});

// ─── DELETE /api/todos/:id ────────────────────────────────────────────────────
// Dismiss a todo item (permanent delete — for manually dismissing irrelevant items).

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const todo = await prisma.todoItem.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!todo) {
      res.status(404).json({ error: 'Todo not found.' });
      return;
    }

    await prisma.todoItem.delete({ where: { id: req.params.id } });
    res.json({ message: 'Todo dismissed.' });
  } catch (err) {
    console.error('[todos DELETE /:id]', err);
    res.status(500).json({ error: 'Failed to dismiss todo.' });
  }
});

export default router;
