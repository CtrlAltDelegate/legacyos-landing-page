import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parse as parseCsvSync } from 'csv-parse/sync';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase();
    if (
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'text/plain' ||
      ext.endsWith('.csv') ||
      ext.endsWith('.pdf')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and PDF files are supported.'));
    }
  },
});

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface ParsedCategory {
  name: string;
  type: 'income' | 'expense';
  amount: number;    // monthly dollar amount
  metricType: string; // maps to FinancialMetric.metricType
}

export interface ParseResult {
  format: string;
  detectedPeriod?: string;
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  categories: ParsedCategory[];
  confidence: 'high' | 'medium' | 'low';
  notes: string;
  rawPreview?: Record<string, string>[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toMetricType(name: string, type: 'income' | 'expense'): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return `monthly_${type}_${slug}`;
}

function stripCurrencyChars(val: string): number {
  return parseFloat(val.replace(/[$,\s()]/g, '').replace(/^\((.+)\)$/, '-$1')) || 0;
}

// ─── Direct CSV parsers ───────────────────────────────────────────────────────

function parseBankStatementCsv(
  rows: Record<string, string>[],
  headers: string[],
): ParseResult {
  const amtKey = headers.find(h => /^amount$/i.test(h)) ??
    headers.find(h => /amount/i.test(h)) ??
    headers.find(h => /debit|credit/i.test(h)) ?? '';
  const catKey = headers.find(h => /category/i.test(h)) ?? '';

  const categoryTotals: Record<string, number> = {};
  let totalIncome = 0;
  let totalExpenses = 0;

  for (const row of rows) {
    const rawAmt = row[amtKey] ?? row[Object.keys(row).find(k => /amount/i.test(k)) ?? ''] ?? '0';
    const amt = stripCurrencyChars(rawAmt);
    const cat = catKey ? (row[catKey] || 'Uncategorized') : 'Uncategorized';

    if (amt > 0) {
      totalIncome += amt;
      categoryTotals[`Income — ${cat}`] = (categoryTotals[`Income — ${cat}`] ?? 0) + amt;
    } else if (amt < 0) {
      totalExpenses += Math.abs(amt);
      categoryTotals[cat] = (categoryTotals[cat] ?? 0) + Math.abs(amt);
    }
  }

  const categories: ParsedCategory[] = Object.entries(categoryTotals)
    .filter(([, v]) => v > 10)
    .map(([name, amount]) => ({
      name,
      type: name.startsWith('Income') ? 'income' : 'expense',
      amount,
      metricType: toMetricType(name, name.startsWith('Income') ? 'income' : 'expense'),
    }));

  return {
    format: 'bank_statement',
    totalIncome,
    totalExpenses,
    netCashFlow: totalIncome - totalExpenses,
    categories,
    confidence: 'medium',
    notes: `Bank statement CSV — ${rows.length} transactions parsed. Amounts shown are totals for the statement period, not yet normalized to monthly.`,
    rawPreview: rows.slice(0, 5),
  };
}

function parseGenericBudgetCsv(
  rows: Record<string, string>[],
  headers: string[],
): ParseResult {
  const amtKey = headers.find(h => /amount|value|total/i.test(h)) ?? '';
  const typeKey = headers.find(h => /^type$/i.test(h) || /^transaction.?type$/i.test(h)) ?? '';
  const catKey = headers.find(h => /category|description|name/i.test(h)) ?? '';

  let totalIncome = 0;
  let totalExpenses = 0;
  const categoryTotals: Record<string, { type: 'income' | 'expense'; amount: number }> = {};

  for (const row of rows) {
    const amt = Math.abs(stripCurrencyChars(row[amtKey] ?? '0'));
    const cat = row[catKey] || 'Other';
    const rawType = (row[typeKey] ?? '').toLowerCase();
    const type: 'income' | 'expense' = rawType.includes('income') || rawType.includes('credit')
      ? 'income' : 'expense';

    if (type === 'income') totalIncome += amt;
    else totalExpenses += amt;

    if (!categoryTotals[cat]) categoryTotals[cat] = { type, amount: 0 };
    categoryTotals[cat].amount += amt;
  }

  const categories: ParsedCategory[] = Object.entries(categoryTotals)
    .filter(([, v]) => v.amount > 10)
    .map(([name, { type, amount }]) => ({
      name, type, amount,
      metricType: toMetricType(name, type),
    }));

  return {
    format: 'income_expense_sheet',
    totalIncome,
    totalExpenses,
    netCashFlow: totalIncome - totalExpenses,
    categories,
    confidence: 'medium',
    notes: 'Generic income/expense CSV parsed.',
    rawPreview: rows.slice(0, 5),
  };
}

// ─── Claude-powered extraction (CSV text or PDF bytes) ────────────────────────

const EXTRACT_PROMPT = `Extract financial summary data and return ONLY valid JSON with no markdown:

{
  "format": "quickbooks_pl" | "bank_statement" | "credit_card_statement" | "payroll" | "income_expense_sheet" | "unknown",
  "detectedPeriod": "e.g. January 2025 or Jan–Dec 2024",
  "totalIncome": <total income for the period in dollars>,
  "totalExpenses": <total expenses for the period in dollars>,
  "periodMonths": <number of months this data covers, e.g. 1, 3, 6, 12>,
  "categories": [
    { "name": "Category Name", "type": "income" | "expense", "amount": <amount for the period> }
  ],
  "confidence": "high" | "medium" | "low",
  "notes": "One sentence describing what was detected and any important caveats"
}

Rules:
- Include only material categories (>$50 for the period)
- For income: "W-2 / Salary", "Business Revenue", "Rental Income", "Investment Income", "Other Income"
- For expenses: use natural readable names — Housing, Food & Dining, Transportation, etc.
- If it's a QuickBooks P&L, use the section totals (Total Income, Total Expenses)
- Return amounts as-is for the period; I will normalize to monthly`;

async function parseWithClaude(
  content: string,
  contentType: 'text' | 'pdf_base64',
): Promise<ParseResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const contentBlock: Anthropic.ContentBlockParam = contentType === 'pdf_base64'
    ? ({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: content },
      } as Anthropic.ContentBlockParam)
    : { type: 'text', text: `${EXTRACT_PROMPT}\n\n---\n${content}` };

  const messages: Anthropic.MessageParam[] = [{
    role: 'user',
    content: contentType === 'pdf_base64'
      ? [contentBlock, { type: 'text', text: EXTRACT_PROMPT }]
      : [contentBlock],
  }];

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages,
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}';
  // Strip any accidental markdown fences
  const jsonText = raw.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
  const parsed = JSON.parse(jsonText);

  const months: number = parsed.periodMonths ?? 1;
  const normalize = (amt: number) => (months > 0 ? amt / months : amt);

  const categories: ParsedCategory[] = (parsed.categories ?? []).map((c: {
    name: string; type: 'income' | 'expense'; amount: number
  }) => ({
    name: c.name,
    type: c.type,
    amount: normalize(c.amount ?? 0),
    metricType: toMetricType(c.name, c.type),
  }));

  const totalIncome = normalize(parsed.totalIncome ?? 0);
  const totalExpenses = normalize(parsed.totalExpenses ?? 0);

  return {
    format: parsed.format ?? 'unknown',
    detectedPeriod: parsed.detectedPeriod,
    totalIncome,
    totalExpenses,
    netCashFlow: totalIncome - totalExpenses,
    categories,
    confidence: parsed.confidence ?? 'low',
    notes: parsed.notes ?? '',
  };
}

