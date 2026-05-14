const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { authenticate } = require('../middleware/auth');
const { query } = require('../config/database');

const router = express.Router();

// ─── POST /api/billing/create-checkout-session ────────────────────────────────
router.post('/create-checkout-session', authenticate, async (req, res, next) => {
  try {
    const { plan } = req.body;
    if (!['core', 'premium'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Must be "core" or "premium".' });
    }

    const priceMap = {
      core: process.env.STRIPE_PRICE_CORE,
      premium: process.env.STRIPE_PRICE_PREMIUM,
    };

    const priceId = priceMap[plan];
    if (!priceId) {
      return res.status(500).json({ error: `Stripe price ID for plan "${plan}" not configured` });
    }

    // Get or create Stripe customer
    const subResult = await query(
      `SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1`,
      [req.user.id]
    );
    const sub = subResult.rows[0];

    let customerId = sub?.stripe_customer_id;

    if (!customerId) {
      const userResult = await query(`SELECT email, full_name FROM users WHERE id = $1`, [req.user.id]);
      const user = userResult.rows[0];

      const customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name,
        metadata: { legacyos_user_id: req.user.id },
      });
      customerId = customer.id;

      await query(
        `UPDATE subscriptions SET stripe_customer_id = $1 WHERE user_id = $2`,
        [customerId, req.user.id]
      );
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/billing?canceled=true`,
      subscription_data: {
        metadata: { legacyos_user_id: req.user.id, plan },
      },
      metadata: { legacyos_user_id: req.user.id, plan },
    });

    res.json({ checkout_url: session.url, session_id: session.id });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/billing/portal ─────────────────────────────────────────────────
router.post('/portal', authenticate, async (req, res, next) => {
  try {
    const subResult = await query(
      `SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1`,
      [req.user.id]
    );
    const customerId = subResult.rows[0]?.stripe_customer_id;
    if (!customerId) {
      return res.status(404).json({ error: 'No billing account found. Please subscribe first.' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.FRONTEND_URL}/billing`,
    });

    res.json({ portal_url: session.url });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/billing/subscription ───────────────────────────────────────────
router.get('/subscription', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT plan, status, current_period_start, current_period_end, stripe_customer_id, stripe_subscription_id
       FROM subscriptions WHERE user_id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0] || { plan: 'free', status: 'active' });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/billing/webhook ────────────────────────────────────────────────
// Note: raw body parsing is set up in index.js for this route
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.legacyos_user_id;
        const plan = session.metadata?.plan;
        if (!userId || !plan) break;

        const subscription = await stripe.subscriptions.retrieve(session.subscription);

        await query(
          `UPDATE subscriptions
           SET plan = $1,
               status = $2,
               stripe_subscription_id = $3,
               stripe_customer_id = $4,
               current_period_start = to_timestamp($5),
               current_period_end = to_timestamp($6)
           WHERE user_id = $7`,
          [
            plan,
            subscription.status,
            subscription.id,
            subscription.customer,
            subscription.current_period_start,
            subscription.current_period_end,
            userId,
          ]
        );
        console.log(`[Billing] User ${userId} upgraded to ${plan}`);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const userId = sub.metadata?.legacyos_user_id;
        if (!userId) break;

        // Determine plan from price metadata or line items
        const plan = sub.metadata?.plan || 'core';

        await query(
          `UPDATE subscriptions
           SET status = $1,
               current_period_start = to_timestamp($2),
               current_period_end = to_timestamp($3)
           WHERE stripe_subscription_id = $4`,
          [sub.status, sub.current_period_start, sub.current_period_end, sub.id]
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await query(
          `UPDATE subscriptions
           SET plan = 'free', status = 'canceled', stripe_subscription_id = NULL
           WHERE stripe_subscription_id = $1`,
          [sub.id]
        );
        console.log(`[Billing] Subscription ${sub.id} canceled → downgraded to free`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await query(
          `UPDATE subscriptions SET status = 'past_due'
           WHERE stripe_subscription_id = $1`,
          [invoice.subscription]
        );
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          await query(
            `UPDATE subscriptions SET status = 'active'
             WHERE stripe_subscription_id = $1`,
            [invoice.subscription]
          );
        }
        break;
      }

      default:
        // Unhandled event type
        break;
    }
  } catch (err) {
    console.error('[Stripe Webhook] Handler error:', err.message);
    // Don't return 500 — Stripe will retry. Log and acknowledge.
  }

  res.json({ received: true });
});

module.exports = router;
