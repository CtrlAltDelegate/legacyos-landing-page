import { prisma } from '../lib/prisma';
import { calculateNetWorth, type NetWorthResult } from './networth';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Nudge {
  key: string;
  category: 'emergency_fund' | 'debt' | 'portfolio' | 'tax' | 'milestone';
  title: string;
  message: string;
  severity: 'info' | 'tip' | 'warn';
  learnMoreId?: string;
}

// ─── Milestone copy ───────────────────────────────────────────────────────────

const MILESTONES = [100_000, 250_000, 500_000, 1_000_000];

const MILESTONE_TIPS: Record<number, string> = {
  100_000: "The first $100k is widely considered the hardest — compounding starts working meaningfully for you from here. Focus on maximizing tax-advantaged contributions.",
  250_000: "Review your estate plan: confirm beneficiaries are designated on all accounts and ensure your insurance coverage reflects your current life stage.",
  500_000: "Tax efficiency becomes increasingly impactful at this level. Roth conversions during lower-income years, tax-loss harvesting, and asset location can add meaningfully to long-term returns.",
  1_000_000: "Following the 4% rule, a $1M portfolio can sustain ~$40,000/year in withdrawals indefinitely. A good moment to work with a fee-only fiduciary advisor on your withdrawal strategy.",
};

// ─── Generator ────────────────────────────────────────────────────────────────

/**
 * Evaluate rule-based nudges for a user.
 * Pass `preloadedNetWorth` to skip a redundant DB call when the caller
 * (e.g. Flo context loader) already has the net worth computed.
 */
