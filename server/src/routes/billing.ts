import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// ─── Plan → Stripe price mapping ─────────────────────────────────────────────
// Set STRIPE_CORE_PRICE_ID and STRIPE_PREMIUM_PRICE_ID in environment.

const PRICE_IDS: Record<string, string> = {
  core:    process.env.STRIPE_CORE_PRICE_ID!,
  premium: process.env.STRIPE_PREMIUM_PRICE_ID!,
};

const PLAN_FROM_PRICE: Record<string, 'core' | 'premium'> = {};
// Populated lazily from env at runtime — avoids startup crash if env not set yet.
function getPlanFromPrice(priceId: string): 'core' | 'premium' | null {
  if (process.env.STRIPE_CORE_PRICE_ID && priceId === process.env.STRIPE_CORE_PRICE_ID) return 'core';
  if (process.env.STRIPE_PREMIUM_PRICE_ID && priceId === process.env.STRIPE_PREMIUM_PRICE_ID) return 'premium';
  return null;
}

// ─── POST /api/billing/checkout ───────────────────────────────────────────────
// Create a Stripe Checkout session for upgrading to core or premium.
// Returns { url } — frontend redirects the user there.

router.post('/checkout', requireAuth, async (req: Request, res: Response) => {
  const { plan } = req.body as { plan?: string };

  if (!plan || !PRICE_IDS[plan]) {
    res.status(400).json({ error: 'Invalid plan. Must be "core" or "premium".' });
    return;
  }

  const priceId = PRICE_IDS[plan];
  if (!priceId) {
    res.status(500).json({ error: `Price ID not configured for plan: ${plan}` });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { email: true, stripeCustomerId: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: user.stripeCustomerId ?? undefined,
      customer_email: user.stripeCustomerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${clientUrl}/dashboard?upgraded=true`,
      cancel_url:  `${clientUrl}/dashboard`,
      metadata: {
        userId:   req.user!.userId,
        planName: plan,
      },
      subscription_data: {
        metadata: {
          userId:   req.user!.userId,
          planName: plan,
        },
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[billing/checkout]', err);
    res.status(500).json({ error: 'Failed to create checkout session.' });
  }
});

// ─── GET /api/billing/portal ──────────────────────────────────────────────────
// Create a Stripe Customer Portal session so users can manage / cancel.

router.get('/portal', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      res.status(400).json({ error: 'No active subscription found.' });
      return;
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${clientUrl}/dashboard`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[billing/portal]', err);
    res.status(500).json({ error: 'Failed to open billing portal.' });
  }
});

// ─── GET /api/billing/status ──────────────────────────────────────────────────
// Return the user's current plan and subscription status.

router.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { plan: true, stripeCustomerId: true, stripeSubId: true },
    });

    res.json({
      plan:           user?.plan ?? 'free',
      hasSubscription: !!user?.stripeSubId,
    });
  } catch (err) {
    console.error('[billing/status]', err);
    res.status(500).json({ error: 'Failed to fetch billing status.' });
  }
});

// ─── POST /api/billing/webhook ────────────────────────────────────────────────
// Stripe sends signed events here. Must receive raw body — mounted separately
// in index.ts before express.json() with express.raw({ type: 'application/json' }).

export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    res.status(400).json({ error: 'Missing signature or webhook secret.' });
    return;
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
  } catch (err) {
    console.error('[billing/webhook] Signature verification failed:', err);
    res.status(400).json({ error: 'Webhook signature verification failed.' });
    return;
  }

  try {
    await handleEvent(event);
    res.json({ received: true });
  } catch (err) {
    console.error('[billing/webhook] Event handling failed:', err);
    res.status(500).json({ error: 'Event processing failed.' });
  }
}

// ─── Event handler ────────────────────────────────────────────────────────────

async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {

    // ── Subscription created or renewed successfully ──────────────────────────
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== 'subscription') break;

      const userId   = session.metadata?.userId;
      const planName = session.metadata?.planName;

      if (!userId || !planName) {
        console.warn('[webhook] checkout.session.completed: missing metadata', session.id);
        break;
      }

      const plan = planName as 'core' | 'premium';

      await prisma.user.update({
        where: { id: userId },
        data: {
          plan,
          stripeCustomerId: session.customer as string,
          stripeSubId:      session.subscription as string,
        },
      });

      console.log(`[webhook] Upgraded userId=${userId} to plan=${plan}`);
      break;
    }

    // ── Plan changed (e.g. upgrade core → premium or downgrade) ──────────────
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const priceId = sub.items.data[0]?.price.id;
      const plan = priceId ? getPlanFromPrice(priceId) : null;

      if (!plan) {
        console.warn('[webhook] subscription.updated: unrecognised priceId', priceId);
        break;
      }

      // Find user by stripeSubId
      const user = await prisma.user.findFirst({
        where: { stripeSubId: sub.id },
        select: { id: true },
      });

      if (!user) {
        console.warn('[webhook] subscription.updated: user not found for sub', sub.id);
        break;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { plan },
      });

      console.log(`[webhook] Updated userId=${user.id} to plan=${plan}`);
      break;
    }

    // ── Subscription cancelled / expired — downgrade to free ─────────────────
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;

      const user = await prisma.user.findFirst({
        where: { stripeSubId: sub.id },
        select: { id: true },
      });

      if (!user) {
        console.warn('[webhook] subscription.deleted: user not found for sub', sub.id);
        break;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          plan:        'free',
          stripeSubId: null,
        },
      });

      console.log(`[webhook] Downgraded userId=${user.id} to free`);
      break;
    }

    default:
      // Silently ignore events we don't handle
      break;
  }
}

// Suppress unused import warning — PLAN_FROM_PRICE populated above
void PLAN_FROM_PRICE;

export default router;
