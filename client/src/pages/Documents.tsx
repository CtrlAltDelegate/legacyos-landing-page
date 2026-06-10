import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, FileUp, AlertTriangle, Folder, FolderOpen, ChevronDown } from 'lucide-react';
import { api, getErrorMessage } from '@/api/client';
import Spinner from '@/components/Spinner';
import PlanGateCard, { isPlanGateError } from '@/components/PlanGateCard';

interface Doc {
  id: string;
  filename: string;
  documentType: string;
  parseStatus: string;
  uploadedAt: string;
  confirmedAt: string | null;
  relatedAssetId: string | null;
  parseError: string | null;
}

interface ParsedData {
  [key: string]: unknown;
}

const DOC_CATEGORIES = [
  {
    label: 'Income',
    emoji: '💰',
    types: [
      { value: 'paystub', label: 'Pay stub' },
    ],
  },
  {
    label: 'Tax',
    emoji: '🧾',
    types: [
      { value: 'tax_return',  label: 'Tax return (1040)' },
      { value: 'w2',          label: 'W-2' },
      { value: 'form_1099',   label: '1099 (NEC, DIV, INT, B…)' },
    ],
  },
  {
    label: 'Debt & Loans',
    emoji: '🏦',
    types: [
      { value: 'mortgage_statement',    label: 'Mortgage statement' },
      { value: 'auto_loan',             label: 'Auto loan statement' },
      { value: 'student_loan',          label: 'Student loan statement' },
      { value: 'credit_card_statement', label: 'Credit card statement' },
    ],
  },
  {
    label: 'Investments',
    emoji: '📈',
    types: [
      { value: 'brokerage_statement', label: 'Brokerage statement' },
      { value: 'retirement_401k',     label: '401(k) / IRA statement' },
    ],
  },
  {
    label: 'Insurance',
    emoji: '🛡️',
    types: [
      { value: 'whole_life_statement', label: 'Whole life statement' },
      { value: 'insurance_policy',     label: 'Insurance policy' },
    ],
  },
  {
    label: 'Banking',
    emoji: '🏧',
    types: [
      { value: 'bank_statement', label: 'Bank statement' },
    ],
  },
  {
    label: 'Real Estate',
    emoji: '🏠',
    types: [
      { value: 'property_tax', label: 'Property tax bill' },
    ],
  },
  {
    label: 'Legal & Estate',
    emoji: '📜',
    types: [
      { value: 'trust_document', label: 'Trust document' },
    ],
  },
  {
    label: 'Business',
    emoji: '💼',
    types: [
      { value: 'business_financials', label: 'Business financials (P&L)' },
    ],
  },
  {
    label: 'Other',
    emoji: '📁',
    types: [
      { value: 'unknown', label: 'Other / unknown' },
    ],
  },
];

// Flat lookup maps derived from DOC_CATEGORIES
const DOC_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  DOC_CATEGORIES.flatMap((c) => c.types.map((t) => [t.value, t.label]))
);
const DOC_TYPE_CATEGORY: Record<string, string> = Object.fromEntries(
  DOC_CATEGORIES.flatMap((c) => c.types.map((t) => [t.value, c.label]))
);

const STATUS_COLORS: Record<string, string> = {
  pending:                'bg-gray-100 text-gray-600',
  parsing:                'bg-blue-50 text-blue-700',
  awaiting_confirmation:  'bg-amber-50 text-amber-700',
  confirmed:              'bg-green-50 text-green-700',
  failed:                 'bg-red-50 text-red-600',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Recursively flatten a parsed data object into { key, displayLabel, value } entries. */
function flattenForDisplay(
  data: ParsedData,
  prefix = ''
): Array<{ key: string; label: string; value: string }> {
  const entries: Array<{ key: string; label: string; value: string }> = [];
  for (const [k, v] of Object.entries(data)) {
    if (k.startsWith('_') || Array.isArray(v)) continue;
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object') {
      entries.push(...flattenForDisplay(v as ParsedData, fullKey));
    } else {
      const label = fullKey.replace(/\./g, ' → ').replace(/_/g, ' ');
      entries.push({ key: fullKey, label, value: v != null ? String(v) : '' });
    }
  }
  return entries;
}

/** Set a nested value in parsedData using a dot-path key (e.g. "key_values.balance"). */
function setNestedValue(obj: ParsedData, path: string, value: string): ParsedData {
  const parts = path.split('.');
  if (parts.length === 1) return { ...obj, [path]: value };
  const [head, ...rest] = parts;
  return {
    ...obj,
    [head]: setNestedValue((obj[head] as ParsedData) ?? {}, rest.join('.'), value),
  };
}

