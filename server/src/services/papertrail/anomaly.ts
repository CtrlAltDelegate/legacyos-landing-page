import { AnomalyFlag, MortgageExtraction, BrokerageExtraction, WholeLifeExtraction, ParsedData } from './types';

// ─── Thresholds ───────────────────────────────────────────────────────────────

const MORTGAGE_DROP_THRESHOLD = 5_000;   // $5,000 drop triggers flag
const PORTFOLIO_SWING_THRESHOLD = 0.15;  // 15% change triggers flag

// ─── Anomaly detection ────────────────────────────────────────────────────────

/**
 * Compare newly parsed document data against the asset's previous known value
 * and return any anomaly flags. These are surfaced in Flo chat after confirmation.
 *
 * This function is pure — it receives data and returns flags, writes nothing.
 */
export function detectAnomalies(
  documentType: string,
  parsedData: ParsedData,
  previousValue: number | null
): AnomalyFlag[] {
  const flags: AnomalyFlag[] = [];

  switch (documentType) {
    case 'mortgage_statement':
      flags.push(...detectMortgageAnomalies(parsedData as MortgageExtraction, previousValue));
      break;

    case 'brokerage_statement':
      flags.push(...detectBrokerageAnomalies(parsedData as BrokerageExtraction, previousValue));
      break;

    case 'whole_life_statement':
      flags.push(...detectWholeLifeAnomalies(parsedData as WholeLifeExtraction, previousValue));
      break;
  }

  return flags;
}

// ─── Per-type detectors ───────────────────────────────────────────────────────

function detectMortgageAnomalies(
  data: MortgageExtraction,
  previousBalance: number | null
): AnomalyFlag[] {
  const flags: AnomalyFlag[] = [];
  const newBalance = data.remaining_balance;

  if (newBalance == null || previousBalance == null) return flags;

  const drop = previousBalance - newBalance;

  if (drop > MORTGAGE_DROP_THRESHOLD) {
    const formatted = drop.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    flags.push({
      type: 'mortgage_drop',
      severity: 'warn',
      message: `Your mortgage balance dropped ${formatted} since the last statement — was this a refinance or an extra payment?`,
      oldValue: previousBalance,
      newValue: newBalance,
    });
  }

  return flags;
}

function detectBrokerageAnomalies(
  data: BrokerageExtraction,
  previousValue: number | null
): AnomalyFlag[] {
  const flags: AnomalyFlag[] = [];
  const newValue = data.total_value;

  if (newValue == null || previousValue == null || previousValue === 0) return flags;

  const changePct = Math.abs((newValue - previousValue) / previousValue);

  if (changePct > PORTFOLIO_SWING_THRESHOLD) {
    const direction = newValue > previousValue ? 'increased' : 'decreased';
    const pctFormatted = (changePct * 100).toFixed(1);
    flags.push({
      type: 'portfolio_swing',
      severity: 'warn',
      message: `Your portfolio value ${direction} by ${pctFormatted}% since the last statement. Worth reviewing if this was expected.`,
      oldValue: previousValue,
      newValue,
      changePct: parseFloat(pctFormatted),
    });
  }

  return flags;
}

function detectWholeLifeAnomalies(
  data: WholeLifeExtraction,
  previousCashValue: number | null
): AnomalyFlag[] {
  const flags: AnomalyFlag[] = [];
  const newCashValue = data.cash_surrender_value;

  if (newCashValue == null || previousCashValue == null) return flags;

  if (newCashValue < previousCashValue) {
    const drop = previousCashValue - newCashValue;
    const formatted = drop.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    flags.push({
      type: 'cash_value_decrease',
      severity: 'warn',
      message: `Your whole life cash surrender value decreased by ${formatted} — was a policy loan taken out?`,
      oldValue: previousCashValue,
      newValue: newCashValue,
    });
  }

  return flags;
}
