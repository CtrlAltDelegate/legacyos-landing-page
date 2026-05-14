import { useEffect, useState, useRef } from 'react';
import { api, getErrorMessage } from '@/api/client';
import Spinner from '@/components/Spinner';

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

const DOC_TYPES = [
  { value: 'mortgage_statement',  label: 'Mortgage statement' },
  { value: 'brokerage_statement', label: 'Brokerage statement' },
  { value: 'whole_life_statement',label: 'Whole life statement' },
  { value: 'tax_return',          label: 'Tax return' },
  { value: 'insurance_policy',    label: 'Insurance policy' },
  { value: 'unknown',             label: 'Other / unknown' },
];

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

export default function Documents() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Upload state
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState('unknown');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

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
      setError(getErrorMessage(err));
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

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <p className="mt-1 text-sm text-gray-500">Upload financial statements — Flo extracts the data for you.</p>
      </div>

      {/* Upload card */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Upload a document</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label">Document type</label>
            <select className="input w-48" value={docType} onChange={(e) => setDocType(e.target.value)}>
              {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">PDF file</label>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="block text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
            />
          </div>
          <button onClick={handleUpload} disabled={uploading} className="btn-primary">
            {uploading ? <Spinner className="h-4 w-4" /> : 'Upload'}
          </button>
        </div>
        {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
        <p className="text-xs text-gray-400">PDF only, max 10 MB. Requires Core plan.</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Anomaly flags from last confirm */}
      {anomalyFlags.length > 0 && (
        <div className="card border-l-4 border-amber-400">
          <h2 className="mb-2 text-sm font-semibold text-amber-800">Heads up</h2>
          {anomalyFlags.map((f, i) => (
            <p key={i} className="text-sm text-amber-700">{f.message}</p>
          ))}
        </div>
      )}

      {/* Document list */}
      {docs.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-sm text-gray-500">No documents uploaded yet.</p>
        </div>
      ) : (
        <div className="card divide-y divide-gray-100">
          {docs.map((doc) => (
            <div key={doc.id} className="py-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{doc.filename}</p>
                  <p className="text-xs text-gray-400">
                    {DOC_TYPES.find((t) => t.value === doc.documentType)?.label ?? doc.documentType}
                    {' · '}{fmtDate(doc.uploadedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[doc.parseStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                    {doc.parseStatus.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleDownload(doc.id, doc.filename)}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
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
                    {Object.entries(parsedData)
                      .filter(([k]) => !k.startsWith('_') && !Array.isArray(parsedData[k]))
                      .map(([key, val]) => (
                        <div key={key}>
                          <label className="text-xs text-amber-700 capitalize">{key.replace(/_/g, ' ')}</label>
                          <input
                            className="input text-sm mt-0.5"
                            value={val != null ? String(val) : ''}
                            onChange={(e) => setParsedData((prev) => ({ ...prev!, [key]: e.target.value }))}
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
}
