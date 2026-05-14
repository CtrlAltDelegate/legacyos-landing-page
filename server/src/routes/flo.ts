import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  sendFloMessage,
  getOrCreateConversation,
  clearFloConversation,
  getFloSignals,
} from '../services/flo/index';

const router = Router();
router.use(requireAuth);

// ─── GET /api/flo/conversation ────────────────────────────────────────────────
// Return the user's full conversation history with Flo.

router.get('/conversation', async (req: Request, res: Response) => {
  try {
    const state = await getOrCreateConversation(req.user!.userId);
    res.json({ messages: state.messages });
  } catch (err) {
    console.error('[flo/conversation GET]', err);
    res.status(500).json({ error: 'Failed to load conversation.' });
  }
});

// ─── POST /api/flo/chat ───────────────────────────────────────────────────────
// Send a message to Flo and receive a response.
// Available on all plans — core feature of the product.

router.post('/chat', async (req: Request, res: Response) => {
  const { message } = req.body as { message?: string };

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    res.status(400).json({ error: 'message is required.' });
    return;
  }

  if (message.length > 4000) {
    res.status(400).json({ error: 'Message is too long (max 4000 characters).' });
    return;
  }

  try {
    const { response, messages } = await sendFloMessage(
      req.user!.userId,
      message.trim()
    );

    res.json({ response, messages });
  } catch (err) {
    console.error('[flo/chat POST]', err);
    res.status(500).json({ error: 'Flo is temporarily unavailable. Please try again.' });
  }
});

// ─── DELETE /api/flo/conversation ────────────────────────────────────────────
// Clear conversation history — starts a fresh session.

router.delete('/conversation', async (req: Request, res: Response) => {
  try {
    await clearFloConversation(req.user!.userId);
    res.json({ message: 'Conversation cleared.' });
  } catch (err) {
    console.error('[flo/conversation DELETE]', err);
    res.status(500).json({ error: 'Failed to clear conversation.' });
  }
});

// ─── GET /api/flo/signals ─────────────────────────────────────────────────────
// Return proactive priority signals for the current user.
// Used by the frontend to surface nudges before the user types.

router.get('/signals', async (req: Request, res: Response) => {
  try {
    const signals = await getFloSignals(req.user!.userId);
    res.json({ signals });
  } catch (err) {
    console.error('[flo/signals GET]', err);
    res.status(500).json({ error: 'Failed to load signals.' });
  }
});

export default router;
