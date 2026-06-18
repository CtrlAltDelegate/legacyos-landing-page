import { useState, useRef, useCallback } from 'react';
import {
  Upload, FileText, CheckCircle2, AlertCircle, ChevronRight,
  TrendingUp, TrendingDown, DollarSign, RotateCcw, Info,
} from 'lucide-react';
import Spinner from '@/components/Spinner';
import { parseImportFile, confirmImport, type ParseResult, type ParsedCategory } from '@/api/imports';

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const FORMAT_LABELS: Record<string, string> = {
  quickbooks_pl:         'QuickBooks P&L',
  bank_statement:        'Bank Statement',
  credit_card_statement: 'Credit Card Statement',
  payroll:               'Payroll Report',
  income_expense_sheet:  'Income / Expense Sheet',
  unknown:               'Financial Document',
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high:   'text-green-700 bg-green-50 border-green-200',
  medium: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  low:    'text-red-700 bg-red-50 border-red-200',
};

const SOURCE_CARDS = [
  { label: 'QuickBooks',     desc: 'Export P&L as CSV from Reports', ext: 'CSV' },
  { label: 'Google Sheets',  desc: 'File → Download → CSV',         ext: 'CSV' },
  { label: 'Excel',          desc: 'Save As → CSV (comma delimited)',ext: 'CSV' },
  { label: 'Bank Statement', desc: 'Download PDF from your bank',    ext: 'PDF' },
  { label: 'Credit Card',    desc: 'Download statement PDF',         ext: 'PDF' },
  { label: 'Any CSV',        desc: 'Income/expense in any format',   ext: 'CSV' },
];

type Step = 'upload' | 'review' | 'done';

