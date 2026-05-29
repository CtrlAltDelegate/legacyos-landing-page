import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Printer, Users, Copy, CheckCircle2 } from 'lucide-react';
import { api, getErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/auth';
import Spinner from '@/components/Spinner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Goal {
  primaryGoal: string;
  targetMonthlyIncome: number | null;
  riskTolerance: string | null;
  targetEquityPct: number;
  targetRealEstatePct: number;
  targetCashPct: number;
  targetBusinessPct: number;
  targetInsurancePct: number;
  targetOtherPct: number;
}

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

  // Form state
  const [primaryGoal, setPrimaryGoal]               = useState('');
  const [targetMonthlyIncome, setTargetMonthlyIncome] = useState('');
  const [riskTolerance, setRiskTolerance]           = useState('');
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
        const { data } = await api.get('/goals');
        const g: Goal = data.goal;
        if (g) {
          setPrimaryGoal(g.primaryGoal ?? '');
          setTargetMonthlyIncome(g.targetMonthlyIncome != null ? String(g.targetMonthlyIncome) : '');
          setRiskTolerance(g.riskTolerance ?? '');
          setAlloc({
            targetEquityPct:     g.targetEquityPct     ?? 30,
            targetRealEstatePct: g.targetRealEstatePct ?? 40,
            targetCashPct:       g.targetCashPct       ?? 10,
            targetBusinessPct:   g.targetBusinessPct   ?? 10,
            targetInsurancePct:  g.targetInsurancePct  ?? 5,
            targetOtherPct:      g.targetOtherPct      ?? 5,
          });
        }
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
        riskTolerance: riskTolerance || null,
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
      </div>

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
