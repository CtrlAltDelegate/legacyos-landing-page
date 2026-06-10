import { DocumentType } from './types';

// ─── Extraction prompts per document type ─────────────────────────────────────
// Each prompt instructs Claude to return ONLY valid JSON — no preamble, no markdown.
// The schema matches the TypeScript types in types.ts exactly.

export const EXTRACTION_PROMPTS: Record<DocumentType, string> = {
  mortgage_statement: `Extract the following fields from this mortgage statement.
Return ONLY valid JSON — no explanation, no markdown, no code fences.
If a field cannot be found, use null.

{
  "lender_name": string | null,
  "property_address": string | null,
  "statement_date": "YYYY-MM-DD" | null,
  "remaining_balance": number | null,
  "monthly_payment": number | null,
  "principal_portion": number | null,
  "interest_portion": number | null,
  "escrow_portion": number | null,
  "interest_rate": number | null,
  "next_payment_due": "YYYY-MM-DD" | null
}`,

  brokerage_statement: `Extract the following fields from this brokerage statement.
Return ONLY valid JSON — no explanation, no markdown, no code fences.
If a field cannot be found, use null. For holdings, return an empty array if none found.

{
  "institution": string | null,
  "account_type": string | null,
  "statement_date": "YYYY-MM-DD" | null,
  "total_value": number | null,
  "holdings": [
    {
      "ticker": string | null,
      "name": string | null,
      "shares": number | null,
      "price_per_share": number | null,
      "total_value": number | null,
      "unrealized_gain_loss": number | null
    }
  ],
  "cash_balance": number | null,
  "total_realized_gain_loss_ytd": number | null
}`,

  whole_life_statement: `Extract the following fields from this whole life insurance statement.
Return ONLY valid JSON — no explanation, no markdown, no code fences.
If a field cannot be found, use null.

{
  "insurer": string | null,
  "policy_number": string | null,
  "statement_date": "YYYY-MM-DD" | null,
  "death_benefit": number | null,
  "cash_surrender_value": number | null,
  "outstanding_loan_balance": number | null,
  "annual_premium": number | null,
  "dividend_credited": number | null
}`,

  tax_return: `Extract the following fields from this tax return (Form 1040 or similar).
Return ONLY valid JSON — no explanation, no markdown, no code fences.
If a field cannot be found, use null.

{
  "tax_year": number | null,
  "filing_status": string | null,
  "total_income": number | null,
  "w2_wages": number | null,
  "business_income": number | null,
  "rental_income": number | null,
  "dividend_income": number | null,
  "capital_gains": number | null,
  "adjusted_gross_income": number | null,
  "federal_tax_owed": number | null,
  "state_tax_owed": number | null
}`,

  insurance_policy: `Extract the following fields from this insurance policy document.
Return ONLY valid JSON — no explanation, no markdown, no code fences.
If a field cannot be found, use null.

{
  "insurer": string | null,
  "policy_number": string | null,
  "policy_type": string | null,
  "insured_name": string | null,
  "face_value": number | null,
  "annual_premium": number | null,
  "effective_date": "YYYY-MM-DD" | null,
  "expiration_date": "YYYY-MM-DD" | null
}`,

  bank_statement: `Extract the following fields from this bank statement.
Return ONLY valid JSON — no explanation, no markdown, no code fences.
If a field cannot be found, use null. For transaction_categories, return an empty array if none found.

{
  "institution": string | null,
  "account_type": string | null,
  "statement_date": "YYYY-MM-DD" | null,
  "ending_balance": number | null,
  "average_daily_balance": number | null,
  "total_deposits": number | null,
  "total_withdrawals": number | null,
  "transaction_categories": [
    {
      "category": string,
      "amount": number
    }
  ]
}`,

  retirement_401k: `Extract the following fields from this retirement account statement (401k, IRA, 403b, etc.).
Return ONLY valid JSON — no explanation, no markdown, no code fences.
If a field cannot be found, use null. For holdings, return an empty array if none found.

{
  "institution": string | null,
  "account_type": string | null,
  "statement_date": "YYYY-MM-DD" | null,
  "total_value": number | null,
  "vested_balance": number | null,
  "employer_match_ytd": number | null,
  "employee_contribution_ytd": number | null,
  "holdings": [
    {
      "name": string,
      "allocation_pct": number | null,
      "value": number | null
    }
  ]
}`,

  trust_document: `Extract the following fields from this trust document (living trust, revocable trust, irrevocable trust, etc.).
Return ONLY valid JSON — no explanation, no markdown, no code fences.
If a field cannot be found, use null. For lists, return an empty array if none found.

{
  "trust_name": string | null,
  "trust_type": string | null,
  "grantor": string | null,
  "trustee": string | null,
  "successor_trustee": string | null,
  "execution_date": "YYYY-MM-DD" | null,
  "beneficiaries": [
    {
      "name": string,
      "relationship": string | null,
      "share_pct": number | null
    }
  ],
  "assets_mentioned": [
    {
      "description": string,
      "estimated_value": number | null
    }
  ]
}`,

  business_financials: `Extract the following fields from this business financial statement (P&L, income statement, balance sheet, etc.).
Return ONLY valid JSON — no explanation, no markdown, no code fences.
If a field cannot be found, use null.

{
  "business_name": string | null,
  "period": string | null,
  "total_revenue": number | null,
  "cost_of_goods_sold": number | null,
  "gross_profit": number | null,
  "operating_expenses": number | null,
  "net_income": number | null,
  "total_assets": number | null,
  "total_liabilities": number | null,
  "owners_equity": number | null
}`,

  paystub: `Extract the following fields from this pay stub / paycheck.
Return ONLY valid JSON — no explanation, no markdown, no code fences.
If a field cannot be found, use null.

{
  "employer_name": string | null,
  "employee_name": string | null,
  "pay_period_start": "YYYY-MM-DD" | null,
  "pay_period_end": "YYYY-MM-DD" | null,
  "pay_date": "YYYY-MM-DD" | null,
  "gross_pay": number | null,
  "net_pay": number | null,
  "federal_tax_withheld": number | null,
  "state_tax_withheld": number | null,
  "social_security_withheld": number | null,
  "medicare_withheld": number | null,
  "retirement_contribution": number | null,
  "ytd_gross": number | null
}`,

  w2: `Extract the following fields from this W-2 Wage and Tax Statement.
Return ONLY valid JSON — no explanation, no markdown, no code fences.
If a field cannot be found, use null.

{
  "employer_name": string | null,
  "employee_name": string | null,
  "tax_year": number | null,
  "wages_tips": number | null,
  "federal_income_tax_withheld": number | null,
  "social_security_wages": number | null,
  "social_security_tax_withheld": number | null,
  "medicare_wages": number | null,
  "medicare_tax_withheld": number | null,
  "state_wages": number | null,
  "state_income_tax": number | null
}`,

  form_1099: `Extract the following fields from this 1099 form (1099-NEC, 1099-DIV, 1099-INT, 1099-B, or similar).
Return ONLY valid JSON — no explanation, no markdown, no code fences.
If a field cannot be found, use null.

{
  "payer_name": string | null,
  "recipient_name": string | null,
  "tax_year": number | null,
  "form_type": string | null,
  "total_income": number | null,
  "federal_tax_withheld": number | null,
  "state_tax_withheld": number | null
}`,

  auto_loan: `Extract the following fields from this auto loan statement.
Return ONLY valid JSON — no explanation, no markdown, no code fences.
If a field cannot be found, use null.

{
  "lender_name": string | null,
  "vehicle_description": string | null,
  "statement_date": "YYYY-MM-DD" | null,
  "remaining_balance": number | null,
  "monthly_payment": number | null,
  "interest_rate": number | null,
  "next_payment_due": "YYYY-MM-DD" | null,
  "payoff_amount": number | null,
  "original_loan_amount": number | null
}`,

  student_loan: `Extract the following fields from this student loan statement.
Return ONLY valid JSON — no explanation, no markdown, no code fences.
If a field cannot be found, use null.

{
  "servicer_name": string | null,
  "borrower_name": string | null,
  "statement_date": "YYYY-MM-DD" | null,
  "total_outstanding_balance": number | null,
  "monthly_payment": number | null,
  "interest_rate": number | null,
  "next_payment_due": "YYYY-MM-DD" | null,
  "repayment_plan": string | null,
  "loan_forgiveness_eligible": boolean | null
}`,

  credit_card_statement: `Extract the following fields from this credit card statement.
Return ONLY valid JSON — no explanation, no markdown, no code fences.
If a field cannot be found, use null.

{
  "issuer_name": string | null,
  "account_last_four": string | null,
  "statement_date": "YYYY-MM-DD" | null,
  "statement_balance": number | null,
  "minimum_payment": number | null,
  "payment_due_date": "YYYY-MM-DD" | null,
  "credit_limit": number | null,
  "available_credit": number | null,
  "apr": number | null,
  "rewards_balance": number | null
}`,

  property_tax: `Extract the following fields from this property tax bill or assessment.
Return ONLY valid JSON — no explanation, no markdown, no code fences.
If a field cannot be found, use null.

{
  "assessor_parcel_number": string | null,
  "property_address": string | null,
  "tax_year": number | null,
  "assessed_value": number | null,
  "annual_tax_amount": number | null,
  "installment_amount": number | null,
  "due_date": "YYYY-MM-DD" | null,
  "tax_rate": number | null
}`,

  unknown: `Extract any financially relevant information from this document.
Return ONLY valid JSON — no explanation, no markdown, no code fences.
Use whatever fields are present and relevant. Example structure:

{
  "document_description": string,
  "key_values": { [label: string]: number | string | null },
  "dates": { [label: string]: string | null }
}`,
};

/**
 * Build the full system prompt for document extraction.
 * Keeps PaperTrail's extraction concerns separate from Flo's chat concerns.
 */
export function buildExtractionSystemPrompt(): string {
  return `You are a financial document parser. Your only job is to extract structured data from financial documents.

Rules:
- Return ONLY valid JSON. No preamble, no explanation, no markdown formatting, no code fences.
- If a numeric field appears as a formatted string (e.g. "$1,234.56"), convert it to a plain number (1234.56).
- If a field is not present in the document, return null for that field.
- Do not invent or estimate values — only extract what is explicitly stated.
- For dates, always use YYYY-MM-DD format.
- At the end of your JSON, include a "_confidence" field (0-100) representing your confidence in the extraction accuracy.`;
}
