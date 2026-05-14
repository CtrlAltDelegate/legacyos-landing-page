/**
 * PaperTrail Document Parser Service
 *
 * Extracts structured financial data from PDF documents using the Claude API.
 * Designed to be cleanly separable as a standalone product.
 *
 * Supported document types:
 *  - mortgage_statement
 *  - brokerage_statement
 *  - whole_life_statement
 *  - tax_return_1040
 *  - insurance_illustration
 *  - other
 *
 * Usage:
 *   const { parseDocument } = require('./documentParser');
 *   const result = await parseDocument({ s3Key, docType, userId });
 *   // result: { fields: {...}, confidence: 85, docType, rawText }
 */

const Anthropic = require('@anthropic-ai/sdk');
const { getObjectBuffer } = require('./s3');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Document type definitions ─────────────────────────────────────────────────
const DOC_TYPE_CONFIG = {
  mortgage_statement: {
    label: 'Mortgage Statement',
    description: 'Monthly mortgage statement from a lender',
    extractionPrompt: `Extract the following fields from this mortgage statement. Return ONLY valid JSON, no markdown:
{
  "asset_type": "real_estate",
  "lender_name": "string or null",
  "loan_number": "string or null",
  "property_address": "string or null",
  "current_principal_balance": "number or null (current outstanding loan balance)",
  "original_loan_amount": "number or null",
  "monthly_payment": "number or null (total P&I + escrow)",
  "principal_payment": "number or null",
  "interest_payment": "number or null",
  "escrow_payment": "number or null",
  "interest_rate": "number or null (as decimal, e.g. 0.065 for 6.5%)",
  "statement_date": "ISO date string or null",
  "next_payment_due": "ISO date string or null",
  "maturity_date": "ISO date string or null",
  "ytd_interest_paid": "number or null",
  "confidence_notes": "string — any ambiguities or values you are uncertain about"
}`,
    assetMapping: {
      mortgage_balance: 'current_principal_balance',
      address: 'property_address',
    },
  },

  brokerage_statement: {
    label: 'Brokerage Statement',
    description: 'Investment account statement from a broker',
    extractionPrompt: `Extract the following fields from this brokerage statement. Return ONLY valid JSON, no markdown:
{
  "asset_type": "equity",
  "brokerage_name": "string or null",
  "account_number": "string or null (last 4 digits only for security)",
  "account_type": "taxable|ira|roth_ira|401k|other or null",
  "statement_date": "ISO date string or null",
  "total_portfolio_value": "number or null",
  "total_cash": "number or null",
  "holdings": [
    {
      "ticker": "string",
      "name": "string or null",
      "shares": "number",
      "price_per_share": "number or null",
      "market_value": "number or null",
      "cost_basis": "number or null",
      "unrealized_gain_loss": "number or null"
    }
  ],
  "beginning_value": "number or null",
  "ending_value": "number or null",
  "period_return_percent": "number or null",
  "confidence_notes": "string — any ambiguities or values you are uncertain about"
}`,
    assetMapping: {},
  },

  whole_life_statement: {
    label: 'Whole Life Insurance Statement',
    description: 'Annual statement for a whole life insurance policy',
    extractionPrompt: `Extract the following fields from this whole life insurance policy statement. Return ONLY valid JSON, no markdown:
{
  "asset_type": "other",
  "category": "whole_life",
  "insurance_company": "string or null",
  "policy_number": "string or null",
  "insured_name": "string or null",
  "death_benefit": "number or null",
  "cash_surrender_value": "number or null (current CSV — this is the asset value)",
  "net_cash_value": "number or null (after surrender charges)",
  "outstanding_policy_loans": "number or null",
  "annual_premium": "number or null",
  "dividend_amount": "number or null (if participating policy)",
  "accumulated_dividends": "number or null",
  "statement_date": "ISO date string or null",
  "policy_date": "ISO date string or null",
  "confidence_notes": "string — any ambiguities or values you are uncertain about"
}`,
    assetMapping: {
      current_value: 'cash_surrender_value',
      name: 'insurance_company',
    },
  },

  tax_return_1040: {
    label: 'Federal Tax Return (1040)',
    description: 'IRS Form 1040 — US individual income tax return',
    extractionPrompt: `Extract the following fields from this 1040 tax return. Return ONLY valid JSON, no markdown:
{
  "asset_type": "summary",
  "tax_year": "number or null (e.g. 2023)",
  "filing_status": "single|married_filing_jointly|married_filing_separately|head_of_household|qualifying_widow or null",
  "total_income": "number or null (line 9)",
  "adjusted_gross_income": "number or null (line 11)",
  "taxable_income": "number or null (line 15)",
  "total_tax": "number or null (line 24)",
  "effective_tax_rate": "number or null (as decimal)",
  "w2_wages": "number or null (Schedule 1 or line 1a)",
  "business_income": "number or null (Schedule C net profit/loss)",
  "capital_gains": "number or null (Schedule D net gain/loss)",
  "ira_distributions": "number or null (line 4b)",
  "social_security_taxable": "number or null (line 6b)",
  "rental_income": "number or null (Schedule E)",
  "total_deductions": "number or null",
  "standard_or_itemized": "standard|itemized or null",
  "refund_amount": "number or null",
  "amount_owed": "number or null",
  "confidence_notes": "string — any ambiguities or values you are uncertain about"
}`,
    assetMapping: {},
  },

  insurance_illustration: {
    label: 'Insurance Illustration',
    description: 'Life insurance policy illustration showing projected values',
    extractionPrompt: `Extract the following fields from this insurance illustration. Return ONLY valid JSON, no markdown:
{
  "asset_type": "other",
  "category": "whole_life",
  "insurance_company": "string or null",
  "policy_type": "string or null (e.g. Whole Life, Universal Life, IUL, VUL)",
  "insured_name": "string or null",
  "insured_age": "number or null",
  "death_benefit": "number or null",
  "annual_premium": "number or null",
  "premium_paying_period": "string or null (e.g. '20 years', 'to age 65')",
  "guaranteed_csv_year_5": "number or null",
  "guaranteed_csv_year_10": "number or null",
  "guaranteed_csv_year_20": "number or null",
  "illustrated_csv_year_5": "number or null",
  "illustrated_csv_year_10": "number or null",
  "illustrated_csv_year_20": "number or null",
  "internal_rate_of_return": "number or null (if shown)",
  "illustration_date": "ISO date string or null",
  "confidence_notes": "string — any ambiguities or values you are uncertain about"
}`,
    assetMapping: {},
  },

  other: {
    label: 'Financial Document',
    description: 'General financial document',
    extractionPrompt: `Extract all financially relevant fields from this document. Return ONLY valid JSON, no markdown:
{
  "asset_type": "other",
  "document_title": "string or null",
  "institution_name": "string or null",
  "document_date": "ISO date string or null",
  "primary_value": "number or null (the most important dollar amount in this document)",
  "primary_value_label": "string or null (what does primary_value represent?)",
  "secondary_values": [
    { "label": "string", "value": "number" }
  ],
  "key_dates": [
    { "label": "string", "date": "ISO date string" }
  ],
  "notes": "string — brief summary of what this document contains",
  "confidence_notes": "string — any ambiguities or values you are uncertain about"
}`,
    assetMapping: {
      current_value: 'primary_value',
    },
  },
};

