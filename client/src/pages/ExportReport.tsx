import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import { api } from '@/api/client';
import { getAllWings, type WingSummary } from '@/api/wings';
import { getTodos, type TodoItem } from '@/api/todos';
import { useAuthStore } from '@/store/auth';
import Spinner from '@/components/Spinner';

interface NetWorth {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  breakdown: { equityValue: number; realEstateValue: number; otherValue: number };
}

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const WING_COLORS: Record<string, string> = {
  emerald: '#059669', blue: '#2563eb', rose: '#e11d48',
  amber: '#d97706', violet: '#7c3aed', slate: '#0d9488',
};

export default function ExportReport() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [wings, setWings] = useState<WingSummary[]>([]);
  const [nw, setNw] = useState<NetWorth | null>(null);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAllWings(), api.get('/networth/current'), getTodos()])
      .then(([w, nwRes, t]) => {
        setWings(w);
        setNw(nwRes.data);
        setTodos(t.slice(0, 10));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Spinner className="h-8 w-8 text-brand-600" /></div>;
  }

  const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const assessedWings = wings.filter((w) => w.assessed);

  return (
    <>
      {/* ── Screen controls (hidden when printing) ──────────────────────── */}
      <div className="print:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button onClick={() => window.print()} className="btn-primary gap-2">
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </button>
      </div>

      {/* ── Report body ─────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto p-8 bg-white min-h-screen print:p-0 print:max-w-none">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-gray-900">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-brand-600 font-bold text-lg">✦</span>
              <span className="font-bold text-gray-900 text-lg tracking-tight">LegacyOS</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Financial Snapshot</h1>
            <p className="text-sm text-gray-500 mt-1">{user?.fullName ?? 'Personal Report'} · {reportDate}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Net Worth</p>
            <p className={`text-3xl font-bold font-mono ${(nw?.netWorth ?? 0) >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
              {nw ? fmt(nw.netWorth) : '—'}
            </p>
          </div>
        </div>

        {/* Net worth breakdown */}
        <section className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-3">Balance Sheet</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Assets',       value: nw?.totalAssets, positive: true },
              { label: 'Total Liabilities',  value: nw?.totalLiabilities, positive: false },
              { label: 'Net Worth',          value: nw?.netWorth, positive: (nw?.netWorth ?? 0) >= 0 },
            ].map(({ label, value, positive }) => (
              <div key={label} className="border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">{label}</p>
                <p className={`text-xl font-bold font-mono ${positive ? 'text-gray-900' : 'text-red-600'}`}>
                  {value != null ? fmt(value) : '—'}
                </p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4 mt-3">
            {[
              { label: 'Equity & Stocks',   value: nw?.breakdown.equityValue },
              { label: 'Real Estate',        value: nw?.breakdown.realEstateValue },
              { label: 'Cash & Other',       value: nw?.breakdown.otherValue },
            ].map(({ label, value }) => (
              <div key={label} className="border border-gray-100 rounded-xl p-3 bg-gray-50">
                <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                <p className="text-base font-semibold font-mono text-gray-700">
                  {value != null ? fmt(value) : '—'}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Six Wing levels */}
        {assessedWings.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-3">Six Wing Assessment</h2>
            <div className="space-y-3">
              {wings.map((wing) => {
                const color = WING_COLORS[wing.color] ?? '#374151';
                const pct = (wing.level / 3) * 100;
                return (
                  <div key={wing.id} className="flex items-center gap-4">
                    <div className="w-28 flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-800">{wing.emoji} {wing.name}</p>
                      <p className="text-xs text-gray-400">{wing.assessed ? wing.levelLabel : 'Not assessed'}</p>
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${wing.assessed ? pct : 0}%`, backgroundColor: color }}
                      />
                    </div>
                    <div className="w-16 text-right">
                      <span className="text-xs font-bold text-gray-600">
                        {wing.assessed ? `Level ${wing.level} / 3` : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Action items */}
        {todos.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-3">Priority Action Items</h2>
            <div className="space-y-2">
              {todos.map((todo, i) => (
                <div key={todo.id} className="flex gap-3 py-2 border-b border-gray-100 last:border-0">
                  <span className="text-xs font-bold text-gray-300 mt-0.5 w-4 flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{todo.title}</p>
                    {todo.description && (
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{todo.description}</p>
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 h-fit mt-0.5 ${
                    todo.category === 'document' ? 'bg-blue-50 text-blue-700'
                    : todo.category === 'action' ? 'bg-amber-50 text-amber-700'
                    : 'bg-violet-50 text-violet-700'
                  }`}>
                    {todo.category}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="pt-6 border-t border-gray-200 flex items-center justify-between text-xs text-gray-400">
          <span>Generated by LegacyOS · {reportDate}</span>
          <span>For informational purposes only. Not investment advice.</span>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page { margin: 1.5cm; }
          body { background: white; }
        }
      `}</style>
    </>
  );
}
