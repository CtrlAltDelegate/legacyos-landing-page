// PaperTrail — shared TypeScript types
// This service is intentionally standalone — no tight coupling to other services.
// It receives a document, returns structured JSON, writes nothing directly.

export type DocumentType =
  | 'mortgage_statement'
  | 'brokerage_statement'
  | 'whole_life_statement'
  | 'tax_return'
  | 'insurance_policy'
  | 'unknown';

// ─── Extracted data shapes per document type ──────────────────────────────────

export interface MortgageExtraction {
  lender_name: string | null;
  property_address: string | null;
  statement_date: string | null;       // YYYY-MM-DD
  remaining_balance: number | null;
  monthly_payment: number | null;
  principal_portion: number | null;
  interest_portion: number | null;
  escrow_portion: number | null;
  interest_rate: number | null;
  next_payment_due: string | null;     // YYYY-MM-DD
}

export interface BrokerageHolding {
  ticker: string | null;
  name: string | null;
  shares: number | null;
  price_per_share: number | null;
  total_value: number | null;
  unrealized_gain_loss: number | null;
}

export interface BrokerageExtraction {
  institution: string | null;
  account_type: string | null;
  statement_date: string | null;
  total_value: number | null;
  holdings: BrokerageHolding[];
  cash_balance: number | null;
  total_realized_gain_loss_ytd: number | null;
}

export interface WholeLifeExtraction {
  insurer: string | null;
  policy_number: string | null;
  statement_date: string | null;
  death_benefit: number | null;
  cash_surrender_value: number | null;
  outstanding_loan_balance: number | null;
  annual_premium: number | null;
  dividend_credited: number | null;
}

export interface TaxReturnExtraction {
  tax_year: number | null;
  filing_status: string | null;
  total_income: number | null;
  w2_wages: number | null;
  business_income: number | null;
  rental_income: number | null;
  dividend_income: number | null;
  capital_gains: number | null;
  adjusted_gross_income: number | null;
  federal_tax_owed: number | null;
  state_tax_owed: number | null;
}

export interface InsurancePolicyExtraction {
  insurer: string | null;
  policy_number: string | null;
  policy_type: string | null;
  insured_name: string | null;
  face_value: number | null;
  annual_premium: number | null;
  effective_date: string | null;
  expiration_date: string | null;
}

export type ParsedData =
  | MortgageExtraction
  | BrokerageExtraction
  | WholeLifeExtraction
  | TaxReturnExtraction
  | InsurancePolicyExtraction
  | Record<string, unknown>;

// ─── Parse result ─────────────────────────────────────────────────────────────

export interface ParseResult {
  documentType: DocumentType;
  parsedData: ParsedData;
  confidence: number;   // 0–100, Claude's self-assessed confidence
  rawResponse: string;  // full Claude response text for debugging
}

// ─── Anomaly flag ─────────────────────────────────────────────────────────────

export interface AnomalyFlag {
  type: 'mortgage_drop' | 'portfolio_swing' | 'cash_value_decrease' | 'general';
  message: string;       // human-readable, shown in Flo chat
  severity: 'info' | 'warn';
  oldValue?: number;
  newValue?: number;
  changePct?: number;
}
