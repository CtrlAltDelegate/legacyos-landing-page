import { prisma } from '../lib/prisma';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AssetBreakdown {
  equityValue: number;
  realEstateValue: number;   // adjusted equity (adjustedValue - mortgageBalance)
  otherValue: number;
  restrictedValue: number;   // tracked separately, never in net worth
}

export interface DriftAlert {
  assetClass: string;
  actualPct: number;
  targetPct: number;
  drift: number;             // positive = overweight, negative = underweight
  direction: 'over' | 'under';
}

export interface RealEstateCashOnCash {
  assetId: string;
  name: string;
  annualCashFlow: number;
  cashInvested: number;
  cashOnCashReturn: number;  // percentage
}

export interface NetWorthResult {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  breakdown: AssetBreakdown;
  totalMortgageBalance: number;
  totalOtherDebt: number;
  driftAlerts: DriftAlert[];
  cashOnCashReturns: RealEstateCashOnCash[];
  // Equity-specific
  equityAssets: Array<{
    id: string;
    name: string;
    ticker: string | null;
    currentValue: number;
    sharesHeld: number;
    isPretax: boolean;
    afterTaxValue?: number;
    accountLabel: string | null;
  }>;
}

// ─── Core calculation ─────────────────────────────────────────────────────────

/**
 * Calculate the current net worth for a user.
 * Follows the spec exactly:
 *
 * total_assets = SUM(currentValue) for equity + other (non-restricted, active)
 *              + SUM(adjustedValue - mortgageBalance) for real_estate
 *
 * total_liabilities = SUM(mortgageBalance) from real_estate
 *                   + SUM(balance) from liabilities table
 *
 * net_worth = total_assets - total_liabilities
 *
 * restricted_total = SUM(currentValue) for restricted class — never in net_worth
 */
