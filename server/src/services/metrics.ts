import { DocumentType } from './papertrail/types';

export interface MetricPoint {
  metricType: string;
  metricLabel: string;
  value: number;
  recordedDate: Date;
}

type D = Record<string, unknown>;

function num(v: unknown): number | null {
  const n = Number(v);
  return v != null && v !== '' && !isNaN(n) ? n : null;
}

function date(v: unknown): Date | null {
  if (!v || typeof v !== 'string') return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function push(
  out: MetricPoint[],
  metricType: string,
  metricLabel: string,
  value: unknown,
  recordedDate: unknown,
) {
  const v = num(value);
  const d = date(recordedDate as string);
  if (v !== null && d !== null) out.push({ metricType, metricLabel, value: v, recordedDate: d });
}

/**
 * Extract time-series metric points from a confirmed document's data.
 * Each point maps to one row in financial_metrics.
 */
export function extractMetrics(
  documentType: DocumentType,
  data: D,
): MetricPoint[] {
  const out: MetricPoint[] = [];

  switch (documentType) {
    case 'paystub': {
      const employer = (data.employer_name as string) ?? 'Employer';
      push(out, 'gross_income',  `${employer} — gross pay`,  data.gross_pay,  data.pay_date);
      push(out, 'net_income',    `${employer} — net pay`,    data.net_pay,    data.pay_date);
      break;
    }

    case 'w2': {
      const employer = (data.employer_name as string) ?? 'Employer';
      const taxYear  = data.tax_year ? String(data.tax_year) : null;
      const refDate  = taxYear ? `${taxYear}-12-31` : null;
      push(out, 'annual_income', `${employer} — W-2 wages (${taxYear ?? 'unknown year'})`, data.wages_tips, refDate);
      break;
    }

    case 'form_1099': {
      const payer    = (data.payer_name as string) ?? 'Payer';
      const formType = (data.form_type as string) ?? '1099';
      const taxYear  = data.tax_year ? String(data.tax_year) : null;
      const refDate  = taxYear ? `${taxYear}-12-31` : null;
      push(out, 'annual_income', `${payer} — ${formType} (${taxYear ?? 'unknown year'})`, data.total_income, refDate);
      break;
    }

    case 'mortgage_statement': {
      const lender = (data.lender_name as string) ?? 'Mortgage';
      push(out, 'loan_balance', `${lender} — remaining balance`, data.remaining_balance, data.statement_date);
      push(out, 'monthly_payment', `${lender} — monthly payment`, data.monthly_payment, data.statement_date);
      break;
    }

    case 'auto_loan': {
      const lender  = (data.lender_name as string) ?? 'Auto loan';
      const vehicle = (data.vehicle_description as string) ?? '';
      const label   = vehicle ? `${lender} — ${vehicle}` : lender;
      push(out, 'loan_balance',    `${label} — balance`,         data.remaining_balance, data.statement_date);
      push(out, 'monthly_payment', `${label} — monthly payment`, data.monthly_payment,   data.statement_date);
      break;
    }

    case 'student_loan': {
      const servicer = (data.servicer_name as string) ?? 'Student loan';
      push(out, 'loan_balance',    `${servicer} — balance`,         data.total_outstanding_balance, data.statement_date);
      push(out, 'monthly_payment', `${servicer} — monthly payment`, data.monthly_payment,            data.statement_date);
      break;
    }

    case 'credit_card_statement': {
      const issuer = (data.issuer_name as string) ?? 'Credit card';
      const last4  = data.account_last_four ? ` ···${data.account_last_four}` : '';
      push(out, 'credit_card_balance', `${issuer}${last4} — balance`, data.statement_balance, data.statement_date);
      break;
    }

    case 'bank_statement': {
      const institution = (data.institution as string) ?? 'Bank';
      const acctType    = (data.account_type as string) ?? '';
      const label       = acctType ? `${institution} ${acctType}` : institution;
      push(out, 'bank_balance', `${label} — ending balance`, data.ending_balance, data.statement_date);
      break;
    }

    case 'retirement_401k': {
      const institution = (data.institution as string) ?? 'Retirement account';
      const acctType    = (data.account_type as string) ?? '';
      const label       = acctType ? `${institution} ${acctType}` : institution;
      push(out, 'retirement_balance', `${label} — total value`, data.total_value, data.statement_date);
      if (data.employee_contribution_ytd) {
        push(out, 'retirement_contribution_ytd', `${label} — employee contributions YTD`, data.employee_contribution_ytd, data.statement_date);
      }
      break;
    }

    case 'brokerage_statement': {
      const institution = (data.institution as string) ?? 'Brokerage';
      push(out, 'brokerage_value', `${institution} — total value`, data.total_value, data.statement_date);
      break;
    }

    case 'whole_life_statement': {
      const insurer = (data.insurer as string) ?? 'Whole life';
      push(out, 'cash_value', `${insurer} — cash surrender value`, data.cash_surrender_value, data.statement_date);
      break;
    }

    case 'property_tax': {
      const address = (data.property_address as string) ?? 'Property';
      const taxYear = data.tax_year ? String(data.tax_year) : null;
      const refDate = taxYear ? `${taxYear}-12-31` : null;
      push(out, 'property_assessed_value', `${address} — assessed value`,   data.assessed_value,    refDate ?? data.due_date);
      push(out, 'annual_property_tax',     `${address} — annual tax (${taxYear ?? ''})`, data.annual_tax_amount, refDate ?? data.due_date);
      break;
    }

    case 'tax_return': {
      const taxYear = data.tax_year ? String(data.tax_year) : null;
      const refDate = taxYear ? `${taxYear}-12-31` : null;
      push(out, 'federal_tax_liability', `Federal tax liability (${taxYear ?? 'unknown'})`, data.federal_tax_owed, refDate);
      push(out, 'adjusted_gross_income', `AGI (${taxYear ?? 'unknown'})`,                   data.adjusted_gross_income, refDate);
      // Derive effective tax rate if possible
      const agi = num(data.adjusted_gross_income);
      const fed = num(data.federal_tax_owed);
      if (agi && agi > 0 && fed !== null) {
        out.push({
          metricType:   'effective_tax_rate',
          metricLabel:  `Effective tax rate (${taxYear ?? 'unknown'})`,
          value:        parseFloat(((fed / agi) * 100).toFixed(2)),
          recordedDate: refDate ? new Date(refDate) : new Date(),
        });
      }
      break;
    }

    case 'business_financials': {
      const biz    = (data.business_name as string) ?? 'Business';
      const period = (data.period as string) ?? '';
      const label  = period ? `${biz} (${period})` : biz;
      const refDate = new Date(); // period is a string like 'FY 2024', use now as fallback
      const periodDate = period.match(/\d{4}/) ? `${period.match(/\d{4}/)![0]}-12-31` : null;
      push(out, 'business_revenue',    `${label} — revenue`,    data.total_revenue, periodDate ?? refDate.toISOString());
      push(out, 'business_net_income', `${label} — net income`, data.net_income,    periodDate ?? refDate.toISOString());
      break;
    }

    // No quantitative time-series for these types
    case 'insurance_policy':
    case 'trust_document':
    case 'unknown':
    default:
      break;
  }

  return out;
}

// ─── Metric metadata ─────────────────────────────────────────────────────────
// Used for display labels, icons, and formatting on the Trends page.

export interface MetricMeta {
  label: string;
  category: string;
  format: 'currency' | 'percent' | 'number';
  color: string;
  description: string;
}

export const METRIC_META: Record<string, MetricMeta> = {
  gross_income:               { label: 'Gross income',            category: 'Income',      format: 'currency', color: '#22c55e', description: 'Pre-tax pay per paycheck' },
  net_income:                 { label: 'Net income',              category: 'Income',      format: 'currency', color: '#16a34a', description: 'Take-home pay per paycheck' },
  annual_income:              { label: 'Annual income',           category: 'Income',      format: 'currency', color: '#15803d', description: 'W-2 or 1099 income by year' },
  loan_balance:               { label: 'Loan balance',            category: 'Debt',        format: 'currency', color: '#ef4444', description: 'Outstanding loan balance over time' },
  monthly_payment:            { label: 'Monthly payment',         category: 'Debt',        format: 'currency', color: '#f97316', description: 'Monthly debt payment' },
  credit_card_balance:        { label: 'Credit card balance',     category: 'Debt',        format: 'currency', color: '#dc2626', description: 'Credit card statement balance' },
  bank_balance:               { label: 'Bank balance',            category: 'Banking',     format: 'currency', color: '#3b82f6', description: 'Checking/savings ending balance' },
  retirement_balance:         { label: 'Retirement balance',      category: 'Investments', format: 'currency', color: '#8b5cf6', description: '401k / IRA total value' },
  retirement_contribution_ytd:{ label: 'Retirement contributions YTD', category: 'Investments', format: 'currency', color: '#7c3aed', description: 'Employee contributions year-to-date' },
  brokerage_value:            { label: 'Brokerage value',         category: 'Investments', format: 'currency', color: '#6366f1', description: 'Taxable brokerage account value' },
  cash_value:                 { label: 'Cash value',              category: 'Insurance',   format: 'currency', color: '#0ea5e9', description: 'Whole life insurance cash surrender value' },
  property_assessed_value:    { label: 'Assessed value',          category: 'Real Estate', format: 'currency', color: '#f59e0b', description: 'County assessed property value' },
  annual_property_tax:        { label: 'Annual property tax',     category: 'Real Estate', format: 'currency', color: '#d97706', description: 'Annual property tax bill' },
  federal_tax_liability:      { label: 'Federal tax liability',   category: 'Tax',         format: 'currency', color: '#64748b', description: 'Federal income tax owed per year' },
  adjusted_gross_income:      { label: 'Adjusted gross income',   category: 'Tax',         format: 'currency', color: '#475569', description: 'AGI from tax return' },
  effective_tax_rate:         { label: 'Effective tax rate',      category: 'Tax',         format: 'percent',  color: '#94a3b8', description: 'Federal tax as % of AGI' },
  business_revenue:           { label: 'Business revenue',        category: 'Business',    format: 'currency', color: '#10b981', description: 'Total revenue from P&L' },
  business_net_income:        { label: 'Business net income',     category: 'Business',    format: 'currency', color: '#059669', description: 'Net income from P&L' },
};
