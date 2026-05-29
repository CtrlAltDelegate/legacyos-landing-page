import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gem } from 'lucide-react';
import { api, getErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/auth';
import Spinner from '@/components/Spinner';

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

const WINGS = [
  { emoji: '📈', name: 'Growth',       color: 'bg-green-50 border-green-200 text-green-700',  desc: 'Investments, equity, real estate' },
  { emoji: '🛡️', name: 'Preservation', color: 'bg-blue-50 border-blue-200 text-blue-700',    desc: 'Insurance, estate planning, emergency fund' },
  { emoji: '❤️', name: 'Philanthropy', color: 'bg-rose-50 border-rose-200 text-rose-700',    desc: 'Giving strategy and charitable vehicles' },
  { emoji: '🌟', name: 'Experiences',  color: 'bg-amber-50 border-amber-200 text-amber-700', desc: 'Family experiences, travel, traditions' },
  { emoji: '📜', name: 'Legacy',       color: 'bg-violet-50 border-violet-200 text-violet-700', desc: 'Values, mission, generational transfer' },
  { emoji: '⚙️', name: 'Operations',   color: 'bg-teal-50 border-teal-200 text-teal-700',    desc: 'Organization, reviews, document management' },
];

const STEPS = ['Goal', 'Income', 'Risk', 'Allocations', 'Your Framework'] as const;

export default function Onboarding() {
  const { setUser, user } = useAuthStore();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [primaryGoal, setPrimaryGoal] = useState('');
  const [targetMonthlyIncome, setTargetMonthlyIncome] = useState('');
  const [riskTolerance, setRiskTolerance] = useState('');
  const [alloc, setAlloc] = useState({
    equity: 30, realEstate: 40, cash: 10, business: 10, insurance: 5, other: 5,
  });

  const allocSum = Object.values(alloc).reduce((a, b) => a + b, 0);

  function setAllocField(field: keyof typeof alloc, val: number) {
    setAlloc((prev) => ({ ...prev, [field]: val }));
  }

  async function handleSaveGoals(e: FormEvent) {
    e.preventDefault();
    if (Math.abs(allocSum - 100) > 1) {
      setError(`Allocations must sum to 100. Current: ${allocSum}`);
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await api.post('/goals', {
        primaryGoal,
        targetMonthlyIncome: targetMonthlyIncome ? Number(targetMonthlyIncome) : undefined,
        riskTolerance: riskTolerance || undefined,
        targetEquityPct: alloc.equity,
        targetRealEstatePct: alloc.realEstate,
        targetCashPct: alloc.cash,
        targetBusinessPct: alloc.business,
        targetInsurancePct: alloc.insurance,
        targetOtherPct: alloc.other,
      });
      // Don't navigate yet — show the Six Wings intro step
      setStep(4);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  function handleFinish() {
    if (user) setUser({ ...user, onboardingComplete: true });
    navigate('/dashboard');
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-surface-1 px-4 py-12 overflow-y-auto">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <Gem className="h-5 w-5 text-brand-600" />
          <span className="text-xl font-bold tracking-tight text-gray-900">LegacyOS</span>
        </div>

        {/* Step indicator */}
        <div className="mb-6 flex items-center justify-center gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                i === step ? 'bg-brand-600 text-white'
                : i < step  ? 'bg-brand-100 text-brand-700'
                : 'bg-gray-200 text-gray-400'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className="h-px w-4 bg-gray-200" />}
            </div>
          ))}
        </div>

        {/* ── Step 0: Primary goal ───────────────────────────────────────── */}
        {step === 0 && (
          <form onSubmit={(e) => { e.preventDefault(); setStep(1); }}>
            <div className="card space-y-3">
              <h2 className="text-base font-bold text-gray-900">What's your primary financial goal?</h2>
              <div className="grid gap-2">
                {GOALS.map((g) => (
                  <button
                    key={g.value} type="button"
                    onClick={() => setPrimaryGoal(g.value)}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                      primaryGoal === g.value
                        ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2 transition-all ${
                      primaryGoal === g.value ? 'border-brand-600 bg-brand-600' : 'border-gray-300'
                    }`} />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{g.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{g.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <button type="submit" disabled={!primaryGoal} className="btn-primary w-full justify-center">
                Continue
              </button>
            </div>
          </form>
        )}

        {/* ── Step 1: Income target ──────────────────────────────────────── */}
        {step === 1 && (
          <div>
            <div className="card space-y-4">
              <h2 className="text-base font-bold text-gray-900">What monthly income are you targeting?</h2>
              <p className="text-sm text-gray-500">This helps Flo contextualize your progress. You can skip this.</p>
              <div>
                <label className="label">Monthly income target ($)</label>
                <input
                  type="number" min={0} className="input"
                  placeholder="e.g. 10,000"
                  value={targetMonthlyIncome}
                  onChange={(e) => setTargetMonthlyIncome(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={() => setStep(0)} className="btn-secondary flex-1">Back</button>
              <button type="button" onClick={() => setStep(2)} className="btn-primary flex-1">Continue</button>
            </div>
          </div>
        )}

        {/* ── Step 2: Risk tolerance ─────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <div className="card space-y-3">
              <h2 className="text-base font-bold text-gray-900">How would you describe your risk tolerance?</h2>
              <div className="grid gap-2">
                {RISK.map((r) => (
                  <button
                    key={r.value} type="button"
                    onClick={() => setRiskTolerance(r.value)}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                      riskTolerance === r.value
                        ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2 transition-all ${
                      riskTolerance === r.value ? 'border-brand-600 bg-brand-600' : 'border-gray-300'
                    }`} />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{r.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
              <button type="button" onClick={() => setStep(3)} className="btn-primary flex-1">Continue</button>
            </div>
          </div>
        )}

        {/* ── Step 3: Allocation targets ─────────────────────────────────── */}
        {step === 3 && (
          <form onSubmit={handleSaveGoals}>
            <div className="card space-y-4">
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-bold text-gray-900">Target asset allocations</h2>
                <span className={`text-sm font-bold ${Math.abs(allocSum - 100) > 1 ? 'text-red-600' : 'text-green-600'}`}>
                  {allocSum}% / 100%
                </span>
              </div>
              <p className="text-sm text-gray-500">These power Flo's drift alerts. Defaults are a starting point — adjust any time.</p>

              {([
                ['equity',     'Equity / stocks'],
                ['realEstate', 'Real estate'],
                ['cash',       'Cash & equivalents'],
                ['business',   'Business equity'],
                ['insurance',  'Life insurance / CSV'],
                ['other',      'Other'],
              ] as [keyof typeof alloc, string][]).map(([field, label]) => (
                <div key={field}>
                  <div className="flex justify-between mb-1">
                    <label className="label mb-0 text-gray-600">{label}</label>
                    <span className="text-sm font-bold text-gray-700">{alloc[field]}%</span>
                  </div>
                  <input
                    type="range" min={0} max={100} step={1}
                    value={alloc[field]}
                    onChange={(e) => setAllocField(field, Number(e.target.value))}
                    className="w-full accent-brand-600"
                  />
                </div>
              ))}

              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            </div>
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1">Back</button>
              <button type="submit" disabled={isLoading || Math.abs(allocSum - 100) > 1} className="btn-primary flex-1">
                {isLoading ? <Spinner className="h-4 w-4" /> : 'Save & continue'}
              </button>
            </div>
          </form>
        )}

        {/* ── Step 4: Six Wings intro ────────────────────────────────────── */}
        {step === 4 && (
          <div>
            <div className="card space-y-5">
              <div className="text-center">
                <div className="text-3xl mb-2">🎉</div>
                <h2 className="text-lg font-bold text-gray-900">You're all set!</h2>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                  LegacyOS organizes your family's financial life into <strong>Six Wings</strong>.
                  Knowing your level in each one is the foundation of everything Flo does.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {WINGS.map((w) => (
                  <div key={w.name} className={`rounded-xl border p-3 ${w.color}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg leading-none">{w.emoji}</span>
                      <span className="text-sm font-bold">{w.name}</span>
                    </div>
                    <p className="text-xs opacity-75 leading-relaxed">{w.desc}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-brand-50 border border-brand-100 px-4 py-3">
                <p className="text-sm font-semibold text-brand-800 mb-1">Your first task</p>
                <p className="text-xs text-brand-700 leading-relaxed">
                  Take a quick yes/no assessment for each wing. It takes about 3 minutes and lets Flo calculate
                  exactly where you are — and what to focus on first.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <button onClick={handleFinish} className="btn-primary w-full justify-center text-base py-3">
                Take my assessment →
              </button>
              <button onClick={handleFinish} className="btn-ghost w-full text-gray-400 text-sm">
                Skip for now — I'll explore on my own
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
