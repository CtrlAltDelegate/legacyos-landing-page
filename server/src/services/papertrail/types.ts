// PaperTrail — shared TypeScript types
// This service is intentionally standalone — no tight coupling to other services.
// It receives a document, returns structured JSON, writes nothing directly.

export type DocumentType =
  | 'mortgage_statement'
  | 'brokerage_statement'
  | 'whole_life_statement'
  | 'tax_return'
  | 'insurance_policy'
  | 'bank_statement'
  | 'retirement_401k'
  | 'trust_document'
  | 'business_financials'
  | 'paystub'
  | 'w2'
  | 'form_1099'
  | 'auto_loan'
  | 'student_loan'
  | 'credit_card_statement'
  | 'property_tax'
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

export interface BankStatementExtraction {
  institution: string | null;
  account_type: string | null;        // 'checking', 'savings', 'money_market'
  statement_date: string | null;      // YYYY-MM-DD
  ending_balance: number | null;
  average_daily_balance: number | null;
  total_deposits: number | null;
  total_withdrawals: number | null;
  transaction_categories: Array<{
    category: string;
    amount: number;
  }>;
}

export interface RetirementExtraction {
  institution: string | null;
  account_type: string | null;        // '401k', 'roth_ira', 'traditional_ira', '403b', etc.
  statement_date: string | null;
  total_value: number | null;
  vested_balance: number | null;
  employer_match_ytd: number | null;
  employee_contribution_ytd: number | null;
  holdings: Array<{
    name: string;
    allocation_pct: number | null;
    value: number | null;
  }>;
}

export interface TrustDocumentExtraction {
  trust_name: string | null;
  trust_type: string | null;          // 'revocable', 'irrevocable', 'testamentary'
  grantor: string | null;
  trustee: string | null;
  successor_trustee: string | null;
  execution_date: string | null;      // YYYY-MM-DD
  beneficiaries: Array<{
    name: string;
    relationship: string | null;
    share_pct: number | null;
  }>;
  assets_mentioned: Array<{
    description: string;
    estimated_value: number | null;
  }>;
}

export interface BusinessFinancialsExtraction {
  business_name: string | null;
  period: string | null;              // e.g. 'FY 2024', 'Q3 2024'
  total_revenue: number | null;
  cost_of_goods_sold: number | null;
  gross_profit: number | null;
  operating_expenses: number | null;
  net_income: number | null;
  total_assets: number | null;
  total_liabilities: number | null;
  owners_equity: number | null;
}

export interface PaystubExtraction {
  employer_name: string | null;
  employee_name: string | null;
  pay_period_start: string | null;    // YYYY-MM-DD
  pay_period_end: string | null;      // YYYY-MM-DD
  pay_date: string | null;            // YYYY-MM-DD
  gross_pay: number | null;
  net_pay: number | null;
  federal_tax_withheld: number | null;
  state_tax_withheld: number | null;
  social_security_withheld: number | null;
  medicare_withheld: number | null;
  retirement_contribution: number | null;
  ytd_gross: number | null;
}

export interface W2Extraction {
  employer_name: string | null;
  employee_name: string | null;
  tax_year: number | null;
  wages_tips: number | null;
  federal_income_tax_withheld: number | null;
  social_security_wages: number | null;
  social_security_tax_withheld: number | null;
  medicare_wages: number | null;
  medicare_tax_withheld: number | null;
  state_wages: number | null;
  state_income_tax: number | null;
}

export interface Form1099Extraction {
  payer_name: string | null;
  recipient_name: string | null;
  tax_year: number | null;
  form_type: string | null;           // '1099-NEC', '1099-DIV', '1099-INT', '1099-B', etc.
  total_income: number | null;
  federal_tax_withheld: number | null;
  state_tax_withheld: number | null;
}

export interface AutoLoanExtraction {
  lender_name: string | null;
  vehicle_description: string | null;
  statement_date: string | null;      // YYYY-MM-DD
  remaining_balance: number | null;
  monthly_payment: number | null;
  interest_rate: number | null;
  next_payment_due: string | null;    // YYYY-MM-DD
  payoff_amount: number | null;
  original_loan_amount: number | null;
}

export interface StudentLoanExtraction {
  servicer_name: string | null;
  borrower_name: string | null;
  statement_date: string | null;      // YYYY-MM-DD
  total_outstanding_balance: number | null;
  monthly_payment: number | null;
  interest_rate: number | null;
  next_payment_due: string | null;    // YYYY-MM-DD
  repayment_plan: string | null;
  loan_forgiveness_eligible: boolean | null;
}

export interface CreditCardExtraction {
  issuer_name: string | null;
  account_last_four: string | null;
  statement_date: string | null;      // YYYY-MM-DD
  statement_balance: number | null;
  minimum_payment: number | null;
  payment_due_date: string | null;    // YYYY-MM-DD
  credit_limit: number | null;
  available_credit: number | null;
  apr: number | null;
  rewards_balance: number | null;
}

export interface PropertyTaxExtraction {
  assessor_parcel_number: string | null;
  property_address: string | null;
  tax_year: number | null;
  assessed_value: number | null;
  annual_tax_amount: number | null;
  installment_amount: number | null;
  due_date: string | null;            // YYYY-MM-DD
  tax_rate: number | null;
}

export type ParsedData =
  | MortgageExtraction
  | BrokerageExtraction
  | WholeLifeExtraction
  | TaxReturnExtraction
  | InsurancePolicyExtraction
  | BankStatementExtraction
  | RetirementExtraction
  | TrustDocumentExtraction
  | BusinessFinancialsExtraction
  | PaystubExtraction
  | W2Extraction
  | Form1099Extraction
  | AutoLoanExtraction
  | StudentLoanExtraction
  | CreditCardExtraction
  | PropertyTaxExtraction
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
