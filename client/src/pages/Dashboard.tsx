import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/auth';
import Spinner from '@/components/Spinner';

interface NetWorthData {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  breakdown: {
    equityValue: number;
    realEstateValue: number;
    otherValue: number;
    restrictedValue: number;
  };
  driftAlerts: Array<{
    assetClass: string;
    actualPct: number;
    targetPct: number;
    direction: 'over' | 'under';
  }>;
  cashOnCashReturns: Array<{
    name: string;
    cashOnCashReturn: number;
    annualCashFlow: number;
  }>;
}

interface Snapshot {
  snapshotDate: string;
  netWorth: number;
}

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState<NetWorthData | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/networth/current'),
      api.get('/networth/snapshots'),
    ])
      .then(([nwRes, snapRes]) => {
        setData(nwRes.data);
        setSnapshots(snapRes.data.snapshots ?? []);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  const monthOverMonth = snapshots.length >= 2
    ? snapshots[0].netWorth - snapshots[1].netWorth
    : null;

  return (
    <div className="p-8 space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good {getTimeOfDay()}, {user?.fullName?.split(' ')[0]}
        </h1>
        <p className="mt-1 text-sm text-gray-500">Here's your family wealth snapshot.</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Net worth"
          value={data ? fmt(data.netWorth) : '—'}
          sub={
            monthOverMonth != null
              ? `${monthOverMonth >= 0 ? '+' : ''}${fmt(monthOverMonth)} vs last month`
              : undefined
          }
        />
        <StatCard label="Total assets" value={data ? fmt(data.totalAssets) : '—'} />
        <StatCard label="Total liabilities" value={data ? fmt(data.totalLiabilities) : '—'} />
      </div>

      {/* Asset breakdown */}
      {data && (
        <div className="card">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Asset breakdown</h2>
          <div className="space-y-3">
            {[
              { label: 'Equity / stocks', value: data.breakdown.equityValue },
              { label: 'Real estate (equity)', value: data.breakdown.realEstateValue },
              { label: 'Other / cash', value: data.breakdown.otherValue },
              { label: 'Restricted (not in net worth)', value: data.breakdown.restrictedValue },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{row.label}</span>
                <span className="text-sm font-semibold text-gray-900">{fmt(row.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drift alerts */}
      {data && data.driftAlerts.length > 0 && (
        <div className="card border-l-4 border-amber-400">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Allocation drift alerts</h2>
          <div className="space-y-2">
            {data.driftAlerts.map((a) => (
              <div key={a.assetClass} className="flex items-center justify-between text-sm">
                <span className="capitalize text-gray-700">{a.assetClass.replace('_', ' ')}</span>
                <span className="text-amber-700 font-medium">
                  {a.actualPct.toFixed(1)}% actual vs {a.targetPct}% target ({a.direction})
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Ask <Link to="/flo" className="text-brand-600 hover:underline">Flo</Link> how to rebalance.
          </p>
        </div>
      )}

      {/* Cash-on-cash returns */}
      {data && data.cashOnCashReturns.length > 0 && (
        <div className="card">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Real estate cash-on-cash</h2>
          <div className="space-y-3">
            {data.cashOnCashReturns.map((r) => (
              <div key={r.name} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{r.name}</p>
                  <p className="text-xs text-gray-500">{fmt(r.annualCashFlow)}/yr cash flow</p>
                </div>
                <span className={`text-sm font-semibold ${r.cashOnCashReturn >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {r.cashOnCashReturn.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
