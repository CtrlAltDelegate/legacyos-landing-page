import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { requirePlan } from '../middleware/planGate';
import {
  sendFloMessage,
  getOrCreateConversation,
  clearFloConversation,
  getFloSignals,
} from '../services/flo/index';

const router = Router();
router.use(requireAuth);

// All Flo features are Core+ per the Six Wing Framework (Operations Wing)
const requireCore = requirePlan('core');

// ─── GET /api/flo/conversation ────────────────────────────────────────────────
// Return the user's full conversation history with Flo.

router.get('/conversation', requireCore, async (req: Request, res: Response) => {
  try {
    const state = await getOrCreateConversation(req.user!.userId);
    res.json({ messages: state.messages });
  } catch (err) {
    console.error('[flo/conversation GET]', err);
    res.status(500).json({ error: 'Failed to load conversation.' });
  }
});

// ─── POST /api/flo/chat ───────────────────────────────────────────────────────
// Send a message to Flo and receive a response. Core+ only (Operations Wing).

router.post('/chat', requireCore, async (req: Request, res: Response) => {
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

router.delete('/conversation', requireCore, async (req: Request, res: Response) => {
  try {
    await clearFloConversation(req.user!.userId);
    res.json({ message: 'Conversation cleared.' });
  } catch (err) {
    console.error('[flo/conversation DELETE]', err);
    res.status(500).json({ error: 'Failed to clear conversation.' });
  }
});

// ─── POST /api/flo/priority ───────────────────────────────────────────────────
// Return Flo's top priority signal for the current user.
// Used post-onboarding to surface the single most important action item.
// Core+ only (Operations Wing).

router.post('/priority', requireCore, async (req: Request, res: Response) => {
  try {
    const signals = await getFloSignals(req.user!.userId);
    // Return the highest-priority signal (first in the sorted array), or null
    const topSignal = signals.length > 0 ? signals[0] : null;
    res.json({ signal: topSignal, signals });
  } catch (err) {
    console.error('[flo/priority POST]', err);
    res.status(500).json({ error: 'Failed to load priority signal.' });
  }
});

export default router;
