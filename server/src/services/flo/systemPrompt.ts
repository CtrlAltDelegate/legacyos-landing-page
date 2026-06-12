import { NetWorthResult } from '../networth';
import type { Nudge } from '../nudges';
import { METRIC_META } from '../metrics';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TaxSummary {
  taxYear: number | null;
  agi: number | null;
  federalTax: number | null;
  stateTax: number | null;
  totalTax: number | null;
  effectiveTaxRate: number | null;  // %
  estimatedQuarterlyPayment: number | null;
}

export interface RecentMetricPoint {
  metricType: string;
  value: number;
  recordedDate: Date;
  metricLabel: string | null;
}

export interface FloUserContext {
  fullName: string;
  primaryGoal: string | null;
  targetMonthlyIncome: number | null;
  riskTolerance: string | null;
  assumedTaxRate: number;
  netWorth: NetWorthResult;
  familyProfile: Record<string, unknown> | null;
  taxSummary: TaxSummary | null;
  nudges: Nudge[];
  recentMetrics: RecentMetricPoint[];
}

// ─── Family profile field labels ─────────────────────────────────────────────

const FAMILY_LABELS: Record<string, string> = {
  is_married:               'Married / partnered',
  has_kids:                 'Has children',
  num_kids:                 'Number of children',
  co_parent_relationship:   'Co-parent relationship quality',
  has_elderly_dependents:   'Has elderly dependents',
  home_status:              'Home ownership',
  has_mortgage:             'Has a mortgage',
  monthly_rent_range:       'Monthly rent range',
  has_vehicle:              'Has a vehicle',
  vehicle_status:           'Vehicle ownership type',
  has_multiple_vehicles:    'Has multiple vehicles',
  vehicle2_status:          'Second vehicle type',
  has_health_insurance:     'Has health insurance',
  has_life_insurance:       'Has life insurance',
  has_disability_insurance: 'Has disability insurance',
  has_umbrella_policy:      'Has umbrella liability policy',
  has_will:                 'Has a will',
  has_trust:                'Has a living trust',
  beneficiaries_designated: 'Beneficiaries designated on accounts',
  has_power_of_attorney:    'Has power of attorney',
  is_self_employed:         'Self-employed',
  has_business_entity:      'Has a business entity (LLC/S-corp)',
  has_business_partner:     'Has a business partner',
  has_other_income:         'Has other income sources',
  income_range:             'Annual household income range',
  is_primary_earner:        'Primary earner in household',
  has_emergency_fund:       'Has emergency fund (3+ months)',
  is_actively_investing:    'Actively investing',
};

// ─── System prompt builder ────────────────────────────────────────────────────

/**
 * Builds Flo's system prompt by injecting a live snapshot of the user's
 * financial picture and family context. Called fresh on every chat turn.
 *
 * Compliance guardrail baked in: Flo provides information and education,
 * never personalized investment advice. This is non-negotiable.
 */
export function buildFloSystemPrompt(ctx: FloUserContext): string {
  const { fullName, primaryGoal, targetMonthlyIncome, riskTolerance, assumedTaxRate, netWorth, familyProfile, taxSummary, nudges, recentMetrics } = ctx;

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

  // ── Family profile ─────────────────────────────────────────────────────────
  const familyLines: string[] = [];
  if (familyProfile && Object.keys(familyProfile).length > 0) {
    familyLines.push(``, `Family & life context:`);
    for (const [key, value] of Object.entries(familyProfile)) {
      if (value === null || value === undefined || value === '') continue;
      const label = FAMILY_LABELS[key] ?? key.replace(/_/g, ' ');
      const display = typeof value === 'boolean'
        ? (value ? 'Yes' : 'No')
        : String(value);
      familyLines.push(`  ${label}: ${display}`);
    }
  } else {
    familyLines.push(``, `Family & life context: Not yet provided`);
  }

  // ── Tax context ────────────────────────────────────────────────────────────
  const taxLines: string[] = [];
  if (taxSummary) {
    taxLines.push(``, `Tax context (from most recent confirmed return):`);
    if (taxSummary.taxYear) taxLines.push(`  Tax year:                     ${taxSummary.taxYear}`);
    if (taxSummary.agi != null)   taxLines.push(`  Adjusted gross income (AGI):  ${fmt(taxSummary.agi)}`);
    if (taxSummary.totalTax != null) taxLines.push(`  Total tax owed (fed + state): ${fmt(taxSummary.totalTax)}`);
    if (taxSummary.effectiveTaxRate != null) taxLines.push(`  Effective tax rate:          ${taxSummary.effectiveTaxRate}%`);
    if (taxSummary.estimatedQuarterlyPayment != null)
      taxLines.push(`  Est. quarterly payment (÷4):  ${fmt(taxSummary.estimatedQuarterlyPayment)}`);
  }

  // ── Recent confirmed metrics ───────────────────────────────────────────────
  const metricsLines: string[] = [];
  if (recentMetrics.length > 0) {
    metricsLines.push(``, `Recent financial metrics (from confirmed documents):`);
    for (const m of recentMetrics) {
      const meta = METRIC_META[m.metricType];
      const label = m.metricLabel ?? meta?.label ?? m.metricType.replace(/_/g, ' ');
      const dateStr = m.recordedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const formatted =
        meta?.format === 'percent'
          ? `${m.value.toFixed(1)}%`
          : fmt(m.value);
      metricsLines.push(`  ${label}: ${formatted} (${dateStr})`);
    }
  }

  // ── Active nudges ──────────────────────────────────────────────────────────
  const nudgeLines: string[] = [];
  if (nudges.length > 0) {
    nudgeLines.push(``, `Active insights (surface these proactively when relevant):`);
    for (const n of nudges) {
      nudgeLines.push(`  [${n.severity.toUpperCase()}] ${n.title}: ${n.message}`);
    }
  }

  const portfolioSnapshot = [
    ...portfolioLines,
    ...driftLines,
    ...cocLines,
    ...goalLines,
    ...familyLines,
    ...taxLines,
    ...metricsLines,
    ...nudgeLines,
  ].join('\n');

  // ── Full system prompt ─────────────────────────────────────────────────────
  return `You are Flo, an AI financial companion inside LegacyOS — a private wealth OS for families building lasting legacies.

You are speaking with ${fullName}.

## Your role
- Help ${fullName} understand their financial picture, track progress toward goals, and think clearly about wealth decisions
- Surface insights from their portfolio data, explain financial concepts in plain English, and ask thoughtful questions
- Be warm, direct, and substantive — like a knowledgeable friend who happens to understand finance deeply
- Use the family context (kids, insurance coverage, estate documents, etc.) to make advice relevant to their actual life situation

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
- When family context is available, weave it in naturally (e.g. if they have kids and no will, proactively flag the gap)
- When drift alerts are present, weave them in proactively if the conversation touches allocations
- Keep responses focused: 2-4 paragraphs unless the question clearly calls for more depth
- Use plain dollar amounts and percentages — avoid jargon unless the user introduces it first
- Today's date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
}
