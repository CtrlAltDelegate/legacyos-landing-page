import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gem } from 'lucide-react';
import { api, getErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/auth';
import Spinner from '@/components/Spinner';

// ─── Static config ────────────────────────────────────────────────────────────

const GOALS = [
  { value: 'replace_spouse_income', label: "Replace a spouse's income",       desc: 'Build enough passive income so a partner can stop working' },
  { value: 'buy_property',          label: 'Buy a property',                  desc: 'Save and position capital for a real estate purchase' },
  { value: 'exit_job',              label: 'Exit my job',                     desc: 'Build enough income to walk away from employment on my terms' },
  { value: 'retire',                label: 'Retire',                          desc: 'Reach a point where I never have to work again' },
  { value: 'build_generational',    label: 'Build generational wealth',       desc: 'Create assets that outlast me and benefit my children and grandchildren' },
  { value: 'other',                 label: 'Something else',                  desc: 'I have a different primary goal' },
];

const HOUSEHOLD = [
  { value: 'single',             label: 'Just me',                            desc: 'Single, no dependents' },
  { value: 'partnered',          label: 'Me and my partner / spouse',         desc: 'No children at home' },
  { value: 'partnered_kids',     label: 'Me, my partner / spouse, and kids',  desc: 'Children living at home' },
  { value: 'single_parent',      label: 'Single parent with kids',            desc: 'Children living at home, single income' },
];

const INCOME_TYPE = [
  { value: 'w2',          label: 'W-2 employee',                    desc: 'I receive a salary or hourly wages from an employer' },
  { value: 'self_employed', label: 'Self-employed / 1099 contractor', desc: 'I run my own practice, freelance, or contract independently' },
  { value: 'business_owner', label: 'Business owner with employees', desc: 'I own a company with staff — I receive distributions or salary from it' },
  { value: 'multiple',    label: 'Multiple income streams',          desc: 'A mix of the above, or investment / passive income is a major component' },
];

const CONCERNS = [
  { value: 'debt',         label: 'Getting out of debt',            desc: 'High-interest debt is my biggest obstacle right now' },
  { value: 'investing',    label: 'Building my investment portfolio', desc: 'I need to put money to work and grow it faster' },
  { value: 'protection',  label: 'Protecting what I\'ve built',     desc: 'I have assets — I\'m worried about risks and gaps in coverage' },
  { value: 'retirement',  label: 'Planning for retirement',         desc: 'I need to know if I\'m on track and what to do next' },
  { value: 'tax',         label: 'Reducing my tax burden',          desc: 'I\'m paying too much in taxes and want a smarter strategy' },
  { value: 'legacy',      label: 'Passing wealth to the next generation', desc: 'Estate planning, family values, and generational transfer' },
];

const NET_WORTH_RANGES = [
  { value: 'under_100k',    label: 'Just getting started',          desc: 'Under $100K net worth' },
  { value: '100k_500k',     label: 'Building momentum',             desc: '$100K – $500K' },
  { value: '500k_2m',       label: 'Gaining traction',              desc: '$500K – $2M' },
  { value: '2m_10m',        label: 'Established',                   desc: '$2M – $10M' },
  { value: 'over_10m',      label: 'Advanced',                      desc: 'Over $10M' },
];

const RISK = [
  { value: 'conservative', label: 'Conservative', desc: 'Preserve capital, accept lower growth' },
  { value: 'moderate',     label: 'Moderate',     desc: 'Balanced growth with manageable risk'  },
  { value: 'aggressive',   label: 'Aggressive',   desc: 'Maximize growth, accept higher swings'  },
];

const WINGS = [
  { emoji: '📈', name: 'Growth',       color: 'bg-green-50 border-green-200 text-green-700',     desc: 'Investments, equity, real estate' },
  { emoji: '🛡️', name: 'Preservation', color: 'bg-blue-50 border-blue-200 text-blue-700',       desc: 'Insurance, estate planning, emergency fund' },
  { emoji: '❤️', name: 'Philanthropy', color: 'bg-rose-50 border-rose-200 text-rose-700',       desc: 'Giving strategy and charitable vehicles' },
  { emoji: '🌟', name: 'Experiences',  color: 'bg-amber-50 border-amber-200 text-amber-700',    desc: 'Family experiences, travel, traditions' },
  { emoji: '📜', name: 'Legacy',       color: 'bg-violet-50 border-violet-200 text-violet-700', desc: 'Values, mission, generational transfer' },
  { emoji: '⚙️', name: 'Operations',   color: 'bg-teal-50 border-teal-200 text-teal-700',       desc: 'Organization, reviews, document management' },
];

// Step labels — 0-indexed
const STEPS = ['Goal', 'About You', 'Situation', 'Challenge', 'Risk', 'Allocations', 'Your Framework'] as const;

// ─── Shared sub-components ────────────────────────────────────────────────────

function OptionButton<T extends string>({
  value, label, desc, selected, onSelect,
}: { value: T; label: string; desc: string; selected: boolean; onSelect: (v: T) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
        selected ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <div className={`mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2 transition-all ${
        selected ? 'border-brand-600 bg-brand-600' : 'border-gray-300'
      }`} />
      <div>
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
    </button>
  );
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function Onboarding() {
  const { setUser, user } = useAuthStore();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 0 — Goal
  const [primaryGoal, setPrimaryGoal] = useState('');

  // Step 1 — About you (net worth range)
  const [netWorthRange, setNetWorthRange] = useState('');

  // Step 2 — Household + income type
  const [householdSituation, setHouseholdSituation] = useState('');
  const [incomeType, setIncomeType] = useState('');

  // Step 3 — Biggest challenge
  const [biggestConcern, setBiggestConcern] = useState('');

  // Step 4 — Risk
  const [riskTolerance, setRiskTolerance] = useState('');

  // Step 5 — Allocations
  const [targetMonthlyIncome, setTargetMonthlyIncome] = useState('');
  const [alloc, setAlloc] = useState({
    equity: 30, realEstate: 40, cash: 10, business: 10, insurance: 5, other: 5,
  });
  const allocSum = Object.values(alloc).reduce((a, b) => a + b, 0);

  function setAllocField(field: keyof typeof alloc, val: number) {
    setAlloc((prev) => ({ ...prev, [field]: val }));
  }

  // Save family profile answers (non-fatal — don't block onboarding)
  async function saveProfileAnswers() {
    const answers = {
      netWorthRange,
      householdSituation,
      incomeType,
      biggestConcern,
      isSelfEmployed: incomeType === 'self_employed' || incomeType === 'business_owner',
      hasKids: householdSituation === 'partnered_kids' || householdSituation === 'single_parent',
    };
    try {
      await api.put('/profile/family', { answers });
    } catch {
      // Non-fatal: profile answers are a bonus, not a blocker
    }
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
      await Promise.all([
        api.post('/goals', {
          primaryGoal,
          targetMonthlyIncome: targetMonthlyIncome ? Number(targetMonthlyIncome) : undefined,
          riskTolerance: riskTolerance || undefined,
          targetEquityPct: alloc.equity,
          targetRealEstatePct: alloc.realEstate,
          targetCashPct: alloc.cash,
          targetBusinessPct: alloc.business,
          targetInsurancePct: alloc.insurance,
          targetOtherPct: alloc.other,
        }),
        saveProfileAnswers(),
      ]);
      setStep(6); // Wings intro
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

  async function handleSkipSetup() {
    setIsLoading(true);
    setError('');
    try {
      await api.post('/goals', {
        primaryGoal: primaryGoal || 'other',
        riskTolerance: riskTolerance || undefined,
        targetEquityPct: 30, targetRealEstatePct: 40, targetCashPct: 10,
        targetBusinessPct: 10, targetInsurancePct: 5, targetOtherPct: 5,
      });
      await saveProfileAnswers().catch(() => {});
    } catch {
      // 409 = goals already exist, safe to proceed
    } finally {
      setIsLoading(false);
      handleFinish();
    }
  }

  const SkipLink = () => (
    <button type="button" onClick={handleSkipSetup} disabled={isLoading}
      className="w-full text-center text-xs text-gray-400 hover:text-gray-600 py-2 transition-colors">
      {isLoading ? 'Setting up…' : 'Skip setup — explore the dashboard first →'}
    </button>
  );

  const NavButtons = ({
    onBack, onNext, nextDisabled = false, nextLabel = 'Continue',
  }: { onBack: () => void; onNext?: () => void; nextDisabled?: boolean; nextLabel?: string }) => (
    <div className="mt-4 space-y-2">
      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="btn-secondary flex-1">Back</button>
        {onNext
          ? <button type="button" onClick={onNext} disabled={nextDisabled} className="btn-primary flex-1">{nextLabel}</button>
          : null}
      </div>
      <SkipLink />
    </div>
  );

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
              {i < STEPS.length - 1 && <div className="h-px w-3 bg-gray-200" />}
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
                  <OptionButton key={g.value} value={g.value} label={g.label} desc={g.desc}
                    selected={primaryGoal === g.value} onSelect={setPrimaryGoal} />
                ))}
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <button type="submit" disabled={!primaryGoal} className="btn-primary w-full justify-center">
                Continue
              </button>
              <SkipLink />
            </div>
          </form>
        )}

        {/* ── Step 1: Where you are today ───────────────────────────────── */}
        {step === 1 && (
          <div>
            <div className="card space-y-3">
              <div>
                <h2 className="text-base font-bold text-gray-900">Where are you financially today?</h2>
                <p className="text-sm text-gray-500 mt-1">This helps us calibrate your starting point. Rough estimate is fine.</p>
              </div>
              <div className="grid gap-2">
                {NET_WORTH_RANGES.map((r) => (
                  <OptionButton key={r.value} value={r.value} label={r.label} desc={r.desc}
                    selected={netWorthRange === r.value} onSelect={setNetWorthRange} />
                ))}
              </div>
            </div>
            <NavButtons onBack={() => setStep(0)} onNext={() => setStep(2)} nextDisabled={!netWorthRange} />
          </div>
        )}

        {/* ── Step 2: Household + income type ───────────────────────────── */}
        {step === 2 && (
          <div>
            <div className="card space-y-5">
              <div>
                <h2 className="text-base font-bold text-gray-900">Tell us about your household</h2>
                <p className="text-sm text-gray-500 mt-1">This shapes your financial priorities and which areas to focus on first.</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Who's in your household?</p>
                <div className="grid gap-2">
                  {HOUSEHOLD.map((h) => (
                    <OptionButton key={h.value} value={h.value} label={h.label} desc={h.desc}
                      selected={householdSituation === h.value} onSelect={setHouseholdSituation} />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">How do you primarily earn income?</p>
                <div className="grid gap-2">
                  {INCOME_TYPE.map((t) => (
                    <OptionButton key={t.value} value={t.value} label={t.label} desc={t.desc}
                      selected={incomeType === t.value} onSelect={setIncomeType} />
                  ))}
                </div>
              </div>
            </div>
            <NavButtons
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
              nextDisabled={!householdSituation || !incomeType}
            />
          </div>
        )}

        {/* ── Step 3: Biggest challenge ──────────────────────────────────── */}
        {step === 3 && (
          <div>
            <div className="card space-y-3">
              <div>
                <h2 className="text-base font-bold text-gray-900">What's your biggest financial challenge right now?</h2>
                <p className="text-sm text-gray-500 mt-1">We'll surface the most relevant content and steps for your situation.</p>
              </div>
              <div className="grid gap-2">
                {CONCERNS.map((c) => (
                  <OptionButton key={c.value} value={c.value} label={c.label} desc={c.desc}
                    selected={biggestConcern === c.value} onSelect={setBiggestConcern} />
                ))}
              </div>
            </div>
            <NavButtons onBack={() => setStep(2)} onNext={() => setStep(4)} nextDisabled={!biggestConcern} />
          </div>
        )}

        {/* ── Step 4: Risk tolerance ─────────────────────────────────────── */}
        {step === 4 && (
          <div>
            <div className="card space-y-3">
              <h2 className="text-base font-bold text-gray-900">How would you describe your risk tolerance?</h2>
              <div className="grid gap-2">
                {RISK.map((r) => (
                  <OptionButton key={r.value} value={r.value} label={r.label} desc={r.desc}
                    selected={riskTolerance === r.value} onSelect={setRiskTolerance} />
                ))}
              </div>
            </div>
            <NavButtons onBack={() => setStep(3)} onNext={() => setStep(5)} />
          </div>
        )}

        {/* ── Step 5: Income target + allocations ───────────────────────── */}
        {step === 5 && (
          <form onSubmit={handleSaveGoals}>
            <div className="card space-y-5">
              <h2 className="text-base font-bold text-gray-900">Set your targets</h2>

              <div>
                <label className="label">Monthly income target ($)</label>
                <input
                  type="number" min={0} className="input"
                  placeholder="e.g. 10,000"
                  value={targetMonthlyIncome}
                  onChange={(e) => setTargetMonthlyIncome(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">How much monthly passive/investment income are you working toward? Used for FIRE and retirement projections.</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-semibold text-gray-700">Target asset allocations</p>
                  <span className={`text-sm font-bold ${Math.abs(allocSum - 100) > 1 ? 'text-red-600' : 'text-green-600'}`}>
                    {allocSum}% / 100%
                  </span>
                </div>
                <p className="text-xs text-gray-500">How do you want your wealth distributed across asset classes? These power Flo's drift alerts. Adjust any time.</p>

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
              </div>

              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(4)} className="btn-secondary flex-1">Back</button>
                <button type="submit" disabled={isLoading || Math.abs(allocSum - 100) > 1} className="btn-primary flex-1">
                  {isLoading ? <Spinner className="h-4 w-4" /> : 'Save & continue'}
                </button>
              </div>
              <SkipLink />
            </div>
          </form>
        )}

        {/* ── Step 6: Six Wings intro ────────────────────────────────────── */}
        {step === 6 && (
          <div>
            <div className="card space-y-5">
              <div className="text-center">
                <div className="text-3xl mb-2">🎉</div>
                <h2 className="text-lg font-bold text-gray-900">You're all set!</h2>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                  LegacyOS organizes your family's financial life into <strong>Six Wings</strong>.
                  Each wing has a roadmap from zero to family-office-ready — 8 questions, 6 levels, built to last until $25M+.
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
                  Take a yes/no assessment for each wing. It takes about 5 minutes and lets Flo calculate exactly where you are
                  — and what to focus on first. The more honest you are, the more useful it becomes.
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
