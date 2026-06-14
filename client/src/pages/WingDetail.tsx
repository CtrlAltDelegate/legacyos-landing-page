import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, CheckCircle2, ChevronDown, BookOpen, ClipboardList, ExternalLink } from 'lucide-react';
import { getWing, submitAssessment, completeStep, uncompleteStep, type WingDetail, type WingId } from '@/api/wings';
import { getErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/auth';
import Spinner from '@/components/Spinner';
import StepCelebrationModal from '@/components/wings/StepCelebrationModal';
import { WING_ARTICLES, type WingArticle, type WingId as ContentWingId } from '@/data/wingContent';

// ─── Color map ────────────────────────────────────────────────────────────────

const COLOR: Record<string, {
  bg: string; border: string; accentBorder: string; badge: string;
  text: string; btn: string; dot: string; ring: string;
}> = {
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', accentBorder: 'border-l-emerald-600', badge: 'bg-emerald-100 text-emerald-800', text: 'text-emerald-700', btn: 'bg-emerald-600 hover:bg-emerald-700', dot: 'bg-emerald-500', ring: 'ring-emerald-400' },
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    accentBorder: 'border-l-blue-600',    badge: 'bg-blue-100 text-blue-800',    text: 'text-blue-700',    btn: 'bg-blue-600 hover:bg-blue-700',    dot: 'bg-blue-500',    ring: 'ring-blue-400' },
  rose:    { bg: 'bg-rose-50',    border: 'border-rose-200',    accentBorder: 'border-l-rose-600',    badge: 'bg-rose-100 text-rose-800',    text: 'text-rose-700',    btn: 'bg-rose-600 hover:bg-rose-700',    dot: 'bg-rose-500',    ring: 'ring-rose-400' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   accentBorder: 'border-l-amber-600',   badge: 'bg-amber-100 text-amber-800',  text: 'text-amber-700',   btn: 'bg-amber-500 hover:bg-amber-600',  dot: 'bg-amber-500',   ring: 'ring-amber-400' },
  violet:  { bg: 'bg-violet-50',  border: 'border-violet-200',  accentBorder: 'border-l-violet-600',  badge: 'bg-violet-100 text-violet-800', text: 'text-violet-700', btn: 'bg-violet-600 hover:bg-violet-700', dot: 'bg-violet-500',  ring: 'ring-violet-400' },
  slate:   { bg: 'bg-teal-50',    border: 'border-teal-200',    accentBorder: 'border-l-teal-600',    badge: 'bg-teal-100 text-teal-800',    text: 'text-teal-700',    btn: 'bg-teal-600 hover:bg-teal-700',    dot: 'bg-teal-500',    ring: 'ring-teal-400' },
};

const MAX_LEVEL = 5;

// ─── Wing article card ────────────────────────────────────────────────────────

