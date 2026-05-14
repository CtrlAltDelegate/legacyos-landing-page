import { DriftAlert } from '../networth';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserGoalContext {
  primaryGoal: string | null;
  targetMonthlyIncome: number | null;
  riskTolerance: string | null;
  emergencyFundMonths: number | null;
  targetEquityPct: number;
  targetRealEstatePct: number;
  targetCashPct: number;
}

export interface PrioritySignal {
  type: string;
  priority: 'high' | 'medium' | 'low';
  message: string;
}

// ─── Priority signal generator ────────────────────────────────────────────────

/**
 * Derives conversational priority signals from the user's goals and current
 * portfolio state. These are injected into Flo's first-message context and
 * used by the frontend to surface proactive nudges.
 *
 * Pure function — reads data, returns signals, writes nothing.
 */
export function buildPrioritySignals(
  goals: UserGoalContext,
  driftAlerts: DriftAlert[],
  netWorth: number,
  totalLiabilities: number
): PrioritySignal[] {
  const signals: PrioritySignal[] = [];

  // ── Allocation drift ───────────────────────────────────────────────────────
  const highDrift = driftAlerts.filter((a) => Math.abs(a.actualPct - a.targetPct) > 10);
  const moderateDrift = driftAlerts.filter(
    (a) => Math.abs(a.actualPct - a.targetPct) > 5 && Math.abs(a.actualPct - a.targetPct) <= 10
  );

  if (highDrift.length > 0) {
    signals.push({
      type: 'allocation_drift_high',
      priority: 'high',
      message: `Allocation is significantly off-target for: ${highDrift
        .map((a) => `${a.assetClass} (${a.direction} by ${Math.abs(a.actualPct - a.targetPct).toFixed(1)}%)`)
        .join(', ')}. Worth discussing rebalancing options.`,
    });
  } else if (moderateDrift.length > 0) {
    signals.push({
      type: 'allocation_drift_moderate',
      priority: 'medium',
      message: `Moderate allocation drift detected in: ${moderateDrift
        .map((a) => a.assetClass)
        .join(', ')}. May be worth reviewing against goals.`,
    });
  }

  // ── Goal-specific signals ──────────────────────────────────────────────────
  switch (goals.primaryGoal) {
    case 'retirement':
      signals.push({
        type: 'goal_retirement',
        priority: 'medium',
        message:
          goals.targetMonthlyIncome != null
            ? `User is targeting $${goals.targetMonthlyIncome.toLocaleString()}/month in retirement income. Surface progress toward this when discussing portfolio.`
            : 'User has retirement as primary goal but no monthly income target set. Consider prompting them to set one.',
      });
      break;

    case 'wealth_transfer':
      signals.push({
        type: 'goal_wealth_transfer',
        priority: 'medium',
        message:
          'User is focused on wealth transfer / legacy planning. Estate planning, insurance adequacy, and beneficiary alignment are relevant topics.',
      });
      break;

    case 'financial_independence':
      signals.push({
        type: 'goal_fi',
        priority: 'medium',
        message:
          goals.targetMonthlyIncome != null
            ? `User is pursuing financial independence targeting $${goals.targetMonthlyIncome.toLocaleString()}/month. Cash flow, passive income, and withdrawal rate conversations are relevant.`
            : 'User is pursuing financial independence. Consider surfacing cash flow and passive income insights.',
      });
      break;

    case 'real_estate_growth':
      signals.push({
        type: 'goal_real_estate',
        priority: 'medium',
        message:
          'User is focused on growing real estate holdings. Cash-on-cash returns, equity build, and portfolio concentration are relevant topics.',
      });
      break;
  }

  // ── Debt-to-asset ratio ────────────────────────────────────────────────────
  if (netWorth > 0 && totalLiabilities > 0) {
    const debtToAsset = totalLiabilities / (netWorth + totalLiabilities);
    if (debtToAsset > 0.5) {
      signals.push({
        type: 'high_leverage',
        priority: 'high',
        message: `Liabilities represent ${(debtToAsset * 100).toFixed(0)}% of total assets. Leverage is elevated — debt reduction or cash flow protection may be worth discussing.`,
      });
    }
  }

  // ── Risk tolerance mismatch signal ────────────────────────────────────────
  if (goals.riskTolerance === 'conservative' && goals.targetEquityPct > 60) {
    signals.push({
      type: 'risk_mismatch',
      priority: 'medium',
      message:
        'User selected conservative risk tolerance but has a high equity allocation target. May be worth exploring whether goals and risk profile are aligned.',
    });
  }

  // ── Emergency fund check ───────────────────────────────────────────────────
  if (goals.emergencyFundMonths != null && goals.emergencyFundMonths < 3) {
    signals.push({
      type: 'emergency_fund_low',
      priority: 'high',
      message: `Emergency fund target is set to ${goals.emergencyFundMonths} months — below the recommended 3-6 month minimum. Liquidity resilience is a relevant conversation.`,
    });
  }

  return signals;
}