export default function Documents() {
  const [searchParams] = useSearchParams();
  const prefilledType = searchParams.get('type') ?? 'unknown';
  const prefilledLabel = searchParams.get('label');

  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [planGate, setPlanGate] = useState<string | null>(null);

  // Upload state
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType] = useState(prefilledType);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Folder collapse state
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  function toggleFolder(label: string) {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }

  // Parse / confirm state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [currentAssetValue, setCurrentAssetValue] = useState<number | null>(null);
  const [parsing, setParsing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [actionError, setActionError] = useState('');
  const [anomalyFlags, setAnomalyFlags] = useState<{ message: string }[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/documents');
      setDocs(data.documents);
    } catch (err) {
      const gate = isPlanGateError(err);
      if (gate) { setPlanGate(gate.requiredPlan); }
      else { setError(getErrorMessage(err)); }
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploadError('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('documentType', docType);
      await api.post('/documents/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (fileRef.current) fileRef.current.value = '';
      setSelectedFile(null);
      load();
    } catch (err) {
      setUploadError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleParse(id: string) {
    setActionError('');
    setParsing(true);
    setActiveId(id);
    try {
      const { data } = await api.post(`/documents/${id}/parse`);
      setParsedData(data.parsedData);
      // Refresh the parsed endpoint for side-by-side comparison
      const detail = await api.get(`/documents/${id}/parsed`);
      setCurrentAssetValue(detail.data.currentAssetValue);
      load();
    } catch (err) {
      setActionError(getErrorMessage(err));
      setActiveId(null);
    } finally {
      setParsing(false);
    }
  }

  async function handleConfirm(id: string) {
    if (!parsedData) return;
    setActionError('');
    setConfirming(true);
    try {
      const { data } = await api.post(`/documents/${id}/confirm`, { confirmedData: parsedData });
      setAnomalyFlags(data.anomalyFlags ?? []);
      setParsedData(null);
      setActiveId(null);
      load();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setConfirming(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this document? This cannot be undone.')) return;
    try {
      await api.delete(`/documents/${id}`);
      if (activeId === id) { setActiveId(null); setParsedData(null); }
      load();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  }

  async function handleDownload(id: string, _filename: string) {
    try {
      const { data } = await api.get(`/documents/${id}/download`);
      window.open(data.url, '_blank');
    } catch (err) {
      alert(getErrorMessage(err));
    }
  }

  if (loading) return <div className="flex h-full items-center justify-center"><Spinner className="h-8 w-8" /></div>;

  if (planGate) {
    return (
      <PlanGateCard
        requiredPlan={planGate}
        featureName="Document uploads"
        description="Upgrade to Core to upload financial statements. Flo will extract the data automatically — mortgage balances, investment values, insurance details — and update your net worth in real time."
      />
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Documents</h1>
        <p className="mt-1 text-sm text-gray-500">Upload financial statements — Flo extracts the data automatically.</p>
      </div>

      {/* Pre-fill banner — shown when arriving from a todo action */}
      {prefilledLabel && (
        <div className="rounded-xl bg-brand-50 border border-brand-100 border-l-4 border-l-brand-500 px-4 py-3 flex items-center gap-3">
          <FileUp className="h-4 w-4 text-brand-500 flex-shrink-0" />
          <p className="text-sm text-brand-800">
            <span className="font-semibold">Ready to upload:</span> {decodeURIComponent(prefilledLabel)}
          </p>
        </div>
      )}

      {/* Upload card */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-900">Upload a document</h2>

        {/* Document type selector */}
        <div>
          <label className="label">Document type</label>
          <select className="input" value={docType} onChange={(e) => setDocType(e.target.value)}>
            {DOC_CATEGORIES.map((cat) => (
              <optgroup key={cat.label} label={`${cat.emoji} ${cat.label}`}>
                {cat.types.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Dashed drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-6 py-8 cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors duration-150 group"
        >
          <FileUp className="h-7 w-7 text-gray-300 group-hover:text-brand-500 transition-colors" />
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-600 group-hover:text-brand-700">Click to choose a PDF</p>
            <p className="text-xs text-gray-400 mt-0.5">or drag and drop · PDF only, max 10 MB</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
          />
          {selectedFile && (
            <span className="text-xs font-medium text-brand-600 bg-brand-50 rounded-full px-3 py-1 border border-brand-200">
              {selectedFile.name}
            </span>
          )}
        </div>

        <button onClick={handleUpload} disabled={uploading} className="btn-primary w-full justify-center">
          {uploading ? <Spinner className="h-4 w-4" /> : <FileUp className="h-4 w-4" />}
          {uploading ? 'Uploading…' : 'Upload document'}
        </button>

        {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
        <p className="text-xs text-gray-400 text-center">Requires Core plan. Your documents are encrypted and private.</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Anomaly flags from last confirm */}
      {anomalyFlags.length > 0 && (
        <div className="rounded-xl bg-white shadow-sm border-l-4 border-amber-400 border border-amber-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <h2 className="text-sm font-bold text-amber-800">Heads up</h2>
          </div>
          {anomalyFlags.map((f, i) => (
            <p key={i} className="text-sm text-amber-700">{f.message}</p>
          ))}
        </div>
      )}

      {/* Document list — grouped by category */}
      {docs.length === 0 ? (
        <div className="rounded-xl bg-white shadow-sm border border-gray-100 py-16 text-center">
          <FileText className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-base font-semibold text-gray-600">No documents yet</p>
          <p className="text-sm text-gray-400 mt-1">Upload your first statement to let Flo extract the data.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {DOC_CATEGORIES.map((cat) => {
            const catDocs = docs.filter((d) => DOC_TYPE_CATEGORY[d.documentType] === cat.label);
            if (catDocs.length === 0) return null;
            const isCollapsed = collapsedFolders.has(cat.label);

            return (
              <div key={cat.label} className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
                {/* Folder header */}
                <button
                  onClick={() => toggleFolder(cat.label)}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed
                      ? <Folder className="h-4 w-4 text-brand-400" />
                      : <FolderOpen className="h-4 w-4 text-brand-500" />
                    }
                    <span className="text-sm font-semibold text-gray-700">{cat.emoji} {cat.label}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                      {catDocs.length}
                    </span>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                </button>

                {/* Folder contents */}
                {!isCollapsed && (
                  <div className="divide-y divide-gray-100 border-t border-gray-100">
                    {catDocs.map((doc) => (
                      <div key={doc.id} className="px-5 py-4 space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900">{doc.filename}</p>
                            <p className="text-xs text-gray-400">
                              {DOC_TYPE_LABEL[doc.documentType] ?? doc.documentType}
                              {' · '}{fmtDate(doc.uploadedAt)}
                            </p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[doc.parseStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                            {doc.parseStatus.replace(/_/g, ' ')}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => handleDownload(doc.id, doc.filename)} className="btn-secondary text-xs py-1.5 px-3">
                            View PDF
                          </button>

                          {(doc.parseStatus === 'pending' || doc.parseStatus === 'failed') && (
                            <button
                              onClick={() => handleParse(doc.id)}
                              disabled={parsing && activeId === doc.id}
                              className="btn-primary text-xs py-1.5 px-3"
                            >
                              {parsing && activeId === doc.id ? <Spinner className="h-3 w-3" /> : 'Extract data'}
                            </button>
                          )}

                          {doc.parseStatus === 'awaiting_confirmation' && activeId !== doc.id && (
                            <button
                              onClick={async () => {
                                setActiveId(doc.id);
                                const detail = await api.get(`/documents/${doc.id}/parsed`);
                                setParsedData(detail.data.document.parsedData);
                                setCurrentAssetValue(detail.data.currentAssetValue);
                              }}
                              className="btn-primary text-xs py-1.5 px-3"
                            >
                              Review & confirm
                            </button>
                          )}

                          {doc.parseStatus !== 'confirmed' && (
                            <button
                              onClick={() => handleDelete(doc.id)}
                              className="text-xs text-gray-400 hover:text-red-600 transition px-2"
                            >
                              Delete
                            </button>
                          )}
                        </div>

                        {doc.parseError && (
                          <p className="text-xs text-red-600">Error: {doc.parseError}</p>
                        )}

                        {/* Parsed data review panel */}
                        {activeId === doc.id && parsedData && (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold text-amber-900">Review extracted data</h3>
                              {currentAssetValue != null && (
                                <span className="text-xs text-amber-700">
                                  Asset current value: {currentAssetValue.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {flattenForDisplay(parsedData).map(({ key, label, value }) => (
                                <div key={key}>
                                  <label className="text-xs text-amber-700 capitalize">{label}</label>
                                  <input
                                    className="input text-sm mt-0.5"
                                    value={value}
                                    onChange={(e) =>
                                      setParsedData((prev) => setNestedValue(prev!, key, e.target.value))
                                    }
                                  />
                                </div>
                              ))}
                            </div>
                            {actionError && <p className="text-sm text-red-600">{actionError}</p>}
                            <div className="flex gap-2">
                              <button onClick={() => { setActiveId(null); setParsedData(null); }} className="btn-secondary text-sm py-1.5 flex-1">
                                Cancel
                              </button>
                              <button onClick={() => handleConfirm(doc.id)} disabled={confirming} className="btn-primary text-sm py-1.5 flex-1">
                                {confirming ? <Spinner className="h-4 w-4" /> : 'Confirm & save to asset'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