function WingArticleCard({
  article,
  accentColor,
  borderColor,
  bgColor,
}: {
  article: WingArticle;
  accentColor: string;
  borderColor: string;
  bgColor: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-xl border ${borderColor} overflow-hidden`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="min-w-0">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${accentColor}`}>{article.tagline}</span>
          <p className="text-sm font-semibold text-gray-900 leading-snug mt-0.5">{article.title}</p>
        </div>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-gray-50 space-y-4">
          <div className="pt-4 space-y-3">
            {article.body.map((para, i) => (
              <p key={i} className="text-sm text-gray-700 leading-relaxed">{para}</p>
            ))}
          </div>
          <div className={`rounded-lg ${bgColor} px-4 py-3`}>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Key Takeaways</p>
            <ul className="space-y-1.5">
              {article.keyTakeaways.map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${accentColor.replace('text-', 'bg-')}`} />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Estate planning checklist ───────────────────────────────────────────────

const ESTATE_ITEMS: { id: string; label: string; detail: string }[] = [
  { id: 'will',           label: 'Will / Last Testament',           detail: 'Names executor, distributes assets, designates guardian for minor children' },
  { id: 'poa',            label: 'Durable Power of Attorney',       detail: 'Authorizes someone to manage your finances if you\'re incapacitated' },
  { id: 'healthcare',     label: 'Healthcare Proxy / Medical POA',  detail: 'Designates who makes medical decisions on your behalf' },
  { id: 'advance',        label: 'Advance Directive / Living Will', detail: 'Specifies your wishes for end-of-life care and life support' },
  { id: 'beneficiaries',  label: 'Beneficiary Designations Updated', detail: 'Retirement accounts and life insurance — these override your will' },
  { id: 'trust',          label: 'Trust (if applicable)',           detail: 'Avoids probate for assets ≥$1M, blended families, or multi-state real estate' },
  { id: 'life-insurance', label: 'Life Insurance Policy',           detail: 'Term life to cover income replacement for dependents' },
  { id: 'digital',        label: 'Digital Asset Instructions',      detail: 'Passwords, crypto keys, account access for executor' },
  { id: 'letter',         label: 'Letter of Instruction',           detail: 'Funeral wishes, personal notes, location of key documents' },
];

function EstateChecklist({ accentColor, bgColor, userId }: {
  accentColor: string; bgColor: string; userId: string;
}) {
  const storageKey = `estate_checklist_${userId}`;
  const [checked, setChecked] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
    } catch { return new Set(); }
  });

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(storageKey, JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  const completedCount = checked.size;
  const pct = Math.round(completedCount / ESTATE_ITEMS.length * 100);

  return (
    <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className={`h-4 w-4 ${accentColor}`} />
          <h2 className="section-label">Estate planning checklist</h2>
        </div>
        <span className="text-xs font-bold text-gray-500">{completedCount}/{ESTATE_ITEMS.length} done</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${accentColor.replace('text-', 'bg-')}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="space-y-1">
        {ESTATE_ITEMS.map((item) => {
          const done = checked.has(item.id);
          return (
            <label
              key={item.id}
              className={`flex items-start gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-colors hover:bg-gray-50 ${done ? bgColor : ''}`}
            >
              <div className={`mt-0.5 h-4 w-4 flex-shrink-0 rounded border-2 transition-colors flex items-center justify-center ${
                done ? `${accentColor.replace('text-', 'bg-')} border-transparent` : `border-gray-300`
              }`}>
                {done && <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 text-white fill-white"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
              </div>
              <input type="checkbox" checked={done} onChange={() => toggle(item.id)} className="sr-only" />
              <div className="min-w-0">
                <p className={`text-sm font-medium leading-snug ${done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                  {item.label}
                </p>
                <p className="text-[11px] text-gray-400 leading-snug mt-0.5">{item.detail}</p>
              </div>
            </label>
          );
        })}
      </div>

      {pct === 100 && (
        <div className={`rounded-lg ${bgColor} px-4 py-3 flex items-start gap-2`}>
          <CheckCircle2 className={`h-4 w-4 flex-shrink-0 mt-0.5 ${accentColor}`} />
          <p className="text-sm font-semibold text-gray-800">
            Your estate plan is complete. Review it every 3–5 years or after any major life event.
          </p>
        </div>
      )}

      <a
        href="https://nolo.com/legal-encyclopedia/estate-planning"
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1 text-xs font-medium ${accentColor} hover:underline`}
      >
        Learn more at Nolo.com <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

export default function WingDetail() {
  const { wing: wingParam } = useParams<{ wing: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [wing, setWing] = useState<WingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ level: number; levelLabel: string } | null>(null);

  const [completingStep, setCompletingStep] = useState(false);
  const [stepCompletedAt, setStepCompletedAt] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (!wingParam) return;
    getWing(wingParam as WingId)
      .then((data) => {
        setWing(data);
        if (data.assessed && Object.keys(data.answers).length > 0) {
          setAnswers(data.answers);
          setSubmitted(true);
          setResult({ level: data.level, levelLabel: data.levelLabel });
        }
        if (data.stepCompletedAt) setStepCompletedAt(data.stepCompletedAt);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [wingParam]);

  async function handleSubmit() {
    if (!wing) return;
    setSubmitting(true);
    try {
      const res = await submitAssessment(wing.id, answers);
      setResult({ level: res.level, levelLabel: res.levelLabel });
      setSubmitted(true);
      setWing((prev) => prev
        ? { ...prev, level: res.level, levelLabel: res.levelLabel, nextStep: res.nextStep, assessed: true }
        : prev);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCompleteStep() {
    if (!wing) return;
    setCompletingStep(true);
    try {
      const res = await completeStep(wing.id as WingId);
      setStepCompletedAt(res.stepCompletedAt);
      setShowCelebration(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCompletingStep(false);
    }
  }

  async function handleUncompleteStep() {
    if (!wing) return;
    try {
      await uncompleteStep(wing.id as WingId);
      setStepCompletedAt(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Spinner className="h-8 w-8 text-brand-600" /></div>;
  }

  if (error || !wing) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-600">{error || 'Wing not found.'}</p>
        <button onClick={() => navigate('/dashboard')} className="mt-3 btn-ghost">
          ← Back to dashboard
        </button>
      </div>
    );
  }

  const c = COLOR[wing.color] ?? COLOR.slate;
  const allAnswered = wing.questions.every((q) => q.id in answers);
  const currentStep = wing.steps[wing.level] ?? wing.steps[wing.steps.length - 1];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">

      {/* ── Back ──────────────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Command Center
      </button>

      {/* ── Wing header card ──────────────────────────────────────────────── */}
      <div className={`rounded-xl ${c.bg} border-l-4 ${c.accentBorder} border ${c.border} shadow-sm p-6`}>
        <div className="flex items-start gap-4 mb-4">
          <span className="text-4xl leading-none">{wing.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className={`text-xl font-bold ${c.text}`}>{wing.name} Wing</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.badge}`}>
                {wing.levelLabel} · Level {wing.level}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{wing.tagline}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-1.5 mb-1.5">
          {Array.from({ length: MAX_LEVEL + 1 }).map((_, i) => (
            <div key={i} className={`h-2 flex-1 rounded-full transition-all ${i <= wing.level ? c.dot : 'bg-gray-200'}`} />
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-400 mb-4">
          <span>Foundation</span>
          <span>Advanced</span>
        </div>

        <blockquote className={`border-l-2 ${c.accentBorder} pl-3 text-sm text-gray-600 italic`}>
          "{wing.philosophy}"
        </blockquote>
      </div>

      {/* ── Current next step ─────────────────────────────────────────────── */}
      {submitted && (
        <div className={`rounded-xl bg-white border-l-4 ${c.accentBorder} border ${c.border} shadow-sm p-6 space-y-3`}>
          <div className="flex items-center justify-between gap-3">
            <p className={`section-label ${stepCompletedAt ? 'text-green-600' : ''}`}>
              {stepCompletedAt ? '✓ Step completed' : 'Your next step'}
            </p>
            {stepCompletedAt && (
              <button onClick={handleUncompleteStep} className="text-xs text-gray-400 hover:text-gray-600 underline transition-colors">
                Undo
              </button>
            )}
          </div>

          <h2 className={`text-lg font-bold leading-snug ${stepCompletedAt ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
            {currentStep.title}
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">{currentStep.description}</p>

          {wing.level >= MAX_LEVEL ? (
            <div className="space-y-3">
              <div className={`rounded-lg ${c.bg} ${c.border} border px-4 py-3 flex items-center gap-2`}>
                <CheckCircle2 className={`h-4 w-4 ${c.text} flex-shrink-0`} />
                <p className={`text-sm font-semibold ${c.text}`}>Expert level reached. Revisit this step annually — life changes, and so should your strategy.</p>
              </div>
              <button
                onClick={handleCompleteStep}
                disabled={completingStep}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition"
              >
                <CheckCircle2 className="h-4 w-4" /> Mark annual review done
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {!stepCompletedAt && (
                currentStep.isInternal ? (
                  <Link to={currentStep.actionUrl} className={`btn-primary text-sm px-4 py-2 ${c.btn} bg-none`}
                    style={{ background: undefined }}>
                    {currentStep.actionLabel} →
                  </Link>
                ) : (
                  <a href={currentStep.actionUrl} target="_blank" rel="noopener noreferrer"
                    className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${c.btn}`}>
                    {currentStep.actionLabel} ↗
                  </a>
                )
              )}

              {!stepCompletedAt ? (
                <button
                  onClick={handleCompleteStep}
                  disabled={completingStep}
                  className="inline-flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100 transition disabled:opacity-50"
                >
                  {completingStep ? <Spinner className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  Mark as complete
                </button>
              ) : (
                <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2.5">
                  <p className="text-sm font-semibold text-green-700">
                    ✓ Completed {new Date(stepCompletedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-green-600 mt-0.5">Re-assess this wing to unlock your next step.</p>
                </div>
              )}
            </div>
          )}

          {currentStep.isAffiliate && !stepCompletedAt && (
            <p className="text-[11px] text-gray-400">Affiliate link · LegacyOS may earn a commission at no cost to you.</p>
          )}
        </div>
      )}

      {/* ── Celebration modal ─────────────────────────────────────────────── */}
      {showCelebration && wing && (
        <StepCelebrationModal
          wing={{ ...wing, stepCompletedAt, nextStep: currentStep }}
          onClose={() => setShowCelebration(false)}
        />
      )}

      {/* ── Roadmap ───────────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6">
        <h2 className="section-label mb-5">Your {wing.name} Wing roadmap</h2>
        <div className="space-y-0">
          {wing.steps.map((step, i) => {
            const isDone = i < wing.level;
            const isCurrent = i === wing.level;
            return (
              <div key={i} className="flex gap-4">
                {/* Timeline column */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    isDone
                      ? `${c.dot} border-transparent text-white`
                      : isCurrent
                      ? `bg-white border-current ${c.text}`
                      : 'bg-gray-100 border-gray-200 text-gray-400'
                  }`}>
                    {isDone ? '✓' : i + 1}
                  </div>
                  {i < wing.steps.length - 1 && (
                    <div className={`w-0.5 flex-1 my-1 ${isDone ? c.dot : 'bg-gray-200'}`} style={{ minHeight: 20 }} />
                  )}
                </div>

                {/* Content */}
                <div className="pb-6 flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={`text-sm font-semibold ${
                      isDone ? 'text-gray-400 line-through' : isCurrent ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                    {isCurrent && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${c.badge}`}>Current</span>
                    )}
                    {isDone && (
                      <span className="rounded-full bg-gray-100 text-gray-400 px-2 py-0.5 text-[10px] font-semibold">Done</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Key concepts ──────────────────────────────────────────────────── */}
      {(() => {
        const articles = WING_ARTICLES[wing.id as ContentWingId];
        if (!articles?.length) return null;
        return (
          <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className={`h-4 w-4 ${c.text}`} />
              <h2 className="section-label">Key concepts for this wing</h2>
            </div>
            <div className="space-y-2">
              {articles.map((article) => (
                <WingArticleCard key={article.id} article={article} accentColor={c.text} borderColor={c.border} bgColor={c.bg} />
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Beyond Expert panel (level 5 only) ───────────────────────────── */}
      {wing.level >= MAX_LEVEL && wing.beyondExpert && (
        <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white shadow-sm p-6 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏦</span>
            <h2 className="text-sm font-bold text-gray-800">What a Family Office Adds at $25M+</h2>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{wing.beyondExpert}</p>
          <div className="rounded-lg bg-gray-100 px-4 py-3">
            <p className="text-xs font-semibold text-gray-600">
              Not there yet? Keep building. Most fractional family offices have $10M–$25M minimums.
              LegacyOS exists to get you there with the same systems the ultra-wealthy use — without the overhead.
            </p>
          </div>
        </div>
      )}

      {/* ── Estate checklist (Legacy wing only) ───────────────────────────── */}
      {wing.id === 'legacy' && user?.id && (
        <EstateChecklist
          accentColor={c.text}
          bgColor={c.bg}
          userId={user.id}
        />
      )}

      {/* ── Assessment ────────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6">
        <h2 className="section-label mb-1">{submitted ? 'Update your assessment' : 'Where are you today?'}</h2>
        <p className="text-xs text-gray-500 mb-5">
          Answer honestly — your level and next step update automatically.
        </p>

        <div className="space-y-5">
          {wing.questions.map((q) => (
            <div key={q.id}>
              <p className="text-sm font-medium text-gray-800 mb-2.5 leading-snug">{q.text}</p>
              <div className="flex gap-3">
                {([true, false] as const).map((val) => {
                  const selected = answers[q.id] === val;
                  return (
                    <button
                      key={String(val)}
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: val }))}
                      className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition ${
                        selected
                          ? `${c.btn} border-transparent text-white shadow-sm`
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {val ? '✓  Yes' : '✗  No'}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="mt-6 flex items-center gap-3 flex-wrap">
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white transition disabled:opacity-40 flex items-center gap-2 ${c.btn}`}
          >
            {submitting ? <Spinner className="h-4 w-4" /> : null}
            {submitting ? 'Saving…' : submitted ? 'Update my level' : 'Calculate my level'}
          </button>
          {result && (
            <p className={`text-sm font-semibold ${c.text}`}>
              ✓ {result.levelLabel}
            </p>
          )}
        </div>
      </div>

      {/* ── Flo CTA ───────────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-white shadow-sm border border-brand-100 border-l-4 border-l-brand-500 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">
              Want personalized guidance on your {wing.name} Wing?
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Flo can help you plan your next move, think through trade-offs, and keep you on track.
            </p>
          </div>
        </div>
        <Link to="/flo" className="btn-primary shrink-0 text-sm px-4 py-2">
          Ask Flo →
        </Link>
      </div>

    </div>
  );
}
