import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, CreditCard, Car, GraduationCap, Home, Building2, MoreHorizontal } from 'lucide-react';
import { api, getErrorMessage } from '@/api/client';
import Spinner from '@/components/Spinner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Liability {
  id: string;
  name: string;
  liabilityType: string | null;
  balance: number;
  interestRate: number | null;
  monthlyPayment: number | null;
  isActive: boolean;
  createdAt: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const LIABILITY_TYPES = [
  { value: 'student_loan', label: 'Student loan',   Icon: GraduationCap },
  { value: 'auto',         label: 'Auto loan',       Icon: Car           },
  { value: 'heloc',        label: 'HELOC / mortgage', Icon: Home          },
  { value: 'credit_card',  label: 'Credit card',     Icon: CreditCard    },
  { value: 'cosigned',     label: 'Co-signed loan',  Icon: Building2     },
  { value: 'other',        label: 'Other',            Icon: MoreHorizontal},
];

const TYPE_META: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  student_loan: { label: 'Student loan',    Icon: GraduationCap, color: 'text-violet-600 bg-violet-50' },
  auto:         { label: 'Auto loan',        Icon: Car,           color: 'text-blue-600 bg-blue-50'    },
  heloc:        { label: 'HELOC/mortgage',   Icon: Home,          color: 'text-amber-600 bg-amber-50'  },
  credit_card:  { label: 'Credit card',      Icon: CreditCard,    color: 'text-red-600 bg-red-50'      },
  cosigned:     { label: 'Co-signed loan',   Icon: Building2,     color: 'text-gray-600 bg-gray-100'   },
  other:        { label: 'Other',             Icon: MoreHorizontal,color: 'text-gray-500 bg-gray-100'  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const fmtFull = (n: number | null | undefined) =>
  n != null
    ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—';

// ─── Add / Edit Modal ────────────────────────────────────────────────────────

interface ModalProps {
  initial?: Liability | null;
  onSave: (data: Partial<Liability>) => Promise<void>;
  onClose: () => void;
}

function LiabilityModal({ initial, onSave, onClose }: ModalProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [liabilityType, setLiabilityType] = useState(initial?.liabilityType ?? 'other');
  const [balance, setBalance] = useState(initial?.balance != null ? String(initial.balance) : '');
  const [interestRate, setInterestRate] = useState(initial?.interestRate != null ? String(initial.interestRate) : '');
  const [monthlyPayment, setMonthlyPayment] = useState(initial?.monthlyPayment != null ? String(initial.monthlyPayment) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!name.trim()) { setError('Name is required.'); return; }
    if (!balance || isNaN(Number(balance)) || Number(balance) < 0) { setError('Enter a valid balance.'); return; }
    setError('');
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        liabilityType: liabilityType || undefined,
        balance: Number(balance),
        interestRate: interestRate ? Number(interestRate) : undefined,
        monthlyPayment: monthlyPayment ? Number(monthlyPayment) : undefined,
      });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {initial ? 'Edit liability' : 'Add a liability'}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Liabilities are subtracted from your total net worth.
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Type */}
          <div>
            <label className="label">Type</label>
            <select className="input" value={liabilityType} onChange={(e) => setLiabilityType(e.target.value)}>
              {LIABILITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div>
            <label className="label">Name / lender</label>
            <input
              className="input"
              placeholder={`e.g. ${liabilityType === 'student_loan' ? 'Navient — Federal Loan' : liabilityType === 'auto' ? 'Toyota Financial' : liabilityType === 'heloc' ? 'Chase Mortgage' : liabilityType === 'credit_card' ? 'Amex Platinum' : 'Loan name'}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Balance */}
          <div>
            <label className="label">Current balance ($)</label>
            <input
              className="input"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
            />
          </div>

          {/* Interest + payment row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Interest rate (%)</label>
              <input
                className="input"
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="e.g. 6.5"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Monthly payment ($)</label>
              <input
                className="input"
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 450"
                value={monthlyPayment}
                onChange={(e) => setMonthlyPayment(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? <Spinner className="h-4 w-4" /> : initial ? 'Save changes' : 'Add liability'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LiabilitiesPage() {
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Liability | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/liabilities');
      setLiabilities(data.liabilities);
      setTotalBalance(data.totalBalance);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(data: Partial<Liability>) {
    await api.post('/liabilities', data);
    await load();
  }

  async function handleEdit(data: Partial<Liability>) {
    if (!editing) return;
    await api.put(`/liabilities/${editing.id}`, data);
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this liability? This cannot be undone.')) return;
    try {
      await api.delete(`/liabilities/${id}`);
      load();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Spinner className="h-8 w-8 text-brand-600" /></div>;
  }

  // Group by type
  const grouped = LIABILITY_TYPES
    .map((t) => ({ ...t, items: liabilities.filter((l) => (l.liabilityType ?? 'other') === t.value) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Liabilities</h1>
          <p className="mt-1 text-sm text-gray-500">
            {liabilities.length === 0
              ? 'Add your debts to get an accurate net worth.'
              : `${liabilities.length} liabilit${liabilities.length !== 1 ? 'ies' : 'y'} tracked`}
          </p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary">
          <Plus className="h-4 w-4" />
          Add liability
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Total card */}
      {liabilities.length > 0 && (
        <div className="rounded-xl bg-white shadow-md border border-gray-100 px-6 py-5">
          <p className="section-label mb-2">Total liabilities</p>
          <p className="text-3xl font-bold tabular font-mono tracking-tight text-red-600">
            {fmt(totalBalance)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Subtracted from your net worth automatically</p>
        </div>
      )}

      {/* Empty state */}
      {liabilities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center shadow-sm">
          <CreditCard className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-base font-semibold text-gray-600">No liabilities yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-5">Add loans and debts for an accurate net worth calculation.</p>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus className="h-4 w-4" />
            Add your first liability
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ value, label, Icon }) => {
            const items = liabilities.filter((l) => (l.liabilityType ?? 'other') === value);
            if (!items.length) return null;
            const groupTotal = items.reduce((s, l) => s + Number(l.balance), 0);
            const meta = TYPE_META[value] ?? TYPE_META.other;

            return (
              <div key={value}>
                {/* Section header */}
                <div className="flex items-center justify-between px-1 pb-2">
                  <h2 className="section-label flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </h2>
                  <span className="text-sm font-bold tabular font-mono text-red-600">{fmt(groupTotal)}</span>
                </div>

                <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
                  {items.map((liability, idx) => {
                    const TypeIcon = meta.Icon;
                    return (
                      <div
                        key={liability.id}
                        className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors ${
                          idx > 0 ? 'border-t border-gray-100' : ''
                        }`}
                      >
                        {/* Icon */}
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                          <TypeIcon className="h-4 w-4" />
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{liability.name}</p>
                          <div className="flex items-center gap-3 flex-wrap mt-0.5">
                            {liability.interestRate != null && (
                              <span className="text-xs text-gray-400">{Number(liability.interestRate).toFixed(2)}% APR</span>
                            )}
                            {liability.monthlyPayment != null && (
                              <span className="text-xs text-gray-400">{fmtFull(liability.monthlyPayment)}/mo</span>
                            )}
                          </div>
                        </div>

                        {/* Balance */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold tabular font-mono text-red-600">
                            {fmt(Number(liability.balance))}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => { setEditing(liability); setShowModal(true); }}
                            className="p-1.5 text-gray-300 hover:text-brand-600 transition-colors rounded"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(liability.id)}
                            className="p-1.5 text-gray-300 hover:text-red-400 transition-colors rounded"
                            title="Remove"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <LiabilityModal
          initial={editing}
          onSave={editing ? handleEdit : handleAdd}
          onClose={() => { setShowModal(false); setEditing(null); }}
        />
      )}
    </div>
  );
}
