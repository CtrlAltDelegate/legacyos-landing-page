import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../../lib/prisma';
import { calculateNetWorth } from '../networth';
import { buildFloSystemPrompt, FloUserContext } from './systemPrompt';
import { buildPrioritySignals, PrioritySignal } from './priorities';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FloMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO string — stored in JSON, not a DB column
}

export interface FloConversationState {
  messages: FloMessage[];
}

// ─── Conversation helpers ─────────────────────────────────────────────────────

/**
 * Get or create the FloConversation record for a user.
 * Schema enforces one conversation per user (userId is unique).
 */
export async function getOrCreateConversation(userId: string): Promise<FloConversationState> {
  const existing = await prisma.floConversation.findUnique({
    where: { userId },
  });

  if (existing) {
    return { messages: (existing.messages as unknown as FloMessage[]) ?? [] };
  }

  await prisma.floConversation.create({
    data: { userId, messages: [] },
  });

  return { messages: [] };
}

/**
 * Persist the updated message list back to the DB.
 */
async function saveMessages(userId: string, messages: FloMessage[]): Promise<void> {
  await prisma.floConversation.upsert({
    where: { userId },
    create: { userId, messages: messages as object[] },
    update: { messages: messages as object[] },
  });
}

// ─── User context loader ──────────────────────────────────────────────────────

/**
 * Gather everything Flo needs to build a personalised system prompt.
 * Runs in parallel where possible.
 */
async function loadUserContext(userId: string): Promise<FloUserContext> {
  const [user, goals, netWorth] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, assumedTaxRate: true },
    }),
    prisma.goal.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
    calculateNetWorth(userId),
  ]);

  return {
    fullName: user?.fullName ?? 'there',
    primaryGoal: goals?.primaryGoal ?? null,
    targetMonthlyIncome: goals?.targetMonthlyIncome != null ? Number(goals.targetMonthlyIncome) : null,
    riskTolerance: goals?.riskTolerance ?? null,
    assumedTaxRate: Number(user?.assumedTaxRate ?? 25),
    netWorth,
  };
}

// ─── Core chat function ───────────────────────────────────────────────────────

/**
 * Send a message to Flo and get a response.
 *
 * Flow:
 * 1. Load current conversation history + user context
 * 2. Build a fresh system prompt with live portfolio data
 * 3. Call Claude API with full history + new user message
 * 4. Append both messages to history and persist
 * 5. Return assistant response
 *
 * History is capped at 50 messages (25 turns) to stay within context limits.
 * Oldest messages are dropped from the start if the cap is hit.
 */
export async function sendFloMessage(
  userId: string,
  userMessage: string
): Promise<{ response: string; messages: FloMessage[] }> {
  const MAX_HISTORY = 50;

  // Load context and history in parallel
  const [ctx, state] = await Promise.all([
    loadUserContext(userId),
    getOrCreateConversation(userId),
  ]);

  const systemPrompt = buildFloSystemPrompt(ctx);

  // Append the new user message
  const newUserMsg: FloMessage = {
    role: 'user',
    content: userMessage,
    timestamp: new Date().toISOString(),
  };

  const allMessages = [...state.messages, newUserMsg];

  // Build the API message array (Claude format — no timestamps)
  const apiMessages: Anthropic.MessageParam[] = allMessages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Call Claude
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: apiMessages,
  });

  const assistantContent =
    response.content[0]?.type === 'text' ? response.content[0].text : '';

  // Append assistant response
  const newAssistantMsg: FloMessage = {
    role: 'assistant',
    content: assistantContent,
    timestamp: new Date().toISOString(),
  };

  let updatedMessages = [...allMessages, newAssistantMsg];

  // Cap history to avoid unbounded growth
  if (updatedMessages.length > MAX_HISTORY) {
    updatedMessages = updatedMessages.slice(updatedMessages.length - MAX_HISTORY);
  }

  await saveMessages(userId, updatedMessages);

  return { response: assistantContent, messages: updatedMessages };
}

// ─── Priority signals ─────────────────────────────────────────────────────────

/**
 * Generate proactive priority signals for the current user.
 * Used by the frontend to surface nudges on the Flo page before the user types.
 */
export async function getFloSignals(userId: string): Promise<PrioritySignal[]> {
  const [goals, netWorth] = await Promise.all([
    prisma.goal.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
    calculateNetWorth(userId),
  ]);

  if (!goals) return [];

  return buildPrioritySignals(
    {
      primaryGoal: goals.primaryGoal,
      targetMonthlyIncome: goals.targetMonthlyIncome != null ? Number(goals.targetMonthlyIncome) : null,
      riskTolerance: goals.riskTolerance,
      emergencyFundMonths: goals.emergencyFundMonths != null ? Number(goals.emergencyFundMonths) : null,
      targetEquityPct: Number(goals.targetEquityPct),
      targetRealEstatePct: Number(goals.targetRealEstatePct),
      targetCashPct: Number(goals.targetCashPct),
    },
    netWorth.driftAlerts,
    netWorth.netWorth,
    netWorth.totalLiabilities
  );
}

// ─── Clear conversation ───────────────────────────────────────────────────────

export async function clearFloConversation(userId: string): Promise<void> {
  await prisma.floConversation.upsert({
    where: { userId },
    create: { userId, messages: [] },
    update: { messages: [] },
  });
}
