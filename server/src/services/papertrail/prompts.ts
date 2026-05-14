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
