import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getWing, submitAssessment, type WingDetail, type WingId } from '@/api/wings';
import { getErrorMessage } from '@/api/client';
import Spinner from '@/components/Spinner';

// ─── Color map (mirrors Dashboard) ───────────────────────────────────────────

const COLOR: Record<string, { bg: string; border: string; badge: string; text: string; btn: string; dot: string; ring: string }> = {
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-800', text: 'text-emerald-700', btn: 'bg-emerald-600 hover:bg-emerald-700', dot: 'bg-emerald-500', ring: 'ring-emerald-500' },
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    badge: 'bg-blue-100 text-blue-800',    text: 'text-blue-700',    btn: 'bg-blue-600 hover:bg-blue-700',    dot: 'bg-blue-500',    ring: 'ring-blue-500' },
  rose:    { bg: 'bg-rose-50',    border: 'border-rose-200',    badge: 'bg-rose-100 text-rose-800',    text: 'text-rose-700',    btn: 'bg-rose-600 hover:bg-rose-700',    dot: 'bg-rose-500',    ring: 'ring-rose-500' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   badge: 'bg-amber-100 text-amber-800',   text: 'text-amber-700',   btn: 'bg-amber-500 hover:bg-amber-600',   dot: 'bg-amber-500',   ring: 'ring-amber-500' },
  violet:  { bg: 'bg-violet-50',  border: 'border-violet-200',  badge: 'bg-violet-100 text-violet-800',  text: 'text-violet-700',  btn: 'bg-violet-600 hover:bg-violet-700',  dot: 'bg-violet-500',  ring: 'ring-violet-500' },
  slate:   { bg: 'bg-slate-50',   border: 'border-slate-200',   badge: 'bg-slate-100 text-slate-800',   text: 'text-slate-700',   btn: 'bg-slate-600 hover:bg-slate-700',   dot: 'bg-slate-500',   ring: 'ring-slate-500' },
};

const MAX_LEVEL = 3;

