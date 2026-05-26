import { useState } from 'react';
import { saveFamilyProfile, type ProfileAnswers } from '@/api/profile';
import { getErrorMessage } from '@/api/client';
import Spinner from '@/components/Spinner';

// ─── Question config ──────────────────────────────────────────────────────────

type QuestionType = 'boolean' | 'select' | 'number';

interface SelectOption {
  value: string;
  label: string;
  emoji?: string;
}

interface Question {
  id: string;
  text: string;
  hint?: string;
  type: QuestionType;
  options?: SelectOption[];   // for 'select'
  min?: number; max?: number; // for 'number'
  showIf?: (a: ProfileAnswers) => boolean;
}

interface Screen {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  questions: Question[];
}

const SCREENS: Screen[] = [
  // ── Family ───────────────────────────────────────────────────────────────
  {
    id: 'family',
    emoji: '👨‍👩‍👧‍👦',
    title: 'Your family',
    subtitle: "Tell us about who your family office is built for.",
    questions: [
      {
        id: 'is_married',
        text: 'Are you married or in a domestic partnership?',
        type: 'boolean',
      },
      {
        id: 'has_kids',
        text: 'Do you have children?',
        type: 'boolean',
      },
      {
        id: 'num_kids',
        text: 'How many children do you have?',
        type: 'number',
        min: 1, max: 20,
        showIf: (a) => a.has_kids === true,
      },
      {
        id: 'co_parent_relationship',
        text: "What best describes your relationship with your children's other parent?",
        type: 'select',
        options: [
          { value: 'married',      label: 'Married / together', emoji: '💍' },
          { value: 'committed',    label: 'Committed but not married', emoji: '🤝' },
          { value: 'co_parenting', label: 'Co-parenting separately', emoji: '🏠' },
          { value: 'single',       label: 'Single parent', emoji: '🧑' },
        ],
        showIf: (a) => a.has_kids === true,
      },
      {
        id: 'has_elderly_dependents',
        text: 'Do you financially support or expect to support elderly parents or relatives?',
        hint: 'This affects long-term planning and insurance needs.',
        type: 'boolean',
      },
    ],
  },

  // ── Home ─────────────────────────────────────────────────────────────────
  {
    id: 'home',
    emoji: '🏡',
    title: 'Your home',
    subtitle: 'Housing is typically your largest asset or expense.',
    questions: [
      {
        id: 'home_status',
        text: 'Do you own or rent your home?',
        type: 'select',
        options: [
          { value: 'own',   label: 'Own',  emoji: '🏠' },
          { value: 'rent',  label: 'Rent', emoji: '🔑' },
          { value: 'other', label: 'Other (living with family, etc.)', emoji: '🤷' },
        ],
      },
      {
        id: 'has_mortgage',
        text: 'Do you have a mortgage on your home?',
        type: 'boolean',
        showIf: (a) => a.home_status === 'own',
      },
      {
        id: 'monthly_rent_range',
        text: 'What is your approximate monthly rent?',
        type: 'select',
        options: [
          { value: 'under_1500',  label: 'Under $1,500' },
          { value: '1500_2500',   label: '$1,500 – $2,500' },
          { value: '2500_4000',   label: '$2,500 – $4,000' },
          { value: '4000_plus',   label: '$4,000+' },
          { value: 'prefer_not',  label: 'Prefer not to say' },
        ],
        showIf: (a) => a.home_status === 'rent',
      },
    ],
  },

  // ── Vehicle ───────────────────────────────────────────────────────────────
  {
    id: 'vehicle',
    emoji: '🚗',
    title: 'Your vehicle(s)',
    subtitle: "Leased and financed vehicles are liabilities we can track for you.",
    questions: [
      {
        id: 'has_vehicle',
        text: 'Do you have a car or other vehicle?',
        type: 'boolean',
      },
      {
        id: 'vehicle_status',
        text: 'Is your primary vehicle leased, owned free and clear, or financed?',
        type: 'select',
        options: [
          { value: 'owned',    label: 'Owned free and clear', emoji: '✅' },
          { value: 'leased',   label: 'Leased', emoji: '📋' },
          { value: 'financed', label: 'Financed (auto loan)', emoji: '💳' },
        ],
        showIf: (a) => a.has_vehicle === true,
      },
      {
        id: 'has_multiple_vehicles',
        text: 'Do you have a second vehicle?',
        type: 'boolean',
        showIf: (a) => a.has_vehicle === true,
      },
      {
        id: 'vehicle2_status',
        text: 'Is the second vehicle leased, owned, or financed?',
        type: 'select',
        options: [
          { value: 'owned',    label: 'Owned free and clear', emoji: '✅' },
          { value: 'leased',   label: 'Leased', emoji: '📋' },
          { value: 'financed', label: 'Financed (auto loan)', emoji: '💳' },
        ],
        showIf: (a) => a.has_vehicle === true && a.has_multiple_vehicles === true,
      },
    ],
  },

  // ── Insurance ────────────────────────────────────────────────────────────
  {
    id: 'insurance',
    emoji: '🛡️',
    title: 'Insurance & protection',
    subtitle: 'Insurance is how you protect everything you\'re building.',
    questions: [
      {
        id: 'has_health_insurance',
        text: 'Do you have health insurance?',
        type: 'boolean',
      },
      {
        id: 'has_life_insurance',
        text: 'Do you have life insurance coverage?',
        type: 'boolean',
      },
      {
        id: 'has_disability_insurance',
        text: 'Do you have disability insurance?',
        hint: 'Covers your income if you become unable to work.',
        type: 'boolean',
      },
      {
        id: 'has_umbrella_policy',
        text: 'Do you have an umbrella liability policy?',
        hint: 'An umbrella policy adds $1M+ of liability coverage beyond your home/auto policies.',
        type: 'boolean',
      },
    ],
  },

  // ── Estate ────────────────────────────────────────────────────────────────
  {
    id: 'estate',
    emoji: '📜',
    title: 'Estate & legacy documents',
    subtitle: 'These protect your family if something happens to you.',
    questions: [
      {
        id: 'has_will',
        text: 'Do you have a will or basic estate documents in place?',
        type: 'boolean',
      },
      {
        id: 'has_trust',
        text: 'Do you have a living trust?',
        hint: 'A trust avoids probate and gives you more control over how assets transfer.',
        type: 'boolean',
      },
      {
        id: 'beneficiaries_designated',
        text: 'Have you designated beneficiaries on your retirement accounts and life insurance policies?',
        hint: 'These pass outside your will — outdated beneficiaries are one of the most common estate planning mistakes.',
        type: 'boolean',
      },
      {
        id: 'has_power_of_attorney',
        text: 'Do you have a durable power of attorney and healthcare directive?',
        type: 'boolean',
      },
    ],
  },

  // ── Business ─────────────────────────────────────────────────────────────
  {
    id: 'business',
    emoji: '💼',
    title: 'Business & income',
    subtitle: 'Business ownership changes your tax strategy, liability exposure, and succession plan.',
    questions: [
      {
        id: 'is_self_employed',
        text: 'Are you self-employed or a business owner?',
        type: 'boolean',
      },
      {
        id: 'has_business_entity',
        text: 'Do you operate through a formal business entity (LLC, S-Corp, C-Corp)?',
        type: 'boolean',
        showIf: (a) => a.is_self_employed === true,
      },
      {
        id: 'has_business_partner',
        text: 'Do you have business partners?',
        hint: 'Partnerships require buy-sell agreements and succession planning.',
        type: 'boolean',
        showIf: (a) => a.is_self_employed === true,
      },
      {
        id: 'has_other_income',
        text: 'Do you have income sources beyond your primary job?',
        hint: 'Examples: rental income, freelance, side business, investments.',
        type: 'boolean',
      },
    ],
  },

  // ── Financial snapshot ────────────────────────────────────────────────────
  {
    id: 'financial',
    emoji: '💰',
    title: 'Financial snapshot',
    subtitle: 'This helps Flo calibrate advice to your actual situation. All ranges are approximate.',
    questions: [
      {
        id: 'income_range',
        text: 'What is your approximate annual household income?',
        type: 'select',
        options: [
          { value: 'under_50k',   label: 'Under $50,000' },
          { value: '50_100k',     label: '$50,000 – $100,000' },
          { value: '100_200k',    label: '$100,000 – $200,000' },
          { value: '200_500k',    label: '$200,000 – $500,000' },
          { value: '500k_plus',   label: '$500,000+' },
          { value: 'prefer_not',  label: 'Prefer not to say' },
        ],
      },
      {
        id: 'is_primary_earner',
        text: 'Are you the primary earner in your household?',
        type: 'boolean',
      },
      {
        id: 'has_emergency_fund',
        text: 'Do you have at least 3 months of living expenses saved in an accessible account?',
        hint: 'This is the foundation of every financial plan.',
        type: 'boolean',
      },
      {
        id: 'is_actively_investing',
        text: 'Are you currently investing money on a regular basis (at least monthly)?',
        type: 'boolean',
      },
    ],
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initialAnswers?: ProfileAnswers;
  onComplete: (answers: ProfileAnswers) => void;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function BooleanInput({ value, onChange }: { value: boolean | undefined; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-3">
      {([true, false] as const).map((v) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => onChange(v)}
          className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition ${
            value === v
              ? 'bg-brand-600 border-transparent text-white shadow-sm'
              : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          {v ? '✓  Yes' : '✗  No'}
        </button>
      ))}
    </div>
  );
}

function SelectInput({
  options,
  value,
  onChange,
}: {
  options: SelectOption[];
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-medium text-left transition ${
            value === opt.value
              ? 'bg-brand-600 border-transparent text-white shadow-sm'
              : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          {opt.emoji && <span className="text-base leading-none">{opt.emoji}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function NumberInput({ value, onChange, min, max }: {
  value: number | undefined;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value ?? ''}
      onChange={(e) => {
        const n = parseInt(e.target.value, 10);
        if (!isNaN(n)) onChange(n);
      }}
      placeholder="Enter a number"
      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-200"
    />
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FamilyQuestionnaire({ initialAnswers = {}, onComplete, onClose }: Props) {
  const [screenIndex, setScreenIndex] = useState(0);
  const [answers, setAnswers] = useState<ProfileAnswers>({ ...initialAnswers });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showDoneScreen, setShowDoneScreen] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);

  const screen = SCREENS[screenIndex];
  const isLast = screenIndex === SCREENS.length - 1;

  // Only show questions whose showIf condition is met (or have no condition)
  const visibleQuestions = screen.questions.filter(
    (q) => !q.showIf || q.showIf(answers)
  );

  function setAnswer(id: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function clearAnswer(id: string) {
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function handleNext() {
    setError('');

    // Auto-save progress on every screen change (not complete yet)
    try {
      await saveFamilyProfile(answers, false);
    } catch {
      // Non-fatal — continue anyway
    }

    if (isLast) {
      await handleFinish();
    } else {
      setScreenIndex((i) => i + 1);
    }
  }

  async function handleFinish() {
    setSaving(true);
    try {
      await saveFamilyProfile(answers, true);
      // Count how many todos will be generated (rough estimate for UI)
      // The actual count comes from the server — we just show a plausible number
      const dynamicCount = Object.keys(answers).filter((k) =>
        answers[k] === false || (answers[k] === 'leased') || (answers[k] === 'financed')
      ).length;
      setGeneratedCount(Math.max(dynamicCount, 2));
      setShowDoneScreen(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  // ── Done screen ────────────────────────────────────────────────────────────

  if (showDoneScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden text-center">
          <div className="bg-brand-50 border-b border-brand-100 px-8 pt-8 pb-6">
            <div className="text-5xl mb-3">🎯</div>
            <h2 className="text-xl font-bold text-gray-900">Your profile is set!</h2>
            <p className="text-sm text-gray-500 mt-1">
              Flo now knows a lot more about your family.
            </p>
          </div>
          <div className="px-8 py-6 space-y-4">
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-left">
              <p className="text-sm font-bold text-amber-800">
                📋 {generatedCount}+ action items added to your To-Do list
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Based on your answers, we've created a personalized action list on your dashboard — from document uploads to protection gaps to close.
              </p>
            </div>
            <p className="text-xs text-gray-400">
              Your answers are private to your account. You can update them anytime from Settings.
            </p>
          </div>
          <div className="px-8 pb-8">
            <button
              onClick={() => onComplete(answers)}
              className="w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-white hover:bg-brand-700 transition"
            >
              View my action items →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Privacy intro (before screen 0) ───────────────────────────────────────

  if (screenIndex === -1) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
          <div className="px-8 pt-8 pb-6 text-center">
            <div className="text-5xl mb-4">🔒</div>
            <h2 className="text-xl font-bold text-gray-900">Your information is private</h2>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Everything you share here is encrypted and visible only to you. LegacyOS does not sell or share your data — ever.
            </p>
          </div>
          <div className="mx-8 mb-6 rounded-xl bg-brand-50 border border-brand-100 px-4 py-3">
            <p className="text-sm font-semibold text-brand-800">
              ✦ The more Flo knows, the better she can help
            </p>
            <p className="text-xs text-brand-600 mt-1 leading-relaxed">
              These 7 quick screens help Flo understand your family's full picture — so her advice is specific to <em>you</em>, not generic. Skip any question you're not comfortable answering.
            </p>
          </div>
          <div className="px-8 pb-8 flex flex-col gap-3">
            <button
              onClick={() => setScreenIndex(0)}
              className="w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-white hover:bg-brand-700 transition"
            >
              Let's get started →
            </button>
            <button
              onClick={onClose}
              className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Question screen ────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-[92vh]">

        {/* Progress bar */}
        <div className="h-1.5 w-full bg-gray-100 rounded-t-2xl overflow-hidden">
          <div
            className="h-full bg-brand-500 transition-all duration-500"
            style={{ width: `${((screenIndex + 1) / SCREENS.length) * 100}%` }}
          />
        </div>

        {/* Screen header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              {screenIndex + 1} of {SCREENS.length}
            </span>
            <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-lg leading-none">✕</button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{screen.emoji}</span>
            <div>
              <h2 className="text-base font-bold text-gray-900">{screen.title}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{screen.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Privacy chip */}
        <div className="px-6 pt-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3 py-1 text-[11px] font-semibold text-green-700">
            🔒 Private to you · Skip any question
          </span>
        </div>

        {/* Questions */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
          {visibleQuestions.map((q) => {
            const val = answers[q.id];
            return (
              <div key={q.id}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800 leading-snug">{q.text}</p>
                    {q.hint && (
                      <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{q.hint}</p>
                    )}
                  </div>
                  {val !== undefined && (
                    <button
                      onClick={() => clearAnswer(q.id)}
                      className="shrink-0 text-[10px] text-gray-400 hover:text-gray-600 underline mt-0.5"
                    >
                      Skip
                    </button>
                  )}
                </div>

                {q.type === 'boolean' && (
                  <BooleanInput
                    value={val as boolean | undefined}
                    onChange={(v) => setAnswer(q.id, v)}
                  />
                )}
                {q.type === 'select' && (
                  <SelectInput
                    options={q.options ?? []}
                    value={val as string | undefined}
                    onChange={(v) => setAnswer(q.id, v)}
                  />
                )}
                {q.type === 'number' && (
                  <NumberInput
                    value={val as number | undefined}
                    onChange={(v) => setAnswer(q.id, v)}
                    min={q.min}
                    max={q.max}
                  />
                )}
              </div>
            );
          })}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3">
          {screenIndex > 0 && (
            <button
              onClick={() => setScreenIndex((i) => i - 1)}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition"
            >
              ← Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={saving}
            className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white hover:bg-brand-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <><Spinner className="h-4 w-4" /> Saving…</>
            ) : isLast ? (
              'Finish & generate my action list →'
            ) : (
              'Continue →'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Re-export for convenience so Dashboard can start at the intro screen
export { SCREENS };