export async function calculateNetWorth(userId: string): Promise<NetWorthResult> {
  const [assets, liabilities, goals, user] = await Promise.all([
    prisma.asset.findMany({
      where: { userId, isActive: true },
    }),
    prisma.liability.findMany({
      where: { userId, isActive: true },
    }),
    prisma.goal.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { assumedTaxRate: true },
    }),
  ]);

  const taxRate = Number(user?.assumedTaxRate ?? 25) / 100;

  // ─── Asset totals by class ────────────────────────────────────────────────

  let equityValue = 0;
  let realEstateValue = 0;  // equity portion (adjusted - mortgage)
  let otherValue = 0;
  let restrictedValue = 0;
  let totalMortgageBalance = 0;

  const equityAssets: NetWorthResult['equityAssets'] = [];

  for (const asset of assets) {
    switch (asset.assetClass) {
      case 'equity': {
        const val = Number(asset.currentValue ?? 0);
        equityValue += val;
        const row: NetWorthResult['equityAssets'][0] = {
          id: asset.id,
          name: asset.name,
          ticker: asset.ticker,
          currentValue: val,
          sharesHeld: Number(asset.sharesHeld ?? 0),
          isPretax: asset.isPretax,
          accountLabel: asset.accountLabel,
        };
        if (asset.isPretax) {
          row.afterTaxValue = parseFloat((val * (1 - taxRate)).toFixed(2));
        }
        equityAssets.push(row);
        break;
      }

      case 'real_estate': {
        // Use adjustedValue (91% of estimated), fall back to estimatedValue
        const adjusted = Number(asset.adjustedValue ?? asset.estimatedValue ?? 0);
        const mortgage = Number(asset.mortgageBalance ?? 0);
        const equity = adjusted - mortgage;
        realEstateValue += equity;
        totalMortgageBalance += mortgage;
        break;
      }

      case 'other': {
        otherValue += Number(asset.currentValue ?? 0);
        break;
      }

      case 'restricted': {
        // Tracked but NEVER added to net worth
        restrictedValue += Number(asset.currentValue ?? 0);
        break;
      }
    }
  }

  // ─── Liabilities ──────────────────────────────────────────────────────────

  const totalOtherDebt = liabilities.reduce((sum, l) => sum + Number(l.balance), 0);
  const totalLiabilities = parseFloat((totalMortgageBalance + totalOtherDebt).toFixed(2));

  // ─── Totals ───────────────────────────────────────────────────────────────

  const totalAssets = parseFloat((equityValue + realEstateValue + otherValue).toFixed(2));
  const netWorth = parseFloat((totalAssets - totalLiabilities).toFixed(2));

  // ─── Allocation drift detection ───────────────────────────────────────────

  const driftAlerts: DriftAlert[] = [];

  if (goals && totalAssets > 0) {
    const allocations: Array<{ class: string; value: number; targetPct: number }> = [
      { class: 'equity', value: equityValue, targetPct: Number(goals.targetEquityPct) },
      { class: 'real_estate', value: realEstateValue, targetPct: Number(goals.targetRealEstatePct) },
      { class: 'cash', value: 0, targetPct: Number(goals.targetCashPct) },
      { class: 'business', value: 0, targetPct: Number(goals.targetBusinessPct) },
      { class: 'insurance', value: 0, targetPct: Number(goals.targetInsurancePct) },
      { class: 'other', value: otherValue, targetPct: Number(goals.targetOtherPct) },
    ];

    for (const alloc of allocations) {
      const actualPct = parseFloat(((alloc.value / totalAssets) * 100).toFixed(1));
      const drift = parseFloat((actualPct - alloc.targetPct).toFixed(1));

      if (Math.abs(drift) > 5) {
        driftAlerts.push({
          assetClass: alloc.class,
          actualPct,
          targetPct: alloc.targetPct,
          drift,
          direction: drift > 0 ? 'over' : 'under',
        });
      }
    }
  }

  // ─── Cash-on-cash returns (rental properties) ─────────────────────────────

  const cashOnCashReturns: RealEstateCashOnCash[] = [];

  for (const asset of assets) {
    if (
      asset.assetClass === 'real_estate' &&
      asset.monthlyRent != null &&
      asset.monthlyPiti != null &&
      asset.purchasePrice != null
    ) {
      const monthlyRent = Number(asset.monthlyRent);
      const monthlyPiti = Number(asset.monthlyPiti);
      const purchasePrice = Number(asset.purchasePrice);

      const annualCashFlow = parseFloat(((monthlyRent - monthlyPiti) * 12).toFixed(2));
      // Assumes 20% down; will use actual if known
      const cashInvested = parseFloat((purchasePrice * 0.2).toFixed(2));
      const cashOnCashReturn = cashInvested > 0
        ? parseFloat(((annualCashFlow / cashInvested) * 100).toFixed(2))
        : 0;

      cashOnCashReturns.push({
        assetId: asset.id,
        name: asset.name,
        annualCashFlow,
        cashInvested,
        cashOnCashReturn,
      });
    }
  }

  return {
    totalAssets,
    totalLiabilities,
    netWorth,
    breakdown: {
      equityValue: parseFloat(equityValue.toFixed(2)),
      realEstateValue: parseFloat(realEstateValue.toFixed(2)),
      otherValue: parseFloat(otherValue.toFixed(2)),
      restrictedValue: parseFloat(restrictedValue.toFixed(2)),
    },
    totalMortgageBalance: parseFloat(totalMortgageBalance.toFixed(2)),
    totalOtherDebt: parseFloat(totalOtherDebt.toFixed(2)),
    driftAlerts,
    cashOnCashReturns,
    equityAssets,
  };
}

// ─── Snapshot capture ─────────────────────────────────────────────────────────

/**
 * Capture the current net worth as a monthly snapshot.
 * Uses upsert — if a snapshot already exists for today's date, it updates it.
 */
export async function captureSnapshot(userId: string): Promise<void> {
  const nw = await calculateNetWorth(userId);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  await prisma.netWorthSnapshot.upsert({
    where: { userId_snapshotDate: { userId, snapshotDate: today } },
    create: {
      userId,
      snapshotDate: today,
      totalAssets: nw.totalAssets,
      totalLiabilities: nw.totalLiabilities,
      netWorth: nw.netWorth,
      equityValue: nw.breakdown.equityValue,
      realEstateValue: nw.breakdown.realEstateValue,
      otherValue: nw.breakdown.otherValue,
      restrictedValue: nw.breakdown.restrictedValue,
      totalMortgageBalance: nw.totalMortgageBalance,
      totalOtherDebt: nw.totalOtherDebt,
    },
    update: {
      totalAssets: nw.totalAssets,
      totalLiabilities: nw.totalLiabilities,
      netWorth: nw.netWorth,
      equityValue: nw.breakdown.equityValue,
      realEstateValue: nw.breakdown.realEstateValue,
      otherValue: nw.breakdown.otherValue,
      restrictedValue: nw.breakdown.restrictedValue,
      totalMortgageBalance: nw.totalMortgageBalance,
      totalOtherDebt: nw.totalOtherDebt,
    },
  });
}
