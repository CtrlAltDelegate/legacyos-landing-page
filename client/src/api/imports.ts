import { api } from './client';

export interface ParsedCategory {
  name: string;
  type: 'income' | 'expense';
  amount: number;
  metricType: string;
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

export async function parseImportFile(file: File): Promise<ParseResult> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<ParseResult>('/imports/parse', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function confirmImport(payload: {
  categories: ParsedCategory[];
  totalIncome: number;
  detectedPeriod?: string;
  updateMonthlyIncome: boolean;
}): Promise<{ message: string; metricsCreated: number; monthlyIncomeUpdated: boolean }> {
  const { data } = await api.post('/imports/confirm', payload);
  return data;
}
