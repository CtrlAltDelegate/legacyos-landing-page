import Anthropic from '@anthropic-ai/sdk';
import { getObjectAsBuffer } from '../s3';
import { buildExtractionSystemPrompt, EXTRACTION_PROMPTS } from './prompts';
import { detectAnomalies } from './anomaly';
import { DocumentType, ParseResult, ParsedData, AnomalyFlag } from './types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// ─── Main parse function ──────────────────────────────────────────────────────

/**
 * PaperTrail core: fetch PDF from S3, send to Claude API, return structured data.
 *
 * This function is intentionally standalone:
 * - Receives: S3 key + document type
 * - Returns: structured JSON (ParseResult)
 * - Writes nothing to the database — the caller decides what to do with the result
 *
 * This design means it can be extracted into its own product later without refactoring.
 */
export async function parseDocument(
  s3Key: string,
  documentType: DocumentType
): Promise<ParseResult> {
  // 1. Fetch the PDF from S3 as a buffer
  const pdfBuffer = await getObjectAsBuffer(s3Key);
  const pdfBase64 = pdfBuffer.toString('base64');

  // 2. Build the prompt for this document type
  const extractionPrompt = EXTRACTION_PROMPTS[documentType] ?? EXTRACTION_PROMPTS['unknown'];
  const systemPrompt = buildExtractionSystemPrompt();

  // 3. Call Claude API with the PDF as a document content block
  const response = await client.messages.create({
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
              media_type: 'application/pdf',
              data: pdfBase64,
            },
          },
          {
            type: 'text',
            text: extractionPrompt,
          },
        ],
      },
    ],
  });

  const rawResponse = response.content[0]?.type === 'text' ? response.content[0].text : '';

  // 4. Parse the JSON response — strip any accidental markdown fences
  const cleaned = rawResponse
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let parsedData: ParsedData;
  let confidence = 80; // default if not returned

  try {
    const parsed = JSON.parse(cleaned);
    // Extract and remove the _confidence field if Claude included it
    if (typeof parsed._confidence === 'number') {
      confidence = parsed._confidence;
      delete parsed._confidence;
    }
    parsedData = parsed;
  } catch {
    // If JSON parse fails, return a structured error object so the UI can show it
    parsedData = {
      _parse_error: 'Could not extract structured data from this document.',
      _raw_text: rawResponse.slice(0, 500),
    };
    confidence = 0;
  }

  return {
    documentType,
    parsedData,
    confidence,
    rawResponse,
  };
}

// ─── Anomaly check wrapper ────────────────────────────────────────────────────

/**
 * After a user confirms parsed data, check for anomalies vs the asset's
 * previous value. Returns flags to be surfaced in Flo chat.
 */
export function checkForAnomalies(
  documentType: DocumentType,
  confirmedData: ParsedData,
  previousAssetValue: number | null
): AnomalyFlag[] {
  return detectAnomalies(documentType, confirmedData, previousAssetValue);
}
