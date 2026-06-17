import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Printer, Users, Copy, CheckCircle2, TrendingUp } from 'lucide-react';
import { api, getErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/auth';
import Spinner from '@/components/Spinner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Snapshot {
  snapshotDate: string;
  netWorth: number | string;
}

interface Goal {
  primaryGoal: string;
  targetMonthlyIncome: number | null;
  targetDate: string | null;
  riskTolerance: string | null;
  targetEquityPct: number;
  targetRealEstatePct: number;
  targetCashPct: number;
  targetBusinessPct: number;
  targetInsurancePct: number;
  targetOtherPct: number;
  monthlyCryptoBudget: number | null;
  financialMode: string | null;
}

// ─── Projection helpers ───────────────────────────────────────────────────────

/** Monthly growth rate from snapshot history, or risk-tolerance fallback. */
function monthlyGrowthRate(snapshots: Snapshot[], riskTolerance: string | null): number {
  if (snapshots.length >= 3) {
    const first = Number(snapshots[0].netWorth);
    const last  = Number(snapshots[snapshots.length - 1].netWorth);
    const n     = snapshots.length - 1;
    if (first > 0 && last > 0) {
      const rate = Math.pow(last / first, 1 / n) - 1;
      if (rate > -0.1 && rate < 0.1) return rate; // sanity-cap outliers
    }
  }
  // Fallback by risk tolerance (annual → monthly)
  const annual: Record<string, number> = {
    conservative: 0.05,
    moderate:     0.07,
    aggressive:   0.10,
  };
  const a = annual[riskTolerance ?? 'moderate'] ?? 0.07;
  return Math.pow(1 + a, 1 / 12) - 1;
}

/** Target net worth from 4% safe-withdrawal rule. */
function targetNetWorth(targetMonthlyIncome: number): number {
  return targetMonthlyIncome * 12 * 25;
}

/** Compound years to reach target from current at a monthly rate. */
function yearsToGoal(
  currentNW: number,
  targetNW: number,
  monthlyRate: number
): number | null {
  if (currentNW <= 0 || targetNW <= 0 || monthlyRate <= 0) return null;
  if (currentNW >= targetNW) return 0;
  return Math.log(targetNW / currentNW) / Math.log(1 + monthlyRate) / 12;
}

