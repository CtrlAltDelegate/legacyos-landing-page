import { useState, useEffect, useRef, ChangeEvent } from 'react';
import api from '../services/api';

interface Document {
  id: string;
  original_name: string;
  doc_type: string;
  parse_status: string;
  file_size: number;
  created_at: string;
  raw_extraction?: Record<string, unknown>;
}

const DOC_TYPES = [
  { value: 'mortgage_statement', label: 'Mortgage Statement' },
  { value: 'brokerage_statement', label: 'Brokerage Statement' },
  { value: 'whole_life_statement', label: 'Whole Life Insurance' },
  { value: 'tax_return_1040', label: 'Tax Return (1040)' },
  { value: 'insurance_illustration', label: 'Insurance Illustration' },
  { value: 'other', label: 'Other' },
];

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-black/5 text-muted',
    parsing: 'bg-flo-50 text-flo-700',
    parsed: 'bg-amber-50 text-amber-700',
    confirmed: 'bg-sage-50 text-sage-700',
    failed: 'bg-red-50 text-red-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] || 'bg-black/5 text-muted'}`}>
      {status}
    </span>
  );
}

export default function Documents() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState<string | null>(null);
  const [docType, setDocType] = useState('mortgage_statement');
  const [selected, setSelected] = useState<Document | null>(null);
  const [confirming, setConfirming] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchDocs = async () => {
    try {
      const res = await api.get('/documents');
      setDocs(res.data.documents || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocs(); }, []);

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    form.append('doc_type', docType);
    setUploading(true);
    try {
      await api.post('/documents/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchDocs();
    } catch (err) {
      console.error(err);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleParse = async (docId: string) => {
    setParsing(docId);
    try {
      const res = await api.post(`/documents/${docId}/parse`);
      setSelected(res.data.document);
      await fetchDocs();
    } catch (err) {
      console.error(err);
      alert('Parsing failed. Please try again.');
    } finally {
      setParsing(null);
    }
  };

  const handleConfirm = async (docId: string) => {
    if (!selected?.raw_extraction) return;
    setConfirming(true);
    try {
      await api.post(`/documents/${docId}/confirm`, { confirmed_data: selected.raw_extraction });
      setSelected(null);
      await fetchDocs();
    } catch (err) {
      console.error(err);
      alert('Confirmation failed. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-medium text-ink">Documents</h1>
        <p className="text-sm text-muted mt-0.5">Upload financial statements — Flo extracts the key values for your review</p>
      </div>

      {/* Upload panel */}
      <div className="bg-white border border-black/10 rounded-xl p-5 mb-6">
        <div className="text-sm font-medium text-ink mb-3">Upload a statement</div>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={docType}
            onChange={e => setDocType(e.target.value)}
            className="px-3 py-2 text-sm border border-black/15 rounded-lg bg-canvas focus:outline-none focus:ring-2 focus:ring-flo-600/30"
          >
            {DOC_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <label className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors ${uploading ? 'bg-black/10 text-muted cursor-not-allowed' : 'bg-ink text-white hover:bg-ink/80'}`}>
            {uploading ? 'Uploading…' : '+ Upload PDF'}
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
        <p className="text-xs text-muted mt-2">PDF only · max 10MB · Flo will extract structured fields for your confirmation</p>
      </div>

      {/* Extraction confirmation modal */}
      {selected?.raw_extraction && (
        <div className="mb-6 bg-amber-50 border border-amber-400/40 rounded-xl p-5">
          <div className="text-sm font-medium text-amber-700 mb-1">Review extracted values</div>
          <p className="text-xs text-amber-700/80 mb-3">Flo extracted the following from <strong>{selected.original_name}</strong>. Review and confirm before saving to your assets.</p>
          <pre className="bg-white border border-amber-200 rounded-lg p-3 text-xs text-ink overflow-auto max-h-48">
            {JSON.stringify(selected.raw_extraction, null, 2)}
          </pre>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => handleConfirm(selected.id)}
              disabled={confirming}
              className="px-4 py-1.5 bg-ink text-white text-sm rounded-lg hover:bg-ink/80 disabled:opacity-50"
            >
              {confirming ? 'Saving…' : 'Confirm & save to assets'}
            </button>
            <button
              onClick={() => setSelected(null)}
              className="px-4 py-1.5 border border-black/15 text-sm rounded-lg text-muted hover:text-ink"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Documents list */}
      {loading ? (
        <div className="text-sm text-muted">Loading documents…</div>
      ) : docs.length === 0 ? (
        <div className="text-sm text-muted text-center py-12 bg-white border border-black/10 rounded-xl">
          No documents yet. Upload a PDF statement above.
        </div>
      ) : (
        <div className="bg-white border border-black/10 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-black/5 text-xs font-medium uppercase tracking-wide text-muted">
            Uploaded statements
          </div>
          <div className="divide-y divide-black/5">
            {docs.map(doc => (
              <div key={doc.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink truncate">{doc.original_name}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {DOC_TYPES.find(t => t.value === doc.doc_type)?.label || doc.doc_type} ·{' '}
                    {new Date(doc.created_at).toLocaleDateString()}
                  </div>
                </div>
                <StatusBadge status={doc.parse_status} />
                {(doc.parse_status === 'pending' || doc.parse_status === 'failed') && (
                  <button
                    onClick={() => handleParse(doc.id)}
                    disabled={parsing === doc.id}
                    className="text-xs px-3 py-1 border border-flo-100 rounded-lg text-flo-700 hover:bg-flo-50 disabled:opacity-50"
                  >
                    {parsing === doc.id ? 'Parsing…' : 'Parse with Flo'}
                  </button>
                )}
                {doc.parse_status === 'parsed' && (
                  <button
                    onClick={() => setSelected(doc)}
                    className="text-xs px-3 py-1 border border-amber-300 rounded-lg text-amber-700 hover:bg-amber-50"
                  >
                    Review
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
