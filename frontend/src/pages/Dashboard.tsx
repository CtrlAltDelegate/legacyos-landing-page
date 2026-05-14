import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Summary {
  net_worth: number;
  total_assets: number;
  total_liabilities: number;
  equities_total: number;
  real_estate_equity: number;
  other_total: number;
  restricted_total: number;
}

interface Snapshot {
  snapshot_date: string;
  net_worth: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function StatCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`bg-white border rounded-xl p-4 ${highlight ? 'border-amber-400/60 bg-amber-50/50' : 'border-black/10'}`}>
      <div className="text-xs text-muted mb-1">{label}</div>
      <div className={`text-xl font-medium ${highlight ? 'text-amber-700' : 'text-ink'}`}>{value}</div>
      {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

function CategoryRow({ label, value, total, sub }: { label: string; value: number; total: number; sub?: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-black/5 last:border-0">
      <div className="flex-1">
        <div className="text-sm font-medium text-ink">{label}</div>
        {sub && <div className="text-xs text-muted">{sub}</div>}
      </div>
      <div className="text-right">
        <div className="text-sm font-medium text-ink">{fmt(value)}</div>
        <div className="text-xs text-muted">{pct}% of assets</div>
      </div>
      <div className="w-16">
        <div className="h-1.5 bg-black/5 rounded-full overflow-hidden">
          <div className="h-full bg-flo-600 rounded-full" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/assets/summary'),
      api.get('/snapshots'),
    ])
      .then(([summaryRes, historyRes]) => {
        setSummary(summaryRes.data);
        setHistory(historyRes.data.snapshots || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-muted">Loading your portfolio…</div>
      </div>
    );
  }

  const chartData = history.map(s => ({
    date: new Date(s.snapshot_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    value: Math.round(s.net_worth / 1000),
  }));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-medium text-ink">
          Good morning, {user?.full_name?.split(' ')[0]}
        </h1>
        <p className="text-sm text-muted mt-0.5">Here's your wealth summary</p>
      </div>

      {/* Top stats — progressive disclosure layer 1 */}
      {summary ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard
              label="Net worth"
              value={fmt(summary.net_worth)}
              sub="Excl. restricted assets"
            />
            <StatCard
              label="Total assets"
              value={fmt(summary.total_assets)}
            />
            <StatCard
              label="Total liabilities"
              value={fmt(summary.total_liabilities)}
            />
            <StatCard
              label="Flo priority"
              value={summary.total_assets === 0 ? 'Add your first asset' : 'Review allocation →'}
              highlight
              sub={summary.total_assets === 0 ? 'Start with equities or real estate' : undefined}
            />
          </div>

          {/* Category breakdown — layer 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div className="bg-white border border-black/10 rounded-xl p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-muted mb-3">Asset breakdown</div>
              {summary.total_assets === 0 ? (
                <div className="text-sm text-muted py-4 text-center">
                  No assets yet.{' '}
                  <Link to="/assets" className="text-flo-700 hover:underline">Add your first asset →</Link>
                </div>
              ) : (
                <>
                  <CategoryRow label="Equities" value={summary.equities_total} total={summary.total_assets} />
                  <CategoryRow label="Real estate" value={summary.real_estate_equity} total={summary.total_assets} sub="Equity (value minus mortgage)" />
                  <CategoryRow label="Other assets" value={summary.other_total} total={summary.total_assets} sub="Business equity, whole life, cash, etc." />
                </>
              )}
              {summary.restricted_total > 0 && (
                <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-400/40 rounded-lg">
                  <div className="text-xs font-medium text-amber-700">Restricted assets (not in net worth)</div>
                  <div className="text-sm font-medium text-amber-700 mt-0.5">{fmt(summary.restricted_total)}</div>
                  <div className="text-xs text-amber-700/70">Unvested equity, pending inheritance, etc.</div>
                </div>
              )}
            </div>

            {/* Net worth history chart */}
            <div className="bg-white border border-black/10 rounded-xl p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-muted mb-3">Net worth over time</div>
              {chartData.length < 2 ? (
                <div className="flex items-center justify-center h-32 text-sm text-muted">
                  History appears after your first monthly snapshot
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#888780' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#888780' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => `$${v}k`}
                    />
                    <Tooltip
                      formatter={(v: number) => [`$${v}k`, 'Net worth']}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.12)' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#378add"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-flo-50 border border-flo-100 rounded-xl p-4">
            <div className="text-xs font-medium text-flo-700 mb-2">Quick actions</div>
            <div className="flex flex-wrap gap-2">
              <Link to="/assets" className="text-xs px-3 py-1.5 bg-white border border-flo-100 rounded-lg text-flo-700 hover:bg-flo-50 transition-colors">
                + Add asset
              </Link>
              <Link to="/documents" className="text-xs px-3 py-1.5 bg-white border border-flo-100 rounded-lg text-flo-700 hover:bg-flo-50 transition-colors">
                Upload statement
              </Link>
              <Link to="/flo" className="text-xs px-3 py-1.5 bg-white border border-flo-100 rounded-lg text-flo-700 hover:bg-flo-50 transition-colors">
                Ask Flo a question
              </Link>
            </div>
          </div>
        </>
      ) : (
        <div className="text-sm text-muted">Could not load portfolio data.</div>
      )}
    </div>
  );
}