// ─── Main parse function ───────────────────────────────────────────────────────
/**
 * Parse a financial document stored in S3 using Claude API.
 *
 * @param {object} options
 * @param {string} options.s3Key - S3 object key for the PDF
 * @param {string} options.docType - One of the supported doc types
 * @param {string} [options.userId] - User ID for logging
 * @returns {Promise<{ fields: object, confidence: number, docType: string }>}
 */
async function parseDocument({ s3Key, docType = 'other', userId }) {
  const config = DOC_TYPE_CONFIG[docType] || DOC_TYPE_CONFIG.other;

  console.log(`[PaperTrail] Parsing ${config.label} for user ${userId}, key: ${s3Key}`);

  // Fetch the PDF from S3
  const { buffer, contentType } = await getObjectBuffer(s3Key);

  if (!buffer || buffer.length === 0) {
    throw new Error('Document is empty or could not be retrieved from storage');
  }

  // Convert to base64 for Claude's document API
  const base64Content = buffer.toString('base64');

  // Build the Claude API request
  const systemPrompt = `You are PaperTrail, an expert financial document parser. Your role is to extract structured financial data from documents with high accuracy.

Rules:
- Extract only what is explicitly stated in the document — never infer or estimate values that are not present
- Return dollar amounts as numbers (not strings), without currency symbols
- Return percentages as decimals (0.065 for 6.5%) unless the field name ends in "_percent"
- If a field is not present or unclear, set it to null
- Return ONLY valid JSON — no markdown, no code blocks, no explanation text
- Treat account numbers as sensitive: only include the last 4 digits if present
- If you encounter a value that could be interpreted multiple ways, pick the most financially conservative interpretation and note it in confidence_notes`;

  const userPrompt = `Please extract the following information from this ${config.label}:

${config.extractionPrompt}

Important: Return only the JSON object. Do not include any other text, markdown formatting, or code blocks.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: contentType === 'application/pdf' ? 'application/pdf' : 'application/pdf',
              data: base64Content,
            },
          },
          {
            type: 'text',
            text: userPrompt,
          },
        ],
      },
    ],
  });

  // Parse the JSON response
  const rawText = response.content[0]?.text || '';
  let fields;

  try {
    // Claude should return pure JSON; strip any accidental markdown fencing
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();
    fields = JSON.parse(cleaned);
  } catch (parseErr) {
    console.error('[PaperTrail] JSON parse failed. Raw response:', rawText.slice(0, 500));
    throw new Error(`Document parser returned invalid JSON: ${parseErr.message}`);
  }

  // Estimate confidence based on null field count
  const totalFields = Object.keys(fields).length;
  const nullFields = Object.values(fields).filter((v) => v === null).length;
  const nonMetaFields = totalFields - 1; // exclude confidence_notes
  const confidence = nonMetaFields > 0
    ? Math.round(((nonMetaFields - nullFields) / nonMetaFields) * 100)
    : 50;

  console.log(`[PaperTrail] Extracted ${totalFields} fields with ~${confidence}% confidence`);

  return {
    fields,
    confidence,
    docType,
    rawResponse: rawText,
    tokensUsed: response.usage?.input_tokens + response.usage?.output_tokens,
  };
}

/**
 * Get the list of supported document types and their metadata.
 * Useful for populating dropdowns in the frontend.
 */
function getSupportedDocTypes() {
  return Object.entries(DOC_TYPE_CONFIG).map(([key, config]) => ({
    value: key,
    label: config.label,
    description: config.description,
  }));
}

module.exports = { parseDocument, getSupportedDocTypes };