// ─── Main CSV entry point ─────────────────────────────────────────────────────

async function parseCsvBuffer(buffer: Buffer): Promise<ParseResult> {
  const text = buffer.toString('utf-8');

  let rows: Record<string, string>[];
  try {
    rows = parseCsvSync(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });
  } catch {
    // Malformed or non-tabular CSV (e.g. QuickBooks text export) — use Claude
    return parseWithClaude(text.slice(0, 10_000), 'text');
  }

  if (rows.length === 0) throw new Error('The CSV file appears to be empty.');

  const headers = Object.keys(rows[0]).map(h => h.toLowerCase().trim());

  // Bank statement: Date + Description/Memo + Amount/Debit/Credit
  if (
    headers.some(h => /date/i.test(h)) &&
    headers.some(h => /description|memo|payee|name/i.test(h)) &&
    headers.some(h => /amount|debit|credit/i.test(h))
  ) {
    return parseBankStatementCsv(rows, Object.keys(rows[0]));
  }

  // Generic budget sheet: Type + Category + Amount
  if (
    headers.some(h => /^type$|^transaction.?type$/i.test(h)) &&
    headers.some(h => /amount|value/i.test(h))
  ) {
    return parseGenericBudgetCsv(rows, Object.keys(rows[0]));
  }

  // Anything else (QuickBooks P&L, payroll summaries, custom spreadsheets) → Claude
  return parseWithClaude(text.slice(0, 10_000), 'text');
}

// ─── POST /api/imports/parse ──────────────────────────────────────────────────

router.post('/parse', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded.' });
    return;
  }

  try {
    let result: ParseResult;
    const isPdf = req.file.mimetype === 'application/pdf' ||
      req.file.originalname.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      const base64 = req.file.buffer.toString('base64');
      result = await parseWithClaude(base64, 'pdf_base64');
    } else {
      result = await parseCsvBuffer(req.file.buffer);
    }

    res.json(result);
  } catch (err) {
    console.error('[imports POST /parse]', err);
    const msg = err instanceof Error ? err.message : 'Failed to parse file.';
    res.status(500).json({ error: msg });
  }
});

// ─── POST /api/imports/confirm ────────────────────────────────────────────────
// Takes the user-reviewed ParseResult and writes it to FinancialMetric.
// Optionally updates Goal.monthlyIncome.

router.post('/confirm', async (req: Request, res: Response) => {
  const { categories, totalIncome, detectedPeriod, updateMonthlyIncome } = req.body as {
    categories: ParsedCategory[];
    totalIncome: number;
    detectedPeriod?: string;
    updateMonthlyIncome?: boolean;
  };

  if (!Array.isArray(categories) || categories.length === 0) {
    res.status(400).json({ error: 'categories array is required.' });
    return;
  }

  const userId = req.user!.userId;
  const recordedDate = new Date();
  // Use 1st of current month as the metric date
  recordedDate.setDate(1);

  try {
    // Write one FinancialMetric row per category
    await prisma.financialMetric.createMany({
      data: categories.map((c) => ({
        userId,
        metricType: c.metricType,
        metricLabel: c.name + (detectedPeriod ? ` (${detectedPeriod})` : ''),
        value: c.amount,
        recordedDate,
      })),
    });

    // Optionally sync totalIncome → Goal.monthlyIncome
    if (updateMonthlyIncome && totalIncome > 0) {
      await prisma.goal.updateMany({
        where: { userId },
        data: { monthlyIncome: totalIncome },
      });
    }

    res.json({
      message: 'Import confirmed.',
      metricsCreated: categories.length,
      monthlyIncomeUpdated: !!(updateMonthlyIncome && totalIncome > 0),
    });
  } catch (err) {
    console.error('[imports POST /confirm]', err);
    res.status(500).json({ error: 'Failed to save imported data.' });
  }
});

export default router;
