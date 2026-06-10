import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { api } from '@/api/client';
import Spinner from '@/components/Spinner';
import PlanGateCard, { isPlanGateError } from '@/components/PlanGateCard';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetricMeta {
  label: string;
  category: string;
  format: 'currency' | 'percent' | 'number';
  color: string;
  description: string;
}

interface SeriesPoint {
  id: string;
  label: string;
  date: string;
  value: number;
  sourceDocumentId: string | null;
}

interface MetricGroup {
  meta: MetricMeta | null;
  series: SeriesPoint[];
}

interface MetricsResponse {
  grouped: Record<string, MetricGroup>;
  summary: Record<string, { latestValue: number; latestDate: string; label: string }>;
  metricMeta: Record<string, MetricMeta>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_ORDER = ['Income', 'Tax', 'Debt', 'Investments', 'Banking', 'Real Estate', 'Insurance', 'Business', 'Other'];

function fmt(value: number, format: 'currency' | 'percent' | 'number'): string {
  if (format === 'currency') {
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  }
  if (format === 'percent') return `${value.toFixed(1)}%`;
  return value.toLocaleString();
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function trend(series: SeriesPoint[]): 'up' | 'down' | 'flat' {
  if (series.length < 2) return 'flat';
  const first = series[0].value;
  const last  = series[series.length - 1].value;
  const pct = ((last - first) / Math.abs(first || 1)) * 100;
  if (pct > 2) return 'up';
  if (pct < -2) return 'down';
  return 'flat';
}

// ─── Mini sparkline card ──────────────────────────────────────────────────────

function MetricCard({ metricType, group }: { metricType: string; group: MetricGroup }) {
  const meta   = group.meta;
  const series = group.series;
  const last   = series[series.length - 1];
  const format = meta?.format ?? 'currency';
  const color  = meta?.color ?? '#3a47ec';
  const t      = trend(series);

  // For debt metrics, down = good; for everything else, up = good
  const debtTypes = ['loan_balance', 'credit_card_balance', 'annual_property_tax', 'federal_tax_liability'];
  const isDebt    = debtTypes.includes(metricType);
  const trendGood = isDebt ? t === 'down' : t === 'up';
  const trendBad  = isDebt ? t === 'up'   : t === 'down';

  const trendColor = t === 'flat' ? 'text-gray-400'
    : trendGood ? 'text-green-500'
    : trendBad  ? 'text-red-500'
    : 'text-gray-400';

  const chartData = series.map((p) => ({ date: fmtDate(p.date), value: p.value }));

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">
            {meta?.label ?? metricType.replace(/_/g, ' ')}
          </p>
          {last && (
            <p className="text-xl font-bold text-gray-900 mt-0.5">
              {fmt(last.value, format)}
            </p>
          )}
          {last && (
            <p className="text-[10px] text-gray-400 truncate">{last.label}</p>
          )}
        </div>
        <div className={`shrink-0 mt-0.5 ${trendColor}`}>
          {t === 'up'   && <TrendingUp  className="h-4 w-4" />}
          {t === 'down' && <TrendingDown className="h-4 w-4" />}
          {t === 'flat' && <Minus        className="h-4 w-4" />}
        </div>
      </div>

      {series.length >= 2 ? (
        <ResponsiveContainer width="100%" height={60}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
            />
            <Tooltip
              formatter={(v: number) => fmt(v, format)}
              labelFormatter={(l) => l}
              contentStyle={{ fontSize: 11, padding: '4px 8px' }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-[11px] text-gray-400 italic">Upload more documents to see a trend.</p>
      )}

      <p className="text-[10px] text-gray-400">{series.length} data point{series.length !== 1 ? 's' : ''}</p>
    </div>
  );
}

// ─── Full chart view ──────────────────────────────────────────────────────────

function MetricDetail({ metricType, group }: { metricType: string; group: MetricGroup }) {
  const meta   = group.meta;
  const format = meta?.format ?? 'currency';
  const color  = meta?.color ?? '#3a47ec';

  // Group series by label for multi-line if needed
  const labelSet = [...new Set(group.series.map((p) => p.label))];
  const chartData = group.series.map((p) => ({ date: fmtDate(p.date), value: p.value, label: p.label }));

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 space-y-4">
      <div>
        <h3 className="text-base font-bold text-gray-900">{meta?.label ?? metricType.replace(/_/g, ' ')}</h3>
        {meta?.description && <p className="text-sm text-gray-500 mt-0.5">{meta.description}</p>}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => fmt(v, format)} tick={{ fontSize: 11 }} width={70} />
          <Tooltip
            formatter={(v: number) => fmt(v, format)}
            contentStyle={{ fontSize: 11 }}
          />
          {labelSet.length === 1 ? (
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 4 }} />
          ) : (
            labelSet.map((lbl, i) => (
              <Line
                key={lbl}
                type="monotone"
                data={chartData.filter((p) => p.label === lbl)}
                dataKey="value"
                name={lbl}
                stroke={color}
                strokeWidth={2}
                strokeOpacity={1 - i * 0.2}
                dot={{ r: 3 }}
              />
            ))
          )}
        </LineChart>
      </ResponsiveContainer>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 text-gray-400 text-left">
              <th className="pb-1 font-medium">Date</th>
              <th className="pb-1 font-medium">Value</th>
              <th className="pb-1 font-medium">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {[...group.series].reverse().map((p) => (
              <tr key={p.id}>
                <td className="py-1 text-gray-600">{p.date}</td>
                <td className="py-1 font-semibold text-gray-900">{fmt(p.value, format)}</td>
                <td className="py-1 text-gray-400 truncate max-w-[200px]">{p.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Trends() {
  const [data, setData]         = useState<MetricsResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [planGate, setPlanGate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('All');
  const [expanded, setExpanded]   = useState<string | null>(null);

  useEffect(() => {
    api.get('/metrics')
      .then(({ data: d }) => setData(d))
      .catch((err) => {
        const gate = isPlanGateError(err);
        if (gate) setPlanGate(gate.requiredPlan);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex h-full items-center justify-center"><Spinner className="h-8 w-8" /></div>;

  if (planGate) {
    return (
      <PlanGateCard
        requiredPlan={planGate}
        featureName="Financial Trends"
        description="Upgrade to Core to track your financial metrics over time. Every document you upload automatically adds data points — loan balances, income, retirement balances, and more."
      />
    );
  }

  if (!data) return null;

  const hasData = Object.keys(data.grouped).length > 0;

  // Build category tabs
  const presentCategories = [
    ...new Set(
      Object.values(data.grouped)
        .map((g) => g.meta?.category ?? 'Other')
    ),
  ].sort((a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b));

  const tabs = ['All', ...presentCategories];

  const filteredTypes = Object.entries(data.grouped).filter(([, group]) => {
    if (activeTab === 'All') return true;
    return (group.meta?.category ?? 'Other') === activeTab;
  });

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Financial Trends</h1>
        <p className="mt-1 text-sm text-gray-500">
          Every confirmed document automatically adds data points here — upload more documents to build your history.
        </p>
      </div>

      {!hasData ? (
        <div className="rounded-xl bg-white border border-gray-100 py-20 text-center">
          <TrendingUp className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-base font-semibold text-gray-600">No tracked data yet</p>
          <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
            Upload and confirm documents in PaperTrail — each confirmation automatically creates trend data here.
          </p>
        </div>
      ) : (
        <>
          {/* Category tabs */}
          <div className="flex gap-1 flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  activeTab === tab
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTypes.map(([metricType, group]) => (
              <div key={metricType}>
                <button
                  className="w-full text-left"
                  onClick={() => setExpanded(expanded === metricType ? null : metricType)}
                >
                  <MetricCard metricType={metricType} group={group} />
                </button>
                {expanded === metricType && (
                  <div className="mt-2">
                    <MetricDetail metricType={metricType} group={group} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Disclaimer */}
      <p className="text-[11px] text-gray-400 text-center">
        LegacyOS is not a financial advisor. Trends are based on documents you have uploaded and confirmed. Always consult a qualified professional before making financial decisions.
      </p>
    </div>
  );
}