export default function Import() {
  const [step, setStep]             = useState<Step>('upload');
  const [dragging, setDragging]     = useState(false);
  const [parsing, setParsing]       = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [result, setResult]         = useState<ParseResult | null>(null);
  const [categories, setCategories] = useState<ParsedCategory[]>([]);
  const [updateIncome, setUpdateIncome] = useState(true);
  const [fileName, setFileName]     = useState('');
  const [importSummary, setImportSummary] = useState<{ metricsCreated: number; monthlyIncomeUpdated: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setFileName(file.name);
    setParsing(true);
    try {
      const res = await parseImportFile(file);
      setResult(res);
      setCategories(res.categories.map(c => ({ ...c })));
      setStep('review');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to parse file.';
      setError(msg);
    } finally {
      setParsing(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, []);

  function updateCategoryAmount(idx: number, raw: string) {
    const val = parseFloat(raw.replace(/[^0-9.]/g, ''));
    if (isNaN(val)) return;
    setCategories(prev => prev.map((c, i) => i === idx ? { ...c, amount: val } : c));
  }

  function removeCategory(idx: number) {
    setCategories(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleConfirm() {
    if (!result) return;
    setConfirming(true);
    setError(null);
    try {
      const incomeTotal = categories
        .filter(c => c.type === 'income')
        .reduce((sum, c) => sum + c.amount, 0);
      const summary = await confirmImport({
        categories,
        totalIncome: incomeTotal,
        detectedPeriod: result.detectedPeriod,
        updateMonthlyIncome: updateIncome,
      });
      setImportSummary(summary);
      setStep('done');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save import.';
      setError(msg);
    } finally {
      setConfirming(false);
    }
  }

  function reset() {
    setStep('upload');
    setResult(null);
    setCategories([]);
    setError(null);
    setFileName('');
    setImportSummary(null);
    setUpdateIncome(true);
  }

  const incomeRows  = categories.filter(c => c.type === 'income');
  const expenseRows = categories.filter(c => c.type === 'expense');
  const totalIncome   = incomeRows.reduce((s, c) => s + c.amount, 0);
  const totalExpenses = expenseRows.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="min-h-screen bg-surface-1 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Import Financial Data</h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload a file from any financial tool — we'll extract your income and expenses automatically.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 text-xs font-medium">
          {(['upload', 'review', 'done'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                step === s ? 'bg-brand-600 text-white' :
                (['upload', 'review', 'done'].indexOf(step) > i) ? 'bg-green-500 text-white' :
                'bg-gray-100 text-gray-400'
              }`}>
                {['upload', 'review', 'done'].indexOf(step) > i ? '✓' : i + 1}
              </div>
              <span className={step === s ? 'text-brand-700' : 'text-gray-400'}>
                {s === 'upload' ? 'Upload' : s === 'review' ? 'Review' : 'Done'}
              </span>
              {i < 2 && <ChevronRight className="h-3 w-3 text-gray-300" />}
            </div>
          ))}
        </div>

        {/* ── Step 1: Upload ─────────────────────────────────────────────────── */}
        {step === 'upload' && (
          <div className="space-y-6">
            {/* Drag-and-drop zone */}
            <div
              className={`relative rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
                dragging ? 'border-brand-400 bg-brand-50' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.pdf,.txt"
                className="sr-only"
                onChange={onFileChange}
              />
              {parsing ? (
                <div className="flex flex-col items-center gap-3">
                  <Spinner className="h-8 w-8 text-brand-500" />
                  <p className="text-sm font-medium text-gray-600">Parsing {fileName}…</p>
                  <p className="text-xs text-gray-400">Claude is reading your file</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
                    <Upload className="h-7 w-7 text-brand-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">
                      Drop a file here, or <span className="text-brand-600 underline cursor-pointer">browse</span>
                    </p>
                    <p className="mt-1 text-xs text-gray-400">CSV or PDF · up to 15 MB</p>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Supported sources */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Supported sources</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SOURCE_CARDS.map(({ label, desc, ext }) => (
                  <div key={label} className="rounded-lg border border-gray-100 bg-white px-3 py-2.5">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-semibold text-gray-800">{label}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        ext === 'PDF' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
                      }`}>{ext}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-tight">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Review ─────────────────────────────────────────────────── */}
        {step === 'review' && result && (
          <div className="space-y-5">
            {/* Detection banner */}
            <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${CONFIDENCE_COLORS[result.confidence]}`}>
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-semibold">
                  {FORMAT_LABELS[result.format] ?? result.format}
                  {result.detectedPeriod ? ` — ${result.detectedPeriod}` : ''}
                </span>
                {result.notes && <p className="mt-0.5 text-xs opacity-80">{result.notes}</p>}
              </div>
            </div>

            {/* Totals summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Monthly Income',   value: totalIncome,            icon: TrendingUp,   color: 'text-green-600' },
                { label: 'Monthly Expenses', value: totalExpenses,          icon: TrendingDown, color: 'text-red-500'   },
                { label: 'Net Cash Flow',    value: totalIncome - totalExpenses, icon: DollarSign, color: totalIncome - totalExpenses >= 0 ? 'text-green-600' : 'text-red-500' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className={`h-3.5 w-3.5 ${color}`} />
                    <p className="text-[11px] text-gray-500 font-medium">{label}</p>
                  </div>
                  <p className={`text-base font-bold ${color}`}>{fmt(value)}</p>
                </div>
              ))}
            </div>

            {/* Category tables */}
            {incomeRows.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Income</p>
                <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
                  {incomeRows.map((cat, idx) => {
                    const globalIdx = categories.indexOf(cat);
                    return (
                      <div key={idx} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0">
                        <span className="flex-1 text-sm text-gray-700">{cat.name}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">$</span>
                          <input
                            type="number"
                            min={0}
                            value={cat.amount.toFixed(0)}
                            onChange={(e) => updateCategoryAmount(globalIdx, e.target.value)}
                            className="w-24 text-right text-sm font-semibold text-green-700 bg-transparent border-b border-dashed border-gray-200 focus:outline-none focus:border-brand-400"
                          />
                          <span className="text-xs text-gray-400">/mo</span>
                        </div>
                        <button onClick={() => removeCategory(globalIdx)} className="text-gray-300 hover:text-red-400 text-xs transition">✕</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {expenseRows.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Expenses</p>
                <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
                  {expenseRows.map((cat, idx) => {
                    const globalIdx = categories.indexOf(cat);
                    return (
                      <div key={idx} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0">
                        <span className="flex-1 text-sm text-gray-700">{cat.name}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">$</span>
                          <input
                            type="number"
                            min={0}
                            value={cat.amount.toFixed(0)}
                            onChange={(e) => updateCategoryAmount(globalIdx, e.target.value)}
                            className="w-24 text-right text-sm font-semibold text-red-600 bg-transparent border-b border-dashed border-gray-200 focus:outline-none focus:border-brand-400"
                          />
                          <span className="text-xs text-gray-400">/mo</span>
                        </div>
                        <button onClick={() => removeCategory(globalIdx)} className="text-gray-300 hover:text-red-400 text-xs transition">✕</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {categories.length === 0 && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
                No categories were extracted. Try a different file or add items manually in Profile.
              </div>
            )}

            {/* Update monthly income toggle */}
            {totalIncome > 0 && (
              <label className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={updateIncome}
                  onChange={(e) => setUpdateIncome(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Update my Monthly Income to {fmt(totalIncome)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    This will update the Current Monthly Income field in your Profile and cash flow calculations.
                  </p>
                </div>
              </label>
            )}

            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                <RotateCcw className="h-4 w-4" /> Start over
              </button>
              <button
                onClick={handleConfirm}
                disabled={confirming || categories.length === 0}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition disabled:opacity-40"
              >
                {confirming ? <Spinner className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                {confirming ? 'Saving…' : 'Apply to my profile'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Done ───────────────────────────────────────────────────── */}
        {step === 'done' && importSummary && (
          <div className="space-y-6">
            <div className="rounded-xl border border-green-200 bg-green-50 px-6 py-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 mx-auto mb-4">
                <CheckCircle2 className="h-7 w-7 text-green-600" />
              </div>
              <h2 className="text-lg font-bold text-green-800">Import complete</h2>
              <p className="mt-2 text-sm text-green-700">
                {importSummary.metricsCreated} financial metric{importSummary.metricsCreated !== 1 ? 's' : ''} saved
                {importSummary.monthlyIncomeUpdated ? ' · Monthly income updated' : ''}.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={reset}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                <Upload className="h-4 w-4" /> Import another file
              </button>
              <a
                href="/profile"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition"
              >
                <FileText className="h-4 w-4" /> View in Profile
              </a>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
