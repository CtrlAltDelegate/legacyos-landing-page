import { useState, useRef } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api, getErrorMessage } from '@/api/client';
import Spinner from '@/components/Spinner';

interface Props {
  onClose: () => void;
  onImported: () => void;
}

interface ParsedRow {
  ticker: string;
  name: string;
  shares: number;
  costBasisPerShare?: number;
  accountLabel: string;
  assetType: string;
  valid: boolean;
  error?: string;
}

const ASSET_TYPES = [
  { value: 'stock',           label: 'Stock' },
  { value: 'etf',             label: 'ETF / Index Fund' },
  { value: 'crypto',          label: 'Crypto' },
  { value: 'retirement_401k', label: '401(k)' },
  { value: 'retirement_ira',  label: 'IRA / Roth IRA' },
];

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const lines = text.trim().split(/\r?\n/);
  return lines.map((line) => {
    const cols: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { cols.push(current.trim()); current = ''; }
      else { current += ch; }
    }
    cols.push(current.trim());
    return cols;
  });
}

function detectColumn(headers: string[], candidates: string[]): number {
  const lower = headers.map((h) => h.toLowerCase().replace(/[^a-z]/g, ''));
  for (const c of candidates) {
    const idx = lower.findIndex((h) => h.includes(c.toLowerCase().replace(/[^a-z]/g, '')));
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseRows(raw: string[][]): ParsedRow[] {
  if (raw.length < 2) return [];
  const [headers, ...dataRows] = raw;

  const tickerIdx   = detectColumn(headers, ['symbol', 'ticker', 'cusip']);
  const nameIdx     = detectColumn(headers, ['description', 'name', 'security', 'position']);
  const sharesIdx   = detectColumn(headers, ['shares', 'quantity', 'units', 'qty']);
  const basisIdx    = detectColumn(headers, ['cost basis', 'costbasis', 'average cost', 'avgcost', 'price paid', 'avg price']);
  const accountIdx  = detectColumn(headers, ['account', 'portfolio', 'account name']);
  const typeIdx     = detectColumn(headers, ['type', 'asset type', 'security type']);

  return dataRows
    .filter((row) => row.some((c) => c.trim()))
    .map((row) => {
      const ticker = tickerIdx >= 0 ? row[tickerIdx]?.replace(/[^A-Z0-9.]/gi, '').toUpperCase() : '';
      const name   = nameIdx  >= 0 ? row[nameIdx] : ticker;
      const sharesRaw = sharesIdx >= 0 ? row[sharesIdx] : '';
      const shares = parseFloat(sharesRaw?.replace(/[^0-9.-]/g, '') ?? '');
      const basisRaw = basisIdx >= 0 ? row[basisIdx] : '';
      const costBasisPerShare = basisRaw ? parseFloat(basisRaw.replace(/[^0-9.-]/g, '')) : undefined;
      const accountLabel = accountIdx >= 0 ? row[accountIdx] : 'Imported';
      const typeRaw = typeIdx >= 0 ? row[typeIdx]?.toLowerCase() : '';

      let assetType = 'stock';
      if (typeRaw.includes('crypto') || typeRaw.includes('digital')) assetType = 'crypto';
      else if (typeRaw.includes('etf') || typeRaw.includes('fund')) assetType = 'etf';
      else if (typeRaw.includes('401') || typeRaw.includes('retirement')) assetType = 'retirement_401k';

      const valid = !!ticker && !isNaN(shares) && shares > 0;
      return {
        ticker: ticker || '?',
        name: name || ticker || 'Unknown',
        shares: isNaN(shares) ? 0 : shares,
        costBasisPerShare: isNaN(costBasisPerShare ?? NaN) ? undefined : costBasisPerShare,
        accountLabel: accountLabel || 'Imported',
        assetType,
        valid,
        error: !ticker ? 'Missing ticker symbol'
             : (isNaN(shares) || shares <= 0) ? 'Invalid share count'
             : undefined,
      };
    });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CsvImportModal({ onClose, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [editRows, setEditRows] = useState<ParsedRow[]>([]);
  const [stage, setStage] = useState<'upload' | 'review' | 'importing' | 'done'>('upload');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [imported, setImported] = useState(0);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      const result = parseRows(parsed);
      setEditRows(result.map((r) => ({ ...r })));
      setStage('review');
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function updateRow(idx: number, field: keyof ParsedRow, value: string | number | boolean) {
    setEditRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }

  function toggleRow(idx: number) {
    setEditRows((prev) => prev.map((r, i) => i === idx ? { ...r, valid: !r.valid } : r));
  }

  async function handleImport() {
    const toImport = editRows.filter((r) => r.valid && r.shares > 0 && r.ticker !== '?');
    if (!toImport.length) { setError('No valid rows to import.'); return; }
    setImporting(true);
    setError('');
    let count = 0;
    const errors: string[] = [];

    for (const row of toImport) {
      try {
        await api.post('/assets', {
          assetClass: 'equity',
          assetType: row.assetType,
          name: row.name || row.ticker,
          ticker: row.ticker,
          sharesHeld: row.shares,
          costBasisPerShare: row.costBasisPerShare ?? undefined,
          accountLabel: row.accountLabel,
          isPretax: ['retirement_401k', 'retirement_ira'].includes(row.assetType),
        });
        count++;
      } catch (err) {
        errors.push(`${row.ticker}: ${getErrorMessage(err)}`);
      }
    }

    setImported(count);
    if (errors.length) setError(errors.join(' · '));
    setStage('done');
    setImporting(false);
    if (count > 0) onImported();
  }

  const validCount = editRows.filter((r) => r.valid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Import from CSV</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Supports Fidelity, Schwab, Coinbase, and most broker exports
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* ── Upload stage ───────────────────────────────────────────────── */}
        {stage === 'upload' && (
          <div className="p-6 space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-6 py-12 cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors group"
            >
              <Upload className="h-8 w-8 text-gray-300 group-hover:text-brand-400 transition-colors" />
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-600 group-hover:text-brand-700">Drop a CSV file or click to browse</p>
                <p className="text-xs text-gray-400 mt-1">CSV with columns: symbol, shares, cost basis (optional)</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>

            <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
              <p className="text-xs font-semibold text-gray-600 mb-2">Supported formats</p>
              <div className="grid grid-cols-2 gap-1 text-xs text-gray-500">
                <span>· Fidelity portfolio export</span>
                <span>· Schwab positions CSV</span>
                <span>· Coinbase transaction history</span>
                <span>· Any CSV with Symbol + Shares</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Review stage ───────────────────────────────────────────────── */}
        {stage === 'review' && (
          <>
            <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{validCount}</span> positions ready to import
                {editRows.length - validCount > 0 && (
                  <span className="text-amber-600 ml-2">· {editRows.length - validCount} skipped</span>
                )}
              </p>
              <p className="text-xs text-gray-400">Uncheck rows to skip</p>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4">
              <div className="space-y-2">
                {editRows.map((row, idx) => (
                  <div key={idx} className={`rounded-xl border p-3 transition-all ${
                    !row.valid ? 'border-gray-100 bg-gray-50 opacity-50'
                    : row.error ? 'border-amber-200 bg-amber-50'
                    : 'border-gray-100 bg-white'
                  }`}>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={row.valid} onChange={() => toggleRow(idx)}
                        className="h-4 w-4 rounded accent-brand-600 flex-shrink-0" />

                      <div className="flex-1 grid grid-cols-4 gap-2 min-w-0">
                        {/* Ticker */}
                        <input
                          className="input py-1.5 text-xs font-mono font-bold uppercase"
                          value={row.ticker}
                          onChange={(e) => updateRow(idx, 'ticker', e.target.value.toUpperCase())}
                          placeholder="TICKER"
                        />
                        {/* Shares */}
                        <input
                          className="input py-1.5 text-xs"
                          type="number" step="any"
                          value={row.shares}
                          onChange={(e) => updateRow(idx, 'shares', Number(e.target.value))}
                          placeholder="Shares"
                        />
                        {/* Cost basis */}
                        <input
                          className="input py-1.5 text-xs"
                          type="number" step="any"
                          value={row.costBasisPerShare ?? ''}
                          onChange={(e) => updateRow(idx, 'costBasisPerShare', e.target.value ? Number(e.target.value) : undefined as unknown as number)}
                          placeholder="Cost basis/share"
                        />
                        {/* Type */}
                        <select
                          className="input py-1.5 text-xs"
                          value={row.assetType}
                          onChange={(e) => updateRow(idx, 'assetType', e.target.value)}
                        >
                          {ASSET_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Name + account label */}
                    <div className="mt-2 flex gap-2 ml-7">
                      <input
                        className="input py-1 text-xs flex-1"
                        value={row.name}
                        onChange={(e) => updateRow(idx, 'name', e.target.value)}
                        placeholder="Position name"
                      />
                      <input
                        className="input py-1 text-xs w-36"
                        value={row.accountLabel}
                        onChange={(e) => updateRow(idx, 'accountLabel', e.target.value)}
                        placeholder="Account label"
                      />
                    </div>

                    {row.error && (
                      <p className="mt-1.5 ml-7 flex items-center gap-1 text-xs text-amber-700">
                        <AlertTriangle className="h-3 w-3" /> {row.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            </div>

            <div className="px-6 pb-6 pt-3 border-t border-gray-100 flex gap-3">
              <button onClick={() => setStage('upload')} className="btn-secondary flex-1">
                <Upload className="h-4 w-4" /> Re-upload
              </button>
              <button
                onClick={handleImport}
                disabled={importing || validCount === 0}
                className="btn-primary flex-1"
              >
                {importing ? <Spinner className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                Import {validCount} position{validCount !== 1 ? 's' : ''}
              </button>
            </div>
          </>
        )}

        {/* ── Done stage ─────────────────────────────────────────────────── */}
        {stage === 'done' && (
          <div className="p-8 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <div>
              <h3 className="text-lg font-bold text-gray-900">Import complete</h3>
              <p className="text-sm text-gray-500 mt-1">
                {imported} position{imported !== 1 ? 's' : ''} added to your portfolio.
              </p>
              {error && <p className="mt-2 text-xs text-amber-700">{error}</p>}
            </div>
            <p className="text-xs text-gray-400">
              Prices will refresh automatically. You can manually refresh any position from the Assets page.
            </p>
            <button onClick={onClose} className="btn-primary px-8">Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
