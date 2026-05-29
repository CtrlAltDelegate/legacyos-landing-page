import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/prisma';
import { calculateNetWorth } from '../services/networth';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM   = process.env.EMAIL_FROM ?? 'Flo at LegacyOS <flo@legacyos.com>';
const CLIENT = process.env.CLIENT_URL ?? 'http://localhost:5173';
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// ─── Generate Flo's digest for one user ──────────────────────────────────────

async function generateDigestForUser(userId: string): Promise<string | null> {
  const [user, goals, todos, wings, netWorth, familyProfile] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, email: true },
    }),
    prisma.goal.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.todoItem.findMany({
      where: { userId, completedAt: null },
      orderBy: { priority: 'asc' },
      take: 5,
    }),
    prisma.wingAssessment.findMany({ where: { userId } }),
    calculateNetWorth(userId),
    prisma.familyProfile.findUnique({ where: { userId }, select: { completedAt: true } }),
  ]);

  if (!user) return null;

  // Build a brief context snapshot
  const wingCount = wings.filter((w) => w.completedAt !== null || w.level > 0).length;
  const todoCount = todos.length;
  const topTodo = todos[0];

  const contextSnippet = [
    `Name: ${user.fullName ?? 'there'}`,
    `Net worth: ${fmt(netWorth.netWorth)}`,
    `Total assets: ${fmt(netWorth.totalAssets)}`,
    `Wings assessed: ${wingCount} / 6`,
    `Open action items: ${todoCount}`,
    topTodo ? `Highest priority todo: "${topTodo.title}"` : 'No open todos',
    goals?.primaryGoal ? `Primary goal: ${goals.primaryGoal}` : '',
    familyProfile?.completedAt ? 'Family profile: completed' : 'Family profile: not yet completed',
    netWorth.driftAlerts.length > 0
      ? `Allocation drift: ${netWorth.driftAlerts.map(a => `${a.assetClass} is ${a.direction}`).join(', ')}`
      : 'No allocation drift',
  ].filter(Boolean).join('\n');

  const prompt = `You are Flo, an AI financial companion for LegacyOS.

Here is a snapshot of the user's financial situation this week:
${contextSnippet}

Write a brief, warm, personalized weekly check-in message for this user.
- 3–4 short paragraphs maximum
- Reference their actual numbers naturally (not as a list)
- Highlight 1-2 things they should focus on this week
- Be encouraging but honest
- End with one specific, actionable suggestion
- Tone: like a knowledgeable friend, not a financial bot
- Do NOT use bullet points or headers — write in plain prose
- Do NOT mention this is automated or a "digest"`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });
    return response.content[0]?.type === 'text' ? response.content[0].text : null;
  } catch (err) {
    console.error(`[weeklyDigest] AI generation failed for ${userId}:`, err);
    return null;
  }
}

// ─── Build HTML email ─────────────────────────────────────────────────────────

function buildDigestEmail(
  firstName: string,
  digestText: string,
  todoCount: number,
  netWorthStr: string,
): string {
  // Convert line breaks to HTML paragraphs
  const paragraphs = digestText
    .split(/\n\n+/)
    .map((p) => `<p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.7;">${p.trim()}</p>`)
    .join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Your weekly update from Flo</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F8F8FB;margin:0;padding:40px 16px;">
  <div style="max-width:560px;margin:0 auto;">

    <!-- Header -->
    <div style="background:#3a47ec;border-radius:12px 12px 0 0;padding:24px 32px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;background:rgba(255,255,255,0.2);border-radius:8px;display:flex;align-items:center;justify-content:center;">
          <span style="font-size:16px;">✦</span>
        </div>
        <span style="color:#fff;font-size:16px;font-weight:700;letter-spacing:-0.3px;">LegacyOS</span>
      </div>
    </div>

    <!-- Body -->
    <div style="background:#fff;padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">
        Your weekly update from Flo
      </p>
      <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#111827;">
        Hey ${firstName} 👋
      </h1>

      ${paragraphs}

      <!-- Stats row -->
      <div style="display:flex;gap:16px;margin:24px 0;padding:16px;background:#f9fafb;border-radius:10px;border:1px solid #f3f4f6;">
        <div style="flex:1;text-align:center;">
          <p style="margin:0;font-size:18px;font-weight:700;font-family:monospace;color:#111827;">${netWorthStr}</p>
          <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Net worth</p>
        </div>
        <div style="width:1px;background:#e5e7eb;"></div>
        <div style="flex:1;text-align:center;">
          <p style="margin:0;font-size:18px;font-weight:700;color:${todoCount > 0 ? '#f59e0b' : '#10b981'};">${todoCount}</p>
          <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Open tasks</p>
        </div>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin-top:24px;">
        <a href="${CLIENT}/dashboard" style="display:inline-block;background:#3a47ec;color:#fff;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">
          Go to my dashboard →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px;padding:16px 32px;">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
        You're receiving this weekly because you have a LegacyOS account.
        <br>
        <a href="${CLIENT}/profile" style="color:#6b7280;">Manage notification preferences</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Main digest runner ───────────────────────────────────────────────────────

export async function runWeeklyDigest(): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.log('[weeklyDigest] RESEND_API_KEY not set — skipping email sends');
    return;
  }

  console.log('[weeklyDigest] Starting weekly digest run…');

  // Get all users who have at least one asset or todo (i.e. actually using the product)
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { assets: { some: { isActive: true } } },
        { todoItems: { some: { completedAt: null } } },
      ],
    },
    select: { id: true, email: true, fullName: true },
  });

  console.log(`[weeklyDigest] Sending to ${users.length} user(s)…`);

  let sent = 0;
  let failed = 0;

  for (const user of users) {
    try {
      const digestText = await generateDigestForUser(user.id);
      if (!digestText) { failed++; continue; }

      const [netWorthResult, todos] = await Promise.all([
        calculateNetWorth(user.id),
        prisma.todoItem.count({ where: { userId: user.id, completedAt: null } }),
      ]);

      const firstName = user.fullName?.split(' ')[0] ?? 'there';
      const html = buildDigestEmail(
        firstName,
        digestText,
        todos,
        fmt(netWorthResult.netWorth),
      );

      await resend.emails.send({
        from: FROM,
        to: user.email,
        subject: `Flo's weekly check-in — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
        html,
      });

      sent++;
      console.log(`[weeklyDigest] Sent to ${user.email}`);

      // Rate limit: Resend free tier = 2 req/s
      await new Promise((r) => setTimeout(r, 600));
    } catch (err) {
      console.error(`[weeklyDigest] Failed for ${user.email}:`, err);
      failed++;
    }
  }

  console.log(`[weeklyDigest] Done — sent: ${sent}, failed: ${failed}`);
}