/** Projected net worth at a future date using compound growth. */
function projectedAtDate(
  currentNW: number,
  targetDate: Date,
  monthlyRate: number
): number {
  const now     = new Date();
  const months  = (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
  if (months <= 0) return currentNW;
  return currentNW * Math.pow(1 + monthlyRate, months);
}

const fmtCurrency = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const fmtCompact = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `$${(n / 1_000).toFixed(0)}K`
    : `$${n.toFixed(0)}`;

// ─── Constants ────────────────────────────────────────────────────────────────

const GOALS = [
  { value: 'replace_spouse_income', label: "Replace a spouse's income",  desc: 'Build enough passive income so a partner can stop working' },
  { value: 'buy_property',          label: 'Buy a property',             desc: 'Save and position capital for a real estate purchase' },
  { value: 'exit_job',              label: 'Exit my job',                desc: 'Build enough income to walk away from employment on my terms' },
  { value: 'retire',                label: 'Retire',                     desc: 'Reach a point where I never have to work again' },
  { value: 'other',                 label: 'Something else',             desc: 'I have a different primary goal' },
];

const RISK = [
  { value: 'conservative', label: 'Conservative', desc: 'Preserve capital, accept lower growth' },
  { value: 'moderate',     label: 'Moderate',     desc: 'Balanced growth with manageable risk' },
  { value: 'aggressive',   label: 'Aggressive',   desc: 'Maximize growth, accept higher swings' },
];

const ALLOC_FIELDS: [keyof Pick<Goal, 'targetEquityPct' | 'targetRealEstatePct' | 'targetCashPct' | 'targetBusinessPct' | 'targetInsurancePct' | 'targetOtherPct'>, string][] = [
  ['targetEquityPct',     'Equity / stocks'],
  ['targetRealEstatePct', 'Real estate'],
  ['targetCashPct',       'Cash & equivalents'],
  ['targetBusinessPct',   'Business equity'],
  ['targetInsurancePct',  'Life insurance / CSV'],
  ['targetOtherPct',      'Other'],
];

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  core: 'Core',
  premium: 'Premium',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Profile() {
  const { user } = useAuthStore();
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [referralLink, setReferralLink]   = useState('');
  const [referralCount, setReferralCount] = useState(0);
  const [copiedRef, setCopiedRef] = useState(false);

  // Projection data
  const [snapshots, setSnapshots]   = useState<Snapshot[]>([]);
  const [currentNW, setCurrentNW]   = useState<number | null>(null);
  const [targetDate, setTargetDate] = useState<string | null>(null);

  // Form state
  const [primaryGoal, setPrimaryGoal]               = useState('');
  const [targetMonthlyIncome, setTargetMonthlyIncome] = useState('');
  const [riskTolerance, setRiskTolerance]           = useState('');
  const [monthlyCryptoBudget, setMonthlyCryptoBudget] = useState('');
  const [financialMode, setFinancialMode]           = useState('');
  const [alloc, setAlloc] = useState({
    targetEquityPct:     30,
    targetRealEstatePct: 40,
    targetCashPct:       10,
    targetBusinessPct:   10,
    targetInsurancePct:  5,
    targetOtherPct:      5,
  });

  const allocSum = Object.values(alloc).reduce((a, b) => a + b, 0);

  useEffect(() => {
    api.get('/referral/code').then(({ data }) => {
      setReferralLink(data.link);
      setReferralCount(data.referralCount);
    }).catch(() => {});

    async function load() {
      try {
        const [goalsRes, snapshotRes, nwRes] = await Promise.all([
          api.get('/goals'),
          api.get('/networth/snapshots?limit=24'),
          api.get('/networth/current'),
        ]);

        const g: Goal = goalsRes.data.goal;
        if (g) {
          setPrimaryGoal(g.primaryGoal ?? '');
          setTargetMonthlyIncome(g.targetMonthlyIncome != null ? String(g.targetMonthlyIncome) : '');
          setRiskTolerance(g.riskTolerance ?? '');
          setTargetDate(g.targetDate ?? null);
          setMonthlyCryptoBudget(g.monthlyCryptoBudget != null ? String(g.monthlyCryptoBudget) : '');
          setFinancialMode(g.financialMode ?? '');
          setAlloc({
            targetEquityPct:     Number(g.targetEquityPct     ?? 30),
            targetRealEstatePct: Number(g.targetRealEstatePct ?? 40),
            targetCashPct:       Number(g.targetCashPct       ?? 10),
            targetBusinessPct:   Number(g.targetBusinessPct   ?? 10),
            targetInsurancePct:  Number(g.targetInsurancePct  ?? 5),
            targetOtherPct:      Number(g.targetOtherPct      ?? 5),
          });
        }

        setSnapshots(snapshotRes.data.snapshots ?? []);
        setCurrentNW(nwRes.data.netWorth ?? null);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function setAllocField(field: keyof typeof alloc, val: number) {
    setAlloc((prev) => ({ ...prev, [field]: val }));
  }

  async function handleSave() {
    if (Math.abs(allocSum - 100) > 1) {
      setError(`Allocations must sum to 100. Current: ${allocSum}`);
      return;
    }
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await api.put('/goals', {
        primaryGoal: primaryGoal || undefined,
        targetMonthlyIncome: targetMonthlyIncome ? Number(targetMonthlyIncome) : null,
        targetDate: targetDate || null,
        riskTolerance: riskTolerance || null,
        monthlyCryptoBudget: monthlyCryptoBudget ? Number(monthlyCryptoBudget) : null,
        financialMode: financialMode || null,
        ...alloc,
      });
      setSuccess('Profile saved.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Spinner className="h-8 w-8" /></div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Profile &amp; Goals</h1>
        <p className="mt-1 text-sm text-gray-500">Update your financial profile at any time. Flo uses this to personalize your experience.</p>
      </div>

      {/* Account info */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="section-label">Account</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">Name</p>
            <p className="text-sm font-medium text-gray-900">{user?.fullName ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Email</p>
            <p className="text-sm font-medium text-gray-900">{user?.email ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Plan</p>
            <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 capitalize">
              {PLAN_LABELS[user?.plan ?? ''] ?? user?.plan ?? '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Primary goal */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="section-label">Primary Goal</h2>
        <div className="grid gap-2">
          {GOALS.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => setPrimaryGoal(g.value)}
              className={`flex items-start gap-3 rounded-lg border p-3 text-left transition ${
                primaryGoal === g.value
                  ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className={`mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2 ${
                primaryGoal === g.value ? 'border-brand-600 bg-brand-600' : 'border-gray-300'
              }`} />
              <div>
                <div className="text-sm font-medium text-gray-900">{g.label}</div>
                <div className="text-xs text-gray-500">{g.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Income target */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="section-label">Monthly Income Target</h2>
        <p className="text-sm text-gray-500">The monthly passive / total income you're working toward.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="income">Amount ($)</label>
            <input
              id="income"
              type="number"
              min={0}
              className="input"
              placeholder="e.g. 10000"
              value={targetMonthlyIncome}
              onChange={(e) => setTargetMonthlyIncome(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="targetDate">Target date</label>
            <input
              id="targetDate"
              type="date"
              className="input"
              value={targetDate ? targetDate.split('T')[0] : ''}
              onChange={(e) => setTargetDate(e.target.value || null)}
            />
          </div>
        </div>
      </div>

      {/* Monthly Crypto Budget */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="section-label">Monthly Crypto Budget</h2>
        <p className="text-sm text-gray-500">Fixed dollar amount allocated to crypto purchases each month. Reflects the planned DCA buy amount, not actual purchases made.</p>
        <div>
          <label className="label" htmlFor="cryptoBudget">Amount ($)</label>
          <input
            id="cryptoBudget"
            type="number"
            min={0}
            className="input max-w-xs"
            placeholder="e.g. 500"
            value={monthlyCryptoBudget}
            onChange={(e) => setMonthlyCryptoBudget(e.target.value)}
          />
        </div>
      </div>

      {/* Financial Mode */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="section-label">Current Financial Strategy</h2>
        <p className="text-sm text-gray-500">Describe your active capital priority in 1–2 sentences. Update this whenever your strategy shifts — Flo and your report will reflect it.</p>
        <div>
          <label className="label" htmlFor="financialMode">Strategy note</label>
          <textarea
            id="financialMode"
            rows={3}
            className="input resize-none"
            placeholder="e.g. Crypto accumulation phase — $500/month DCA, not actively deploying into acquisitions."
            value={financialMode}
            onChange={(e) => setFinancialMode(e.target.value)}
            maxLength={500}
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{financialMode.length}/500</p>
        </div>
      </div>

      {/* Goal Projections */}
      {(() => {
        const income = targetMonthlyIncome ? Number(targetMonthlyIncome) : null;
        const nw     = currentNW;
        if (!income || !nw) return null;

        const rate      = monthlyGrowthRate(snapshots, riskTolerance || null);
        const targetNW  = targetNetWorth(income);
        const years     = yearsToGoal(nw, targetNW, rate);
        const goalDate  = targetDate ? new Date(targetDate) : null;
        const projNW    = goalDate ? projectedAtDate(nw, goalDate, rate) : null;
        const annualPct = ((Math.pow(1 + rate, 12) - 1) * 100).toFixed(1);
        const onTrack   = projNW != null && projNW >= targetNW;

        return (
          <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-brand-600" />
              <h2 className="section-label mb-0">Goal Projections</h2>
            </div>
            <p className="text-xs text-gray-400">
              Based on {snapshots.length >= 3 ? `your last ${snapshots.length} monthly snapshots` : `${riskTolerance ?? 'moderate'} assumed growth`} &middot; 4% safe-withdrawal rule
            </p>

            <div className="grid grid-cols-2 gap-4">
              {/* Target net worth */}
              <div className="rounded-lg bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-400 mb-1">Target net worth</p>
                <p className="text-base font-bold text-gray-900">{fmtCompact(targetNW)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{fmtCurrency(income)}/mo × 25</p>
              </div>

              {/* Current trajectory */}
              <div className="rounded-lg bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-400 mb-1">Current growth rate</p>
                <p className={`text-base font-bold ${rate > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {rate > 0 ? '+' : ''}{annualPct}%/yr
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {snapshots.length >= 3 ? 'Observed' : 'Estimated'}
                </p>
              </div>

              {/* Years to goal */}
              <div className="rounded-lg bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-400 mb-1">Years to goal</p>
                {years === 0 ? (
                  <p className="text-base font-bold text-emerald-600">Already there 🎉</p>
                ) : years != null && rate > 0 ? (
                  <>
                    <p className="text-base font-bold text-gray-900">{years.toFixed(1)} yrs</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      ~{new Date(Date.now() + years * 365.25 * 24 * 3600 * 1000).getFullYear()}
                    </p>
                  </>
                ) : (
                  <p className="text-base font-bold text-gray-400">—</p>
                )}
              </div>

              {/* Projected at target date */}
              {projNW != null && goalDate ? (
                <div className={`rounded-lg px-4 py-3 ${onTrack ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                  <p className="text-xs text-gray-400 mb-1">
                    Projected at {goalDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </p>
                  <p className={`text-base font-bold ${onTrack ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {fmtCompact(projNW)}
                  </p>
                  <p className={`text-xs mt-0.5 ${onTrack ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {onTrack ? '✓ On track' : `${fmtCompact(targetNW - projNW)} gap`}
                  </p>
                </div>
              ) : (
                <div className="rounded-lg bg-gray-50 px-4 py-3">
                  <p className="text-xs text-gray-400 mb-1">Projected at target date</p>
                  <p className="text-xs text-gray-400">Set a target date to see this.</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Risk tolerance */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="section-label">Risk Tolerance</h2>
        <div className="grid gap-2">
          {RISK.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRiskTolerance(r.value)}
              className={`flex items-start gap-3 rounded-lg border p-3 text-left transition ${
                riskTolerance === r.value
                  ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className={`mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2 ${
                riskTolerance === r.value ? 'border-brand-600 bg-brand-600' : 'border-gray-300'
              }`} />
              <div>
                <div className="text-sm font-medium text-gray-900">{r.label}</div>
                <div className="text-xs text-gray-500">{r.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Asset allocations */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="section-label">Target Allocations</h2>
          <span className={`text-sm font-semibold ${Math.abs(allocSum - 100) > 1 ? 'text-red-600' : 'text-emerald-600'}`}>
            {allocSum}% / 100%
          </span>
        </div>
        <p className="text-sm text-gray-500">Flo uses these targets to flag when your portfolio drifts off course.</p>
        <div className="space-y-4">
          {ALLOC_FIELDS.map(([field, label]) => (
            <div key={field}>
              <div className="flex justify-between mb-1">
                <label className="label mb-0 text-xs">{label}</label>
                <span className="text-sm font-semibold text-gray-700">{alloc[field]}%</span>
              </div>
              <input
                type="range"
                min={0} max={100} step={1}
                value={alloc[field]}
                onChange={(e) => setAllocField(field, Number(e.target.value))}
                className="w-full accent-brand-600"
              />
            </div>
          ))}
        </div>
        {Math.abs(allocSum - 100) > 1 && (
          <p className="text-xs text-red-600">Allocations must sum to 100% before saving.</p>
        )}
      </div>

      {/* Feedback */}
      {error   && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p>}

      {/* Referrals */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="section-label">Invite friends</h2>
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <Users className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 mb-0.5">
              Share LegacyOS with your family and friends
            </p>
            <p className="text-xs text-gray-500 mb-3">
              {referralCount > 0
                ? `You've referred ${referralCount} person${referralCount !== 1 ? 's' : ''} so far. 🎉`
                : 'Your personal invite link — share it with anyone.'}
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={referralLink}
                className="input text-xs py-1.5 flex-1 bg-gray-50"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(referralLink);
                  setCopiedRef(true);
                  setTimeout(() => setCopiedRef(false), 2000);
                }}
                className="btn-secondary px-3 py-1.5 text-xs flex-shrink-0"
              >
                {copiedRef ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="section-label">Security</h2>
        <div className="flex items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-brand-50 flex items-center justify-center">
              <Shield className="h-4 w-4 text-brand-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Two-factor authentication</p>
              <p className="text-xs text-gray-500">Add an extra layer of security with an authenticator app.</p>
            </div>
          </div>
          <Link to="/security/2fa" className="btn-secondary text-sm px-4 py-2 shrink-0">
            Manage 2FA
          </Link>
        </div>
      </div>

      {/* Export */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="section-label">Export</h2>
        <div className="flex items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gray-50 flex items-center justify-center">
              <Printer className="h-4 w-4 text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Financial snapshot report</p>
              <p className="text-xs text-gray-500">Net worth, wing levels, and action items — exportable as PDF.</p>
            </div>
          </div>
          <Link to="/export" className="btn-secondary text-sm px-4 py-2 shrink-0">
            Generate report
          </Link>
        </div>
      </div>

      {/* Feedback */}
      {error   && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p>}

      {/* Save */}
      <div className="flex justify-end pb-8">
        <button
          onClick={handleSave}
          disabled={saving || Math.abs(allocSum - 100) > 1}
          className="btn-primary px-6 py-2.5"
        >
          {saving ? <><Spinner className="h-4 w-4" /> Saving…</> : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
