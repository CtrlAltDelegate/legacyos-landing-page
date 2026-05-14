import { NetWorthResult } from '../networth';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FloUserContext {
  fullName: string;
  primaryGoal: string | null;
  targetMonthlyIncome: number | null;
  riskTolerance: string | null;
  assumedTaxRate: number;
  netWorth: NetWorthResult;
}

// ─── System prompt builder ────────────────────────────────────────────────────

/**
 * Builds Flo's system prompt by injecting a live snapshot of the user's
 * financial picture. Called fresh on every chat turn so the data is never stale.
 *
 * Compliance guardrail baked in: Flo provides information and education,
 * never personalized investment advice. This is non-negotiable.
 */
export function buildFloSystemPrompt(ctx: FloUserContext): string {
  const { fullName, primaryGoal, targetMonthlyIncome, riskTolerance, assumedTaxRate, netWorth } = ctx;

  const {
    netWorth: nw,
    totalAssets,
    totalLiabilities,
    breakdown,
    driftAlerts,
    cashOnCashReturns,
  } = netWorth;

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  // ── Portfolio snapshot ─────────────────────────────────────────────────────
  const portfolioLines = [
    `Net worth: ${fmt(nw)}`,
    `Total assets: ${fmt(totalAssets)}`,
    `Total liabilities: ${fmt(totalLiabilities)}`,
    ``,
    `Asset breakdown:`,
    `  Equity:           ${fmt(breakdown.equityValue)}`,
    `  Real estate:      ${fmt(breakdown.realEstateValue)}`,
    `  Other/cash:       ${fmt(breakdown.otherValue)}`,
    `  Restricted (not in net worth): ${fmt(breakdown.restrictedValue)}`,
  ];

  // ── Drift alerts ───────────────────────────────────────────────────────────
  const driftLines =
    driftAlerts.length > 0
      ? [
          ``,
          `Allocation drift alerts (>5% from goal):`,
          ...driftAlerts.map(
            (a) =>
              `  - ${a.assetClass}: target ${a.targetPct}%, actual ${a.actualPct.toFixed(1)}% (${a.direction})`
          ),
        ]
      : [];

  // ── Cash-on-cash returns ───────────────────────────────────────────────────
  const cocLines =
    cashOnCashReturns.length > 0
      ? [
          ``,
          `Real estate cash-on-cash returns:`,
          ...cashOnCashReturns.map(
            (r) => `  - ${r.name}: ${r.cashOnCashReturn.toFixed(2)}% annualized`
          ),
        ]
      : [];

  // ── Goals ─────────────────────────────────────────────────────────────────
  const goalLines = [
    ``,
    `User goals:`,
    `  Primary goal:           ${primaryGoal ?? 'Not set'}`,
    `  Target monthly income:  ${targetMonthlyIncome != null ? fmt(targetMonthlyIncome) : 'Not set'}`,
    `  Risk tolerance:         ${riskTolerance ?? 'Not set'}`,
    `  Assumed tax rate:       ${assumedTaxRate}%`,
  ];

  const portfolioSnapshot = [
    ...portfolioLines,
    ...driftLines,
    ...cocLines,
    ...goalLines,
  ].join('\n');

  // ── Full system prompt ─────────────────────────────────────────────────────
  return `You are Flo, an AI financial companion inside LegacyOS — a private wealth OS for families building lasting legacies.

You are speaking with ${fullName}.

## Your role
- Help ${fullName} understand their financial picture, track progress toward goals, and think clearly about wealth decisions
- Surface insights from their portfolio data, explain financial concepts in plain English, and ask thoughtful questions
- Be warm, direct, and substantive — like a knowledgeable friend who happens to understand finance deeply

## COMPLIANCE — NON-NEGOTIABLE
- You provide financial INFORMATION and EDUCATION only — never personalized investment advice
- Never tell the user to buy, sell, or hold any specific security
- Never predict market movements or guarantee returns
- If asked for specific investment recommendations, acknowledge the question genuinely, then explain you can share information and frameworks but the user should consult a licensed financial advisor for personalized advice
- You may discuss general principles, historical context, trade-offs, and what questions to ask an advisor

## Current portfolio snapshot (as of today)
${portfolioSnapshot}

## Conversation style
- Lead with insight, not disclaimers — only mention compliance when directly relevant
- Use the portfolio data naturally — reference their actual numbers, not placeholders
- When drift alerts are present, weave them in proactively if the conversation touches allocations
- Keep responses focused: 2-4 paragraphs unless the question clearly calls for more depth
- Use plain dollar amounts and percentages — avoid jargon unless the user introduces it first
- Today's date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
}
