import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/auth';
import Spinner from '@/components/Spinner';

const GOALS = [
  { value: 'retirement',            label: 'Retirement',            desc: 'Build enough to stop working on my terms' },
  { value: 'financial_independence', label: 'Financial independence', desc: 'Live off passive income without a job' },
  { value: 'wealth_transfer',       label: 'Wealth transfer',        desc: 'Build and pass on wealth to my family' },
  { value: 'real_estate_growth',    label: 'Real estate growth',     desc: 'Grow a portfolio of investment properties' },
  { value: 'debt_freedom',          label: 'Debt freedom',           desc: 'Pay off all debt as fast as possible' },
  { value: 'education_funding',     label: 'Education funding',      desc: 'Fund education for myself or family' },
  { value: 'other',                 label: 'Something else',         desc: 'I have a different primary goal' },
];

const RISK = [
  { value: 'conservative', label: 'Conservative', desc: 'Preserve capital, accept lower growth' },
  { value: 'moderate',     label: 'Moderate',     desc: 'Balanced growth with manageable risk' },
  { value: 'aggressive',   label: 'Aggressive',   desc: 'Maximize growth, accept higher swings' },
];

const STEPS = ['Goal', 'Income', 'Risk', 'Allocations'] as const;

export default function Onboarding() {
  const { setUser, user } = useAuthStore();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
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

  async function handleSubmit(e: FormEvent) {
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
      // Update local user state so ProtectedRoute doesn't bounce back
      if (user) setUser({ ...user, onboardingComplete: true });
      navigate('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Welcome to LegacyOS</h1>
          <p className="mt-2 text-sm text-gray-500">
            Let's set up your financial picture in 2 minutes.
          </p>
        </div>

        {/* Step indicators */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  i === step
                    ? 'bg-brand-600 text-white'
                    : i < step
                    ? 'bg-brand-100 text-brand-700'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs ${i === step ? 'font-medium text-gray-900' : 'text-gray-400'}`}>{s}</span>
              {i < STEPS.length - 1 && <div className="h-px w-6 bg-gray-200" />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card">
            {/* Step 0: Primary goal */}
            {step === 0 && (
              <div className="space-y-3">
                <h2 className="text-base font-semibold text-gray-900">What's your primary financial goal?</h2>
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
            )}

            {/* Step 1: Income target */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-gray-900">What monthly income are you targeting?</h2>
                <p className="text-sm text-gray-500">
                  This helps Flo contextualize your progress. You can skip this for now.
                </p>
                <div>
                  <label className="label" htmlFor="income">Monthly income target ($)</label>
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
            )}

            {/* Step 2: Risk tolerance */}
            {step === 2 && (
              <div className="space-y-3">
                <h2 className="text-base font-semibold text-gray-900">How would you describe your risk tolerance?</h2>
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
            )}

            {/* Step 3: Allocation targets */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-base font-semibold text-gray-900">Target asset allocations</h2>
                  <span className={`text-sm font-semibold ${Math.abs(allocSum - 100) > 1 ? 'text-red-600' : 'text-green-600'}`}>
                    {allocSum}% / 100%
                  </span>
                </div>
                <p className="text-sm text-gray-500">These power Flo's drift alerts. Defaults are just a starting point.</p>
                {(
                  [
                    ['equity',     'Equity / stocks'],
                    ['realEstate', 'Real estate'],
                    ['cash',       'Cash & equivalents'],
                    ['business',   'Business equity'],
                    ['insurance',  'Life insurance / CSV'],
                    ['other',      'Other'],
                  ] as [keyof typeof alloc, string][]
                ).map(([field, label]) => (
                  <div key={field}>
                    <div className="flex justify-between mb-1">
                      <label className="label mb-0">{label}</label>
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
            )}

            {error && (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
          </div>

          {/* Navigation */}
          <div className="mt-4 flex gap-3">
            {step > 0 && (
              <button type="button" onClick={() => setStep(step - 1)} className="btn-secondary flex-1">
                Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                disabled={step === 0 && !primaryGoal}
                onClick={() => setStep(step + 1)}
                className="btn-primary flex-1"
              >
                Continue
              </button>
            ) : (
              <button type="submit" disabled={isLoading || Math.abs(allocSum - 100) > 1} className="btn-primary flex-1">
                {isLoading ? <Spinner className="h-4 w-4" /> : 'Finish setup'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