export default function WingDetail() {
  const { wing: wingParam } = useParams<{ wing: string }>();
  const navigate = useNavigate();

  const [wing, setWing] = useState<WingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Assessment state
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ level: number; levelLabel: string } | null>(null);

  useEffect(() => {
    if (!wingParam) return;
    getWing(wingParam as WingId)
      .then((data) => {
        setWing(data);
        // Pre-populate answers if assessment already exists
        if (data.assessed && Object.keys(data.answers).length > 0) {
          setAnswers(data.answers);
          setSubmitted(true);
          setResult({ level: data.level, levelLabel: data.levelLabel });
        }
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
      // Update local wing state with new level
      setWing((prev) => prev ? { ...prev, level: res.level, levelLabel: res.levelLabel, nextStep: res.nextStep, assessed: true } : prev);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error || !wing) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-600">{error || 'Wing not found.'}</p>
        <button onClick={() => navigate('/dashboard')} className="mt-3 text-sm text-brand-600 hover:underline">
          ← Back to dashboard
        </button>
      </div>
    );
  }

  const c = COLOR[wing.color] ?? COLOR.slate;
  const allAnswered = wing.questions.every((q) => q.id in answers);
  const currentStep = wing.steps[wing.level] ?? wing.steps[wing.steps.length - 1];

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-8">

      {/* ── Back ──────────────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate('/dashboard')}
        className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1"
      >
        ← Back to Command Center
      </button>

      {/* ── Wing header ───────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border ${c.border} ${c.bg} p-6`}>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{wing.emoji}</span>
          <div>
            <h1 className={`text-xl font-bold ${c.text}`}>{wing.name} Wing</h1>
            <p className="text-sm text-gray-500">{wing.tagline}</p>
          </div>
        </div>

        {/* Level bar */}
        <div className="flex items-center gap-2 mb-2">
          {Array.from({ length: MAX_LEVEL + 1 }).map((_, i) => (
            <div
              key={i}
              className={`h-2.5 flex-1 rounded-full ${i <= wing.level ? c.dot : 'bg-gray-200'}`}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-400 mb-4">
          <span>Foundation</span>
          <span className={`font-semibold ${c.text}`}>{wing.levelLabel} — Level {wing.level}</span>
          <span>Advanced</span>
        </div>

        <blockquote className={`border-l-4 ${c.border} pl-3 italic text-sm text-gray-600`}>
          "{wing.philosophy}"
        </blockquote>
      </div>

      {/* ── Current next step ─────────────────────────────────────────────── */}
      {submitted && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Your next step
          </p>
          <h2 className="text-lg font-bold text-gray-900">{currentStep.title}</h2>
          <p className="text-sm text-gray-600 leading-relaxed">{currentStep.description}</p>

          {wing.level >= MAX_LEVEL ? (
            <div className={`rounded-lg ${c.bg} ${c.border} border p-3 text-sm font-semibold ${c.text}`}>
              🎉 You've reached Advanced level in this wing. Mastery unlocks.
            </div>
          ) : currentStep.isInternal ? (
            <Link
              to={currentStep.actionUrl}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white ${c.btn} transition`}
            >
              {currentStep.actionLabel} →
            </Link>
          ) : (
            <div className="space-y-1">
              <a
                href={currentStep.actionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white ${c.btn} transition`}
              >
                {currentStep.actionLabel} ↗
              </a>
              {currentStep.isAffiliate && (
                <p className="text-[11px] text-gray-400 pl-1">
                  Affiliate link · LegacyOS may earn a commission at no cost to you.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Roadmap ───────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Your {wing.name} Wing roadmap</h2>
        <div className="space-y-4">
          {wing.steps.map((step, i) => {
            const isDone = i < wing.level;
            const isCurrent = i === wing.level;
            return (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    isDone ? `${c.dot} text-white` : isCurrent ? `ring-2 ${c.ring} ${c.bg} ${c.text}` : 'bg-gray-100 text-gray-400'
                  }`}>
                    {isDone ? '✓' : i + 1}
                  </div>
                  {i < wing.steps.length - 1 && (
                    <div className={`w-px flex-1 mt-1 ${isDone ? c.dot : 'bg-gray-200'}`} style={{ minHeight: 16 }} />
                  )}
                </div>
                <div className="pb-4">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className={`text-sm font-semibold ${isDone ? 'text-gray-400 line-through' : isCurrent ? 'text-gray-900' : 'text-gray-500'}`}>
                      {step.title}
                    </p>
                    {isCurrent && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.badge}`}>
                        Current
                      </span>
                    )}
                    {isDone && (
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-400">
                        Complete
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Assessment ────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">
          {submitted ? 'Update your assessment' : 'Where are you today?'}
        </h2>
        <p className="mb-5 text-xs text-gray-500">
          Answer honestly — your level and next step update automatically based on your answers.
        </p>

        <div className="space-y-4">
          {wing.questions.map((q) => (
            <div key={q.id} className="flex flex-col gap-2">
              <p className="text-sm text-gray-700">{q.text}</p>
              <div className="flex gap-3">
                {[true, false].map((val) => (
                  <button
                    key={String(val)}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: val }))}
                    className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition ${
                      answers[q.id] === val
                        ? `${c.btn} border-transparent text-white`
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {val ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className={`rounded-lg px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${c.btn}`}
          >
            {submitting ? <Spinner className="h-4 w-4" /> : submitted ? 'Update my level' : 'Calculate my level'}
          </button>
          {result && (
            <p className={`text-sm font-medium ${c.text}`}>
              Level updated: {result.levelLabel}
            </p>
          )}
        </div>
      </div>

      {/* ── Flo CTA ───────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-brand-100 bg-brand-50 p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand-800">
            Want personalized guidance on your {wing.name} Wing?
          </p>
          <p className="text-xs text-brand-600 mt-0.5">
            Flo can help you plan your next move, think through trade-offs, and keep you on track.
          </p>
        </div>
        <Link
          to="/flo"
          className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition"
        >
          Ask Flo →
        </Link>
      </div>

    </div>
  );
}
