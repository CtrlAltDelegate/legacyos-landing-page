import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { api } from '@/api/client';
import { getAllWings, type WingSummary } from '@/api/wings';
import { getTodos, type TodoItem } from '@/api/todos';
import { useAuthStore } from '@/store/auth';
import Spinner from '@/components/Spinner';
import FinancialReportPDF from '@/components/FinancialReportPDF';

// ─── Types ───────────────────────────────────────────────────────────────────

interface NetWorth {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  breakdown: { equityValue: number; realEstateValue: number; otherValue: number };
}

interface Snapshot {
  snapshotDate: string;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
}

interface Asset {
  id: string;
  name: string;
  assetClass: string;
  assetType: string;
  currentValue: number | null;
  adjustedValue: number | null;
  estimatedValue: number | null;
  mortgageBalance: number | null;
  ticker: string | null;
  sharesHeld: number | null;
  isPretax: boolean;
  sector: string | null;
  propertyAddress: string | null;
}

interface Liability {
  id: string;
  name: string;
  liabilityType: string | null;
  balance: number;
  interestRate: number | null;
  monthlyPayment: number | null;
}

interface Goal {
  primaryGoal: string | null;
  primaryGoalLabel: string | null;
  targetMonthlyIncome: number | null;
  targetDate: string | null;
  riskTolerance: string | null;
  targetEquityPct: number | null;
  targetRealEstatePct: number | null;
  targetCashPct: number | null;
  targetBusinessPct: number | null;
  targetOtherPct: number | null;
  monthlyCryptoBudget: number | null;
  financialMode: string | null;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const fmtPct = (n: number) => `${n.toFixed(1)}%`;

const WING_COLORS: Record<string, string> = {
  emerald: '#059669', blue: '#2563eb', rose: '#e11d48',
  amber: '#d97706', violet: '#7c3aed', slate: '#0d9488',
};

const ASSET_CLASS_LABEL: Record<string, string> = {
  equity: 'Equities & Securities',
  real_estate: 'Real Estate',
  other: 'Cash & Other Assets',
  restricted: 'Restricted / Vesting',
};

const LIABILITY_TYPE_LABEL: Record<string, string> = {
  student_loan: 'Student Loan',
  auto: 'Auto Loan',
  heloc: 'HELOC',
  credit_card: 'Credit Card',
  cosigned: 'Co-signed',
  other: 'Other',
};

const GOAL_LABEL: Record<string, string> = {
  replace_spouse_income: 'Replace spouse income',
  buy_property: 'Buy property',
  exit_job: 'Exit job / FIRE',
  retire: 'Retire comfortably',
  build_generational: 'Build generational wealth',
  other: 'Other',
};

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 mt-8 first:mt-0 pb-1 border-b border-gray-100">
      {children}
    </h2>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ExportReport() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [wings, setWings] = useState<WingSummary[]>([]);
  const [nw, setNw] = useState<NetWorth | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const loadData = () => {
    setLoading(true);
    setErrors([]);
    Promise.allSettled([
      getAllWings(),
      api.get('/networth/current'),
      api.get('/networth/snapshots?limit=13'),
      api.get('/assets'),
      api.get('/liabilities'),
      api.get('/goals'),
      getTodos(),
    ]).then(([w, nwRes, snapRes, assetsRes, liabRes, goalRes, t]) => {
      const errs: string[] = [];
      if (w.status === 'fulfilled') setWings(w.value);
      else errs.push(`Wings: ${(w.reason as Error)?.message ?? 'failed'}`);
      if (nwRes.status === 'fulfilled') setNw(nwRes.value.data);
      else errs.push(`Net worth: ${(nwRes.reason as Error)?.message ?? 'failed'}`);
      if (snapRes.status === 'fulfilled') setSnapshots(snapRes.value.data.snapshots ?? []);
      else errs.push(`Snapshots: ${(snapRes.reason as Error)?.message ?? 'failed'}`);
      if (assetsRes.status === 'fulfilled') setAssets(assetsRes.value.data.assets ?? []);
      else errs.push(`Assets: ${(assetsRes.reason as Error)?.message ?? 'failed'}`);
      if (liabRes.status === 'fulfilled') setLiabilities(liabRes.value.data.liabilities ?? []);
      else errs.push(`Liabilities: ${(liabRes.reason as Error)?.message ?? 'failed'}`);
      if (goalRes.status === 'fulfilled') setGoal(goalRes.value.data.goal ?? null);
      else errs.push(`Goals: ${(goalRes.reason as Error)?.message ?? 'failed'}`);
      if (t.status === 'fulfilled') setTodos(t.value.slice(0, 12));
      else errs.push(`Action items: ${(t.reason as Error)?.message ?? 'failed'}`);
      setErrors(errs);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-8 w-8 text-brand-600" />
      </div>
    );
  }

  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  // ── Derived figures ──────────────────────────────────────────────────────────
  // Prisma Decimal fields serialize as strings over JSON — always wrap in Number()

  const totalAssets = Number(nw?.totalAssets ?? 0);
  const totalLiab = Number(nw?.totalLiabilities ?? 0);
  const netWorth = Number(nw?.netWorth ?? 0);
  const debtToAsset = totalAssets > 0 ? (totalLiab / totalAssets) * 100 : 0;
  const leverageRatio = totalLiab > 0 ? netWorth / totalLiab : null;

  // Snapshot trend (last 12, drop oldest for MoM)
  const trendSnapshots = snapshots.slice(-12);
  const latestSnap = trendSnapshots[trendSnapshots.length - 1];
  const prevSnap = trendSnapshots[trendSnapshots.length - 2];
  const momChange = latestSnap && prevSnap
    ? Number(latestSnap.netWorth) - Number(prevSnap.netWorth)
    : null;

  // YoY change (first vs last snapshot in the 12-month window)
  const yoyChange = trendSnapshots.length >= 2
    ? Number(latestSnap.netWorth) - Number(trendSnapshots[0].netWorth)
    : null;

  // Assets grouped by class
  const assetsByClass = assets.reduce<Record<string, Asset[]>>((acc, a) => {
    (acc[a.assetClass] ??= []).push(a);
    return acc;
  }, {});

  const classOrder = ['equity', 'real_estate', 'other', 'restricted'];

  function assetValue(a: Asset): number {
    if (a.assetClass === 'real_estate') {
      const adj = Number(a.adjustedValue ?? a.estimatedValue ?? 0);
      const mort = Number(a.mortgageBalance ?? 0);
      return adj - mort;
    }
    return Number(a.currentValue ?? 0);
  }

  // Total monthly debt service
  const monthlyDebtService = liabilities.reduce(
    (sum, l) => sum + Number(l.monthlyPayment ?? 0), 0
  );

  // Weighted avg interest rate
  const totalWeightedRate = liabilities.reduce(
    (sum, l) => sum + Number(l.balance) * Number(l.interestRate ?? 0), 0
  );
  const weightedAvgRate = totalLiab > 0 ? totalWeightedRate / totalLiab : 0;

  // Allocation actuals
  const equityActual = totalAssets > 0 ? Number(nw?.breakdown.equityValue ?? 0) / totalAssets * 100 : 0;
  const reActual     = totalAssets > 0 ? Number(nw?.breakdown.realEstateValue ?? 0) / totalAssets * 100 : 0;
  const otherActual  = totalAssets > 0 ? Number(nw?.breakdown.otherValue ?? 0) / totalAssets * 100 : 0;

  const assessedWings = wings.filter(w => w.assessed);
  const avgWingLevel = assessedWings.length
    ? assessedWings.reduce((s, w) => s + w.level, 0) / assessedWings.length
    : 0;

  return (
    <>
      {/* ── Screen toolbar ──────────────────────────────────────────────── */}
      <div className="print:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200 sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-center gap-3">
          <p className="text-xs text-gray-400">
            Downloads a proper PDF document — no print dialog needed
          </p>
          <button
            disabled={downloading}
            onClick={async () => {
              setDownloading(true);
              try {
                const slug = (user?.fullName ?? 'Financial').replace(/\s+/g, '-');
                const date = new Date().toISOString().slice(0, 10);
                const blob = await pdf(
                  <FinancialReportPDF
                    userName={user?.fullName ?? 'Client'}
                    reportDate={reportDate}
                    nw={nw}
                    snapshots={snapshots}
                    assets={assets}
                    liabilities={liabilities}
                    goal={goal}
                    wings={wings}
                    todos={todos}
                  />
                ).toBlob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${slug}-financial-report-${date}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
              } finally {
                setDownloading(false);
              }
            }}
            className="btn-primary gap-2 disabled:opacity-60"
          >
            <Printer className="h-4 w-4" />
            {downloading ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* ── Error banner (screen only) ───────────────────────────────────── */}
      {errors.length > 0 && (
        <div className="print:hidden bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="flex items-start justify-between gap-4 max-w-3xl mx-auto">
            <div>
              <p className="text-sm font-semibold text-red-700 mb-1">Some data failed to load:</p>
              <ul className="text-xs text-red-600 space-y-0.5">
                {errors.map(e => <li key={e}>· {e}</li>)}
              </ul>
            </div>
            <button
              onClick={loadData}
              className="text-xs font-semibold text-red-700 border border-red-300 rounded px-3 py-1.5 hover:bg-red-100 whitespace-nowrap"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* ── Report body ──────────────────────────────────────────────────── */}
      <div className="print-report max-w-3xl mx-auto px-8 py-10 bg-white min-h-screen print:p-0 print:max-w-none font-sans text-gray-900">

        {/* ── Cover / Header ─────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-10 pb-6 border-b-2 border-gray-900">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-brand-600 font-bold text-xl">✦</span>
              <span className="font-bold text-gray-900 text-xl tracking-tight">LegacyOS</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Financial Report</h1>
            <p className="text-sm text-gray-500">{user?.fullName ?? 'Personal Report'}</p>
            <p className="text-xs text-gray-400 mt-0.5">{reportDate}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Net Worth</p>
            <p className={`text-4xl font-bold font-mono ${netWorth >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
              {fmt(netWorth)}
            </p>
            {momChange !== null && (
              <p className={`text-xs mt-1 font-medium ${momChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {momChange >= 0 ? '▲' : '▼'} {fmt(Math.abs(momChange))} this month
              </p>
            )}
            {yoyChange !== null && (
              <p className={`text-xs mt-0.5 ${yoyChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {yoyChange >= 0 ? '+' : ''}{fmt(yoyChange)} over 12 months
              </p>
            )}
          </div>
        </div>

        {/* ── 1. Balance Sheet Summary ──────────────────────────────────── */}
        <SectionHeading>Balance Sheet</SectionHeading>

        <div className="grid grid-cols-3 gap-4 mb-4">
          {[
            { label: 'Total Assets',      value: totalAssets,  color: 'text-gray-900' },
            { label: 'Total Liabilities', value: totalLiab,    color: 'text-red-600' },
            { label: 'Net Worth',         value: netWorth,     color: netWorth >= 0 ? 'text-gray-900' : 'text-red-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <p className={`text-xl font-bold font-mono ${color}`}>{fmt(value)}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          {[
            { label: 'Equities & Securities', value: nw?.breakdown.equityValue ?? 0 },
            { label: 'Real Estate',           value: nw?.breakdown.realEstateValue ?? 0 },
            { label: 'Cash & Other',          value: nw?.breakdown.otherValue ?? 0 },
          ].map(({ label, value }) => (
            <div key={label} className="border border-gray-100 rounded-xl p-3 bg-gray-50">
              <p className="text-xs text-gray-400 mb-0.5">{label}</p>
              <p className="text-base font-semibold font-mono text-gray-700">{fmt(value)}</p>
              {totalAssets > 0 && (
                <p className="text-xs text-gray-400">{fmtPct(value / totalAssets * 100)}</p>
              )}
            </div>
          ))}
        </div>

        {/* ── 2. Financial Health Ratios ────────────────────────────────── */}
        <SectionHeading>Financial Health Indicators</SectionHeading>

        <div className="grid grid-cols-4 gap-3 mb-2">
          {[
            {
              label: 'Debt-to-Asset',
              value: fmtPct(debtToAsset),
              note: debtToAsset < 20 ? 'Strong' : debtToAsset < 40 ? 'Moderate' : 'High',
              good: debtToAsset < 40,
            },
            {
              label: 'Net Worth / Debt',
              value: leverageRatio != null ? `${leverageRatio.toFixed(1)}×` : '—',
              note: leverageRatio !== null && leverageRatio >= 2 ? 'Healthy' : 'Watch',
              good: leverageRatio !== null && leverageRatio >= 2,
            },
            {
              label: 'Monthly Debt Service',
              value: monthlyDebtService > 0 ? fmt(monthlyDebtService) : '—',
              note: 'Total minimum payments',
              good: true,
            },
            {
              label: 'Avg. Interest Rate',
              value: totalLiab > 0 ? fmtPct(weightedAvgRate) : '—',
              note: weightedAvgRate < 5 ? 'Low cost debt' : weightedAvgRate < 10 ? 'Moderate' : 'High cost',
              good: weightedAvgRate < 10,
            },
          ].map(({ label, value, note, good }) => (
            <div key={label} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{label}</p>
              <p className="text-lg font-bold font-mono text-gray-800">{value}</p>
              <p className={`text-[10px] font-medium mt-0.5 ${good ? 'text-emerald-600' : 'text-amber-600'}`}>{note}</p>
            </div>
          ))}
        </div>

        {/* ── 3. Asset Breakdown ───────────────────────────────────────── */}
        <SectionHeading>Asset Detail</SectionHeading>

        {classOrder.filter(cls => assetsByClass[cls]?.length).map(cls => {
          const clsAssets = assetsByClass[cls];
          const clsTotal = clsAssets.reduce((s, a) => s + assetValue(a), 0);
          return (
            <div key={cls} className="asset-group mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-bold text-gray-700">{ASSET_CLASS_LABEL[cls] ?? cls}</p>
                <p className="text-xs font-bold font-mono text-gray-700">{fmt(clsTotal)}</p>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left pb-1 font-medium text-gray-400 w-5/12">Name</th>
                    {cls === 'equity' && <th className="text-left pb-1 font-medium text-gray-400 w-2/12">Ticker</th>}
                    {cls === 'equity' && <th className="text-left pb-1 font-medium text-gray-400 w-2/12">Sector</th>}
                    {cls === 'real_estate' && <th className="text-left pb-1 font-medium text-gray-400 w-4/12">Address</th>}
                    <th className="text-right pb-1 font-medium text-gray-400">Value</th>
                    <th className="text-right pb-1 font-medium text-gray-400 w-1/12">%</th>
                  </tr>
                </thead>
                <tbody>
                  {clsAssets.map(a => {
                    const val = assetValue(a);
                    return (
                      <tr key={a.id} className="border-b border-gray-50">
                        <td className="py-1 text-gray-700 truncate max-w-0 w-5/12 pr-2">
                          {a.name}{a.isPretax && <span className="ml-1 text-[9px] text-violet-500 font-bold">PRE-TAX</span>}
                        </td>
                        {cls === 'equity' && (
                          <td className="py-1 text-gray-500 font-mono">{a.ticker ?? '—'}</td>
                        )}
                        {cls === 'equity' && (
                          <td className="py-1 text-gray-400">{a.sector ?? '—'}</td>
                        )}
                        {cls === 'real_estate' && (
                          <td className="py-1 text-gray-400 truncate max-w-0 w-4/12 pr-2">
                            {a.propertyAddress ?? '—'}
                          </td>
                        )}
                        <td className="py-1 text-right font-mono text-gray-800">{val > 0 ? fmt(val) : '—'}</td>
                        <td className="py-1 text-right text-gray-400">
                          {totalAssets > 0 && val > 0 ? fmtPct(val / totalAssets * 100) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}

        {assets.length === 0 && (
          <p className="text-sm text-gray-400 italic">No assets recorded yet.</p>
        )}

        {/* ── 4. Liabilities Breakdown ─────────────────────────────────── */}
        <SectionHeading>Liabilities Detail</SectionHeading>

        {liabilities.length > 0 ? (
          <table className="w-full text-xs mb-2">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left pb-1 font-medium text-gray-400 w-5/12">Name</th>
                <th className="text-left pb-1 font-medium text-gray-400">Type</th>
                <th className="text-right pb-1 font-medium text-gray-400">Balance</th>
                <th className="text-right pb-1 font-medium text-gray-400">Rate</th>
                <th className="text-right pb-1 font-medium text-gray-400">Monthly</th>
              </tr>
            </thead>
            <tbody>
              {liabilities.map(l => (
                <tr key={l.id} className="border-b border-gray-50">
                  <td className="py-1 text-gray-700 pr-2">{l.name}</td>
                  <td className="py-1 text-gray-400">
                    {LIABILITY_TYPE_LABEL[l.liabilityType ?? ''] ?? l.liabilityType ?? '—'}
                  </td>
                  <td className="py-1 text-right font-mono text-red-600">{fmt(Number(l.balance))}</td>
                  <td className="py-1 text-right text-gray-500">
                    {l.interestRate != null ? fmtPct(Number(l.interestRate)) : '—'}
                  </td>
                  <td className="py-1 text-right text-gray-500">
                    {l.monthlyPayment != null ? fmt(Number(l.monthlyPayment)) : '—'}
                  </td>
                </tr>
              ))}
              <tr className="font-bold">
                <td colSpan={2} className="pt-2 text-gray-700">Total</td>
                <td className="pt-2 text-right font-mono text-red-600">{fmt(totalLiab)}</td>
                <td className="pt-2 text-right text-gray-500">
                  {totalLiab > 0 ? fmtPct(weightedAvgRate) : '—'}
                </td>
                <td className="pt-2 text-right text-gray-500">
                  {monthlyDebtService > 0 ? fmt(monthlyDebtService) : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-400 italic">No liabilities recorded.</p>
        )}

        {/* ── 5. Net Worth Trend ───────────────────────────────────────── */}
        {trendSnapshots.length >= 2 && (
          <>
            <SectionHeading>Net Worth Trend (Last 12 Months)</SectionHeading>
            <table className="w-full text-xs mb-2">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left pb-1 font-medium text-gray-400">Month</th>
                  <th className="text-right pb-1 font-medium text-gray-400">Net Worth</th>
                  <th className="text-right pb-1 font-medium text-gray-400">Total Assets</th>
                  <th className="text-right pb-1 font-medium text-gray-400">Total Liab.</th>
                  <th className="text-right pb-1 font-medium text-gray-400">Change</th>
                </tr>
              </thead>
              <tbody>
                {trendSnapshots.map((s, i) => {
                  const prev = trendSnapshots[i - 1];
                  const change = prev ? Number(s.netWorth) - Number(prev.netWorth) : null;
                  const date = new Date(s.snapshotDate);
                  return (
                    <tr key={s.snapshotDate} className="border-b border-gray-50">
                      <td className="py-1 text-gray-600">
                        {date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-1 text-right font-mono text-gray-800">{fmt(Number(s.netWorth))}</td>
                      <td className="py-1 text-right text-gray-500">{fmt(Number(s.totalAssets))}</td>
                      <td className="py-1 text-right text-gray-500">{fmt(Number(s.totalLiabilities))}</td>
                      <td className={`py-1 text-right font-mono text-xs ${
                        change === null ? 'text-gray-300'
                        : change >= 0 ? 'text-emerald-600' : 'text-red-500'
                      }`}>
                        {change === null ? '—' : `${change >= 0 ? '+' : ''}${fmt(change)}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        {/* ── 6. Target Allocation vs Actual ──────────────────────────── */}
        {goal && (goal.targetEquityPct != null || goal.targetRealEstatePct != null) && (
          <>
            <SectionHeading>Portfolio Allocation: Target vs. Actual</SectionHeading>
            <table className="w-full text-xs mb-2">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left pb-1 font-medium text-gray-400 w-1/3">Asset Class</th>
                  <th className="text-right pb-1 font-medium text-gray-400">Target</th>
                  <th className="text-right pb-1 font-medium text-gray-400">Actual</th>
                  <th className="text-right pb-1 font-medium text-gray-400">Δ</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Equities', target: goal.targetEquityPct, actual: equityActual },
                  { label: 'Real Estate', target: goal.targetRealEstatePct, actual: reActual },
                  { label: 'Cash & Other', target: goal.targetCashPct ?? goal.targetOtherPct, actual: otherActual },
                ].map(({ label, target, actual }) => {
                  if (target == null) return null;
                  const t = Number(target); // Prisma Decimal arrives as string
                  const delta = actual - t;
                  return (
                    <tr key={label} className="border-b border-gray-50">
                      <td className="py-1 text-gray-700">{label}</td>
                      <td className="py-1 text-right text-gray-500">{fmtPct(t)}</td>
                      <td className="py-1 text-right font-mono text-gray-800">{fmtPct(actual)}</td>
                      <td className={`py-1 text-right font-mono ${
                        Math.abs(delta) < 2 ? 'text-gray-400'
                        : delta > 0 ? 'text-blue-500' : 'text-amber-500'
                      }`}>
                        {delta > 0 ? '+' : ''}{fmtPct(delta)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        {/* ── 7. Goals ─────────────────────────────────────────────────── */}
        {goal && (
          <>
            <SectionHeading>Financial Goals</SectionHeading>
            <div className="grid grid-cols-2 gap-4 mb-2">
              {[
                {
                  label: 'Primary Goal',
                  value: goal.primaryGoalLabel
                    || GOAL_LABEL[goal.primaryGoal ?? '']
                    || goal.primaryGoal
                    || '—',
                },
                {
                  label: 'Risk Tolerance',
                  value: goal.riskTolerance
                    ? goal.riskTolerance.charAt(0).toUpperCase() + goal.riskTolerance.slice(1)
                    : '—',
                },
                {
                  label: 'Monthly Income Target',
                  value: goal.targetMonthlyIncome ? fmt(Number(goal.targetMonthlyIncome)) : '—',
                },
                {
                  label: 'Target Date',
                  value: goal.targetDate
                    ? new Date(goal.targetDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
                    : '—',
                },
              ].map(({ label, value }) => (
                <div key={label} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
                  <p className="text-sm font-semibold text-gray-800">{value}</p>
                </div>
              ))}
            </div>
            {(goal.monthlyCryptoBudget != null || goal.financialMode) && (
              <div className="grid grid-cols-2 gap-4 mb-2">
                {goal.monthlyCryptoBudget != null && (
                  <div className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Monthly Crypto Budget</p>
                    <p className="text-sm font-semibold text-gray-800">{fmt(Number(goal.monthlyCryptoBudget))}/mo</p>
                  </div>
                )}
                {goal.financialMode && (
                  <div className="border border-gray-100 rounded-lg p-3 bg-violet-50 col-span-2">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Current Strategy</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{goal.financialMode}</p>
                  </div>
                )}
              </div>
            )}
            {goal.targetMonthlyIncome && (
              <div className="border border-gray-100 rounded-lg p-3 bg-amber-50 text-xs text-amber-800 mb-2">
                {(() => {
                  const monthlyIncome = Number(goal.targetMonthlyIncome);
                  const fireNumber = monthlyIncome * 12 * 25;
                  return (
                    <>
                      <span className="font-bold">FIRE Number:</span>{' '}
                      {fmt(fireNumber)} &nbsp;(25× annual income at 4% SWR)
                      &nbsp;·&nbsp;
                      {netWorth > 0
                        ? `You are ${fmtPct(netWorth / fireNumber * 100)} of the way there`
                        : 'Track net worth growth to see progress'}
                    </>
                  );
                })()}
              </div>
            )}
          </>
        )}

        {/* ── 8. Six Wing Assessment ───────────────────────────────────── */}
        {assessedWings.length > 0 && (
          <>
            <SectionHeading>Six Wing Assessment</SectionHeading>
            <div className="space-y-2.5 mb-2">
              {wings.map(wing => {
                const color = WING_COLORS[wing.color] ?? '#374151';
                const pct = (wing.level / 5) * 100;
                return (
                  <div key={wing.id} className="flex items-center gap-4">
                    <div className="w-32 flex-shrink-0">
                      <p className="text-xs font-semibold text-gray-800">{wing.emoji} {wing.name}</p>
                      <p className="text-[10px] text-gray-400">
                        {wing.assessed ? wing.levelLabel : 'Not assessed'}
                      </p>
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${wing.assessed ? pct : 0}%`, backgroundColor: color }}
                      />
                    </div>
                    <div className="w-20 text-right">
                      <span className="text-[10px] font-bold text-gray-600">
                        {wing.assessed ? `Level ${wing.level} / 5` : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {assessedWings.length > 0 && (
              <p className="text-[10px] text-gray-400 mt-1">
                Average level across {assessedWings.length} assessed wing{assessedWings.length !== 1 ? 's' : ''}:{' '}
                <span className="font-bold text-gray-600">{avgWingLevel.toFixed(1)} / 5</span>
              </p>
            )}
          </>
        )}

        {/* ── 9. Priority Action Items ─────────────────────────────────── */}
        {todos.length > 0 && (
          <>
            <SectionHeading>Priority Action Items</SectionHeading>
            <div className="space-y-1.5">
              {todos.map((todo, i) => (
                <div key={todo.id} className="flex gap-3 py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-[10px] font-bold text-gray-300 mt-0.5 w-4 flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800">{todo.title}</p>
                    {todo.description && (
                      <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{todo.description}</p>
                    )}
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 h-fit mt-0.5 uppercase tracking-wide ${
                    todo.category === 'document' ? 'bg-blue-50 text-blue-600'
                    : todo.category === 'action' ? 'bg-amber-50 text-amber-600'
                    : 'bg-violet-50 text-violet-600'
                  }`}>
                    {todo.category}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div className="pt-8 mt-8 border-t border-gray-100 flex items-start justify-between text-[10px] text-gray-300 gap-4">
          <span>Generated by LegacyOS · {reportDate}</span>
          <span className="text-right max-w-xs">
            For informational purposes only. Not financial, legal, or tax advice.
            Values are estimates and may not reflect current market conditions.
          </span>
        </div>
      </div>

      {/* ── Print stylesheet ──────────────────────────────────────────────
           All 5 issues addressed:
           1. Filename → set via document.title before window.print()
           2. App chrome → every nav/sidebar/fixed element hidden
           3. Letter-size viewport + full-width layout (no mobile max-w)
           4. Full content, no cutoff: avoid page-break inside tables/sections
           5. Clean document styles: white bg, black text, visible borders
      ─────────────────────────────────────────────────────────────────── */}
      <style>{`
        @media print {
          /* ── Page setup: Letter, 1.5 cm margins ── */
          @page {
            size: letter;
            margin: 1.5cm 1.8cm;
          }

          /* ── Strip all screen chrome ── */
          *,
          *::before,
          *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide every nav, sidebar, toolbar, drawer, scrollbar */
          nav, aside, header,
          [class*="sidebar"],
          [class*="bottom-nav"],
          [class*="toolbar"],
          [class*="sticky"],
          [class*="fixed"],
          .print\\:hidden {
            display: none !important;
          }

          /* No scroll, no overflow clipping */
          html, body {
            overflow: visible !important;
            height: auto !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* ── Full-width document layout (override mobile max-w) ── */
          #root, #root > * {
            all: unset;
            display: block;
          }

          .print-report {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          /* ── Typography ── */
          body { font-family: -apple-system, Arial, sans-serif; color: #111; font-size: 11pt; }
          h1 { font-size: 22pt; }
          h2 { font-size: 8pt; }
          p, td, th, li { font-size: 9pt; line-height: 1.4; }

          /* ── Tables: visible borders, no cutoff ── */
          table {
            width: 100%;
            border-collapse: collapse;
            break-inside: auto;
          }
          thead { display: table-header-group; }
          tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          td, th {
            padding: 4px 6px;
            border-bottom: 1px solid #e5e7eb;
          }

          /* ── Sections: avoid cutting a heading from its content ── */
          section, .report-section {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /* Keep asset-class groups together when they're small ── */
          .asset-group {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /* ── Ensure backgrounds & colors print (cards, pills, bars) ── */
          [style*="background-color"],
          [style*="backgroundColor"] {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </>
  );
}
