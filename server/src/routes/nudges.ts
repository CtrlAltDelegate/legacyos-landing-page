import { Router, type Request, type Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { generateNudges } from '../services/nudges';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(requireAuth);

// ─── GET /api/nudges ──────────────────────────────────────────────────────────
// Returns all active (non-dismissed) nudges for the current user.

router.get('/', async (req: Request, res: Response) => {
  try {
    const nudges = await generateNudges(req.user!.userId);
    res.json({ nudges });
  } catch (err) {
    console.error('[nudges GET /]', err);
    res.status(500).json({ error: 'Failed to generate nudges.' });
  }
});

// ─── POST /api/nudges/:key/dismiss ────────────────────────────────────────────
// Permanently dismisses a nudge for the current user.

router.post('/:key/dismiss', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    // Append to the dismissedNudges array (Prisma push)
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { dismissedNudges: { push: key } },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[nudges POST /:key/dismiss]', err);
    res.status(500).json({ error: 'Failed to dismiss nudge.' });
  }
});

export default router;
