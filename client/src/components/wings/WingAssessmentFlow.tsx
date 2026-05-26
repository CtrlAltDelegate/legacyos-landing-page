import { useState } from 'react';
import { submitAssessment, type WingSummary, type WingId } from '@/api/wings';
import { getErrorMessage } from '@/api/client';
import Spinner from '@/components/Spinner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  wings: WingSummary[];
  onComplete: (updatedWings: WingSummary[]) => void;
  onClose: () => void;
}

// ─── Color map ────────────────────────────────────────────────────────────────

const COLOR: Record<string, {
  bg: string; border: string; text: string; btn: string; badge: string; dot: string; ring: string;
}> = {
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', btn: 'bg-emerald-600 hover:bg-emerald-700', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', ring: 'ring-emerald-400' },
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    btn: 'bg-blue-600 hover:bg-blue-700',    badge: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500',    ring: 'ring-blue-400' },
  rose:    { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700',    btn: 'bg-rose-600 hover:bg-rose-700',    badge: 'bg-rose-100 text-rose-700',    dot: 'bg-rose-500',    ring: 'ring-rose-400' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   btn: 'bg-amber-500 hover:bg-amber-600',   badge: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500',   ring: 'ring-amber-400' },
  violet:  { bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-700',  btn: 'bg-violet-600 hover:bg-violet-700',  badge: 'bg-violet-100 text-violet-700',  dot: 'bg-violet-500',  ring: 'ring-violet-400' },
  slate:   { bg: 'bg-slate-50',   border: 'border-slate-200',   text: 'text-slate-700',   btn: 'bg-slate-600 hover:bg-slate-700',   badge: 'bg-slate-100 text-slate-700',   dot: 'bg-slate-500',   ring: 'ring-slate-400' },
};

const LEVEL_LABELS = ['Foundation', 'Building', 'Established', 'Advanced'];

// ─── Component ────────────────────────────────────────────────────────────────

export default function WingAssessmentFlow({ wings, onComplete, onClose }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  // answers per wing: wingId → { questionId: boolean }
  const [allAnswers, setAllAnswers] = useState<Record<WingId, Record<string, boolean>>>(() => {
    const init: Partial<Record<WingId, Record<string, boolean>>> = {};
    for (const w of wings) init[w.id] = { ...w.answers };
    return init as Record<WingId, Record<string, boolean>>;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [updatedWings, setUpdatedWings] = useState<WingSummary[]>([...wings]);
  const [showSummary, setShowSummary] = useState(false);

  const wing = wings[currentIndex];
  const answers = allAnswers[wing?.id] ?? {};
  const c = COLOR[wing?.color] ?? COLOR.slate;
  const allAnswered = wing?.questions.every((q) => q.id in answers);
  const isLast = currentIndex === wings.length - 1;

  function setAnswer(qId: string, val: boolean) {
    setAllAnswers((prev) => ({
      ...prev,
      [wing.id]: { ...prev[wing.id], [qId]: val },
    }));
  }

  async function handleNext() {
    setError('');

    // If all answered for this wing, submit it
    if (allAnswered) {
      setSubmitting(true);
      try {
        const res = await submitAssessment(wing.id as WingId, answers);
        // Update the local wing data with the new level
        setUpdatedWings((prev) =>
          prev.map((w) =>
            w.id === wing.id
              ? { ...w, level: res.level, levelLabel: res.levelLabel, nextStep: res.nextStep, assessed: true }
              : w
          )
        );
      } catch (err) {
        setError(getErrorMessage(err));
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
    }

    if (isLast) {
      setShowSummary(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }

  function handleSkip() {
    if (isLast) {
      setShowSummary(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }

  function handleFinish() {
    onComplete(updatedWings);
  }

  // ── Summary screen ─────────────────────────────────────────────────────────

  if (showSummary) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="px-8 pt-8 pb-4 text-center border-b border-gray-100">
            <div className="text-4xl mb-3">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900">Assessment complete!</h2>
            <p className="text-sm text-gray-500 mt-1">
              Here's where your family office stands across all six wings.
            </p>
          </div>

          {/* Wing summary */}
          <div className="overflow-y-auto flex-1 p-6">
            <div className="space-y-3">
              {updatedWings.map((w) => {
                const wc = COLOR[w.color] ?? COLOR.slate;
                return (
                  <div key={w.id} className={`flex items-center gap-4 rounded-xl border ${wc.border} ${wc.bg} px-4 py-3`}>
                    <span className="text-2xl">{w.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-bold ${wc.text}`}>{w.name}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${wc.badge}`}>
                          {w.levelLabel} · Level {w.level}
                        </span>
                      </div>
                      {w.assessed && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          Next: {w.nextStep.title}
                        </p>
                      )}
                      {!w.assessed && (
                        <p className="text-xs text-gray-400 mt-0.5">Skipped — you can assess this wing anytime</p>
                      )}
                    </div>
                    {/* Mini progress bar */}
                    <div className="flex items-center gap-1 shrink-0">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-2 w-5 rounded-full ${i <= w.level ? wc.dot : 'bg-gray-200'}`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-5 border-t border-gray-100">
            <button
              onClick={handleFinish}
              className="w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-white hover:bg-brand-700 transition"
            >
              Go to my Command Center →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Question screen ────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">

        {/* Progress bar */}
        <div className="h-1.5 w-full bg-gray-100 rounded-t-2xl overflow-hidden">
          <div
            className="h-full bg-brand-500 transition-all duration-500"
            style={{ width: `${((currentIndex) / wings.length) * 100}%` }}
          />
        </div>

        {/* Wing header */}
        <div className={`px-6 pt-5 pb-4 border-b border-gray-100`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Wing {currentIndex + 1} of {wings.length}
            </span>
            <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-lg leading-none">✕</button>
          </div>
          <div className="flex items-center gap-3">
            <div className={`rounded-xl ${c.bg} border ${c.border} p-2.5`}>
              <span className="text-2xl leading-none">{wing.emoji}</span>
            </div>
            <div>
              <h2 className={`text-lg font-bold ${c.text}`}>{wing.name} Wing</h2>
              <p className="text-xs text-gray-400">{wing.tagline}</p>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          <p className="text-xs text-gray-500 italic">
            Answer honestly — your level and next step are calculated from these answers.
          </p>

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
                      onClick={() => setAnswer(q.id, val)}
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

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3">
          <button
            onClick={handleSkip}
            className="text-sm text-gray-400 hover:text-gray-600 transition px-2"
          >
            Skip this wing
          </button>
          <button
            onClick={handleNext}
            disabled={!allAnswered || submitting}
            className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition disabled:opacity-40 flex items-center justify-center gap-2 ${c.btn}`}
          >
            {submitting ? (
              <><Spinner className="h-4 w-4" /> Saving…</>
            ) : isLast ? (
              'Finish assessment →'
            ) : (
              'Next wing →'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