export async function generateNudges(
  userId: string,
  preloadedNetWorth?: NetWorthResult,
): Promise<Nudge[]> {
  const nudges: Nudge[] = [];

  const [user, netWorthResult, metricsRows, familyProfile, taxDoc] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { dismissedNudges: true },
    }),
    preloadedNetWorth ? Promise.resolve(preloadedNetWorth) : calculateNetWorth(userId),
    prisma.financialMetric.findMany({
      where: { userId },
      orderBy: { recordedDate: 'desc' },
      select: { metricType: true, value: true },
    }),
    prisma.familyProfile.findUnique({
      where: { userId },
      select: { answers: true, completedAt: true },
    }),
    prisma.document.findFirst({
      where: { userId, documentType: 'tax_return', parseStatus: 'confirmed' },
      orderBy: { confirmedAt: 'desc' },
      select: { parsedData: true },
    }),
  ]);

  const dismissed = new Set(user?.dismissedNudges ?? []);
  const profile = familyProfile?.completedAt
    ? (familyProfile.answers as Record<string, unknown>)
    : null;

  // Latest value per metric type (rows are ordered desc, first wins)
  const latestMetric: Record<string, number> = {};
  for (const m of metricsRows) {
    if (!(m.metricType in latestMetric)) {
      latestMetric[m.metricType] = Number(m.value);
    }
  }

  const { netWorth: nw, totalAssets, breakdown } = netWorthResult;
  const cashValue = breakdown.otherValue;   // "Other/cash" bucket
  const equityValue = breakdown.equityValue;
  const realEstateValue = breakdown.realEstateValue;

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  // ── 1. Emergency Fund ─────────────────────────────────────────────────────
  if (!dismissed.has('low_emergency_fund')) {
    const profileSaysNo = profile?.has_emergency_fund === false || profile?.has_emergency_fund === 'false';
    const lowCash = cashValue > 0 && cashValue < 12_000;
    if (profileSaysNo || lowCash) {
      const monthlyGross = latestMetric['gross_income'] ? latestMetric['gross_income'] / 12 : null;
      const months = monthlyGross && cashValue > 0
        ? (cashValue / monthlyGross).toFixed(1)
        : null;
      nudges.push({
        key: 'low_emergency_fund',
        category: 'emergency_fund',
        title: 'Emergency Fund Check',
        message: months
          ? `Your liquid cash (${fmt(cashValue)}) covers roughly ${months} months of gross income. Most frameworks recommend 3-6 months of living expenses in a high-yield savings account (HYSA) before investing aggressively.`
          : `Your liquid cash reserves appear low. Most frameworks recommend 3-6 months of living expenses in an accessible, high-yield savings account before investing additional capital.`,
        severity: 'warn',
        learnMoreId: 'emergency_fund',
      });
    }
  }

  // ── 2. Credit Card Debt ───────────────────────────────────────────────────
  if (!dismissed.has('credit_card_debt')) {
    const ccBalance = latestMetric['credit_card_balance'];
    if (ccBalance && ccBalance > 0) {
      nudges.push({
        key: 'credit_card_debt',
        category: 'debt',
        title: 'High-Interest Debt Detected',
        message: `You have ${fmt(ccBalance)} tracked in credit card balances. At typical 20-25% APR, this debt costs more than almost any investment can return. The debt avalanche method — minimum payments on all cards, extra to the highest APR — minimizes total interest paid.`,
        severity: 'warn',
        learnMoreId: 'debt_payoff',
      });
    }
  }

  // ── 3. Equity Concentration ───────────────────────────────────────────────
  if (!dismissed.has('equity_concentration') && totalAssets > 50_000) {
    const investable = totalAssets - realEstateValue;
    if (investable > 10_000) {
      const equityPct = (equityValue / investable) * 100;
      if (equityPct > 90) {
        nudges.push({
          key: 'equity_concentration',
          category: 'portfolio',
          title: 'Portfolio Concentration',
          message: `Your investable portfolio is ${equityPct.toFixed(0)}% in equities. A fully equity allocation maximizes long-term growth potential but has historically experienced 40-50% peak-to-trough drawdowns. Consider whether your time horizon and risk tolerance align with this concentration.`,
          severity: 'tip',
          learnMoreId: 'asset_allocation',
        });
      }
    }
  }

  // ── 4. Tax Optimization ───────────────────────────────────────────────────
  if (!dismissed.has('tax_optimization')) {
    let effectiveTaxRate: number | null = latestMetric['effective_tax_rate'] ?? null;
    if (!effectiveTaxRate && taxDoc?.parsedData) {
      const d = taxDoc.parsedData as Record<string, number>;
      const agi = d.adjusted_gross_income ?? 0;
      const totalTax = (d.federal_tax_owed ?? 0) + (d.state_tax_owed ?? 0);
      if (agi > 0) effectiveTaxRate = parseFloat(((totalTax / agi) * 100).toFixed(1));
    }
    if (effectiveTaxRate && effectiveTaxRate > 20) {
      nudges.push({
        key: 'tax_optimization',
        category: 'tax',
        title: 'Tax Optimization Opportunity',
        message: `Your effective tax rate is ${effectiveTaxRate}%. Every dollar contributed to a traditional 401k or IRA reduces taxable income dollar-for-dollar — saving ~${effectiveTaxRate.toFixed(0)} cents per dollar contributed. The 2025 401k limit is $23,500 ($31,000 if 50+).`,
        severity: 'tip',
        learnMoreId: 'roth_vs_traditional',
      });
    }
  }

  // ── 5. Quarterly Taxes (Self-Employed) ────────────────────────────────────
  if (!dismissed.has('quarterly_taxes')) {
    const isSelfEmployed = profile?.is_self_employed === true || profile?.is_self_employed === 'true';
    if (isSelfEmployed) {
      let quarterlyEst: number | null = null;
      if (taxDoc?.parsedData) {
        const d = taxDoc.parsedData as Record<string, number>;
        const totalTax = (d.federal_tax_owed ?? 0) + (d.state_tax_owed ?? 0);
        if (totalTax > 0) quarterlyEst = totalTax / 4;
      }
      nudges.push({
        key: 'quarterly_taxes',
        category: 'tax',
        title: 'Quarterly Tax Reminder',
        message: quarterlyEst
          ? `As a self-employed individual, the IRS requires quarterly estimated payments. Based on your last return, your estimated quarterly payment is ~${fmt(quarterlyEst)}. Due dates: April 15, June 16, September 15, January 15.`
          : `As a self-employed individual, the IRS requires quarterly estimated tax payments. Due dates: April 15, June 16, September 15, January 15. Underpayment penalties apply if you owe more than $1,000 at filing.`,
        severity: 'warn',
        learnMoreId: 'quarterly_taxes',
      });
    }
  }

  // ── 6. Net Worth Milestone ─────────────────────────────────────────────────
  for (const milestone of MILESTONES) {
    const milestoneKey = `milestone_${milestone}`;
    if (!dismissed.has(milestoneKey) && nw >= milestone && nw < milestone * 2.5) {
      const fmtM = milestone >= 1_000_000
        ? `$${(milestone / 1_000_000).toFixed(0)}M`
        : `$${(milestone / 1_000).toFixed(0)}k`;
      nudges.push({
        key: milestoneKey,
        category: 'milestone',
        title: `${fmtM} Net Worth Milestone`,
        message: MILESTONE_TIPS[milestone],
        severity: 'info',
      });
      break; // show only the most relevant milestone
    }
  }

  return nudges;
}
