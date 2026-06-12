import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../../lib/prisma';
import { calculateNetWorth } from '../networth';
import { buildFloSystemPrompt, FloUserContext, TaxSummary, RecentMetricPoint } from './systemPrompt';
import { buildPrioritySignals, PrioritySignal } from './priorities';
import { generateNudges } from '../nudges';

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
  const [user, goals, netWorth, familyProfileRecord, taxDoc, rawMetrics] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, assumedTaxRate: true },
    }),
    prisma.goal.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
    calculateNetWorth(userId),
    prisma.familyProfile.findUnique({
      where: { userId },
      select: { answers: true, completedAt: true },
    }),
    // Most recently confirmed tax return for tax context injection
    prisma.document.findFirst({
      where: { userId, documentType: 'tax_return', parseStatus: 'confirmed' },
      orderBy: { confirmedAt: 'desc' },
      select: { parsedData: true },
    }),
    // Latest value for each metric type (deduplicated)
    prisma.financialMetric.findMany({
      where: { userId },
      orderBy: [{ metricType: 'asc' }, { recordedDate: 'desc' }],
      distinct: ['metricType'],
      select: { metricType: true, value: true, recordedDate: true, metricLabel: true },
    }),
  ]);

  const recentMetrics: RecentMetricPoint[] = rawMetrics.map((m) => ({
    metricType:   m.metricType,
    value:        Number(m.value),
    recordedDate: m.recordedDate,
    metricLabel:  m.metricLabel,
  }));

  // Load nudges using already-computed netWorth to avoid a duplicate query
  const nudges = await generateNudges(userId, netWorth);

  // Build tax summary from extracted data if available
  let taxSummary: TaxSummary | null = null;
  if (taxDoc?.parsedData) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = taxDoc.parsedData as Record<string, any>;
    const agi: number | null = d.adjusted_gross_income ?? null;
    const federalTax: number | null = d.federal_tax_owed ?? null;
    const stateTax: number | null = d.state_tax_owed ?? null;
    const totalTax = federalTax != null && stateTax != null ? federalTax + stateTax : null;
    taxSummary = {
      taxYear: d.tax_year ?? null,
      agi,
      federalTax,
      stateTax,
      totalTax,
      effectiveTaxRate: agi && agi > 0 && totalTax != null
        ? parseFloat(((totalTax / agi) * 100).toFixed(1))
        : null,
      estimatedQuarterlyPayment: totalTax != null ? parseFloat((totalTax / 4).toFixed(2)) : null,
    };
  }

  return {
    fullName: user?.fullName ?? 'there',
    primaryGoal: goals?.primaryGoal ?? null,
    targetMonthlyIncome: goals?.targetMonthlyIncome != null ? Number(goals.targetMonthlyIncome) : null,
    riskTolerance: goals?.riskTolerance ?? null,
    assumedTaxRate: Number(user?.assumedTaxRate ?? 25),
    netWorth,
    familyProfile: familyProfileRecord?.completedAt
      ? (familyProfileRecord.answers as Record<string, unknown>)
      : null,
    taxSummary,
    nudges,
    recentMetrics,
  };
}

// ─── Shared message prep ─────────────────────────────────────────────────────

const MAX_HISTORY = 50;

async function prepareFloCall(userId: string, userMessage: string) {
  const [ctx, state] = await Promise.all([
    loadUserContext(userId),
    getOrCreateConversation(userId),
  ]);

  const systemPrompt = buildFloSystemPrompt(ctx);

  const newUserMsg: FloMessage = {
    role: 'user',
    content: userMessage,
    timestamp: new Date().toISOString(),
  };

  const allMessages = [...state.messages, newUserMsg];

  const apiMessages: Anthropic.MessageParam[] = allMessages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  return { systemPrompt, allMessages, apiMessages };
}

async function finalizeFloCall(
  userId: string,
  allMessages: FloMessage[],
  assistantContent: string
): Promise<FloMessage[]> {
  const newAssistantMsg: FloMessage = {
    role: 'assistant',
    content: assistantContent,
    timestamp: new Date().toISOString(),
  };

  let updatedMessages = [...allMessages, newAssistantMsg];
  if (updatedMessages.length > MAX_HISTORY) {
    updatedMessages = updatedMessages.slice(updatedMessages.length - MAX_HISTORY);
  }

  await saveMessages(userId, updatedMessages);
  return updatedMessages;
}

// ─── Streaming chat ───────────────────────────────────────────────────────────

/**
 * Stream a Flo response token-by-token via onChunk callback.
 * Persists the full message to DB when complete and returns updated history.
 */
export async function sendFloMessageStream(
  userId: string,
  userMessage: string,
  onChunk: (text: string) => void
): Promise<FloMessage[]> {
  const { systemPrompt, allMessages, apiMessages } = await prepareFloCall(userId, userMessage);

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: apiMessages,
  });

  let fullText = '';
  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      onChunk(event.delta.text);
      fullText += event.delta.text;
    }
  }

  return finalizeFloCall(userId, allMessages, fullText);
}

// ─── Non-streaming fallback (kept for internal use / testing) ─────────────────

export async function sendFloMessage(
  userId: string,
  userMessage: string
): Promise<{ response: string; messages: FloMessage[] }> {
  const { systemPrompt, allMessages, apiMessages } = await prepareFloCall(userId, userMessage);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: apiMessages,
  });

  const assistantContent =
    response.content[0]?.type === 'text' ? response.content[0].text : '';

  const messages = await finalizeFloCall(userId, allMessages, assistantContent);
  return { response: assistantContent, messages };
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
