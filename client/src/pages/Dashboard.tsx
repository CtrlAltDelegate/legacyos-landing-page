import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getErrorMessage } from '@/api/client';
import { getAllWings, completeStep, uncompleteStep, type WingSummary } from '@/api/wings';
import { getFamilyProfile } from '@/api/profile';
import { getTodos, type TodoItem } from '@/api/todos';
import { useAuthStore } from '@/store/auth';
import Spinner from '@/components/Spinner';
import WingAssessmentFlow from '@/components/wings/WingAssessmentFlow';
import StepCelebrationModal from '@/components/wings/StepCelebrationModal';
import FamilyQuestionnaire from '@/components/profile/FamilyQuestionnaire';
import TodoList from '@/components/todos/TodoList';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NetWorthData {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  breakdown: {
    equityValue: number;
    realEstateValue: number;
    otherValue: number;
    restrictedValue: number;
  };
  driftAlerts: Array<{
    assetClass: string;
    actualPct: number;
    targetPct: number;
    direction: 'over' | 'under';
  }>;
}

// ─── Color maps ───────────────────────────────────────────────────────────────

const COLOR: Record<string, {
  bg: string; border: string; badge: string; text: string; dot: string; btn: string; ring: string;
}> = {
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', text: 'text-emerald-700', dot: 'bg-emerald-500', btn: 'bg-emerald-600 hover:bg-emerald-700', ring: 'ring-emerald-400' },
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    badge: 'bg-blue-100 text-blue-700',       text: 'text-blue-700',    dot: 'bg-blue-500',    btn: 'bg-blue-600 hover:bg-blue-700',       ring: 'ring-blue-400' },
  rose:    { bg: 'bg-rose-50',    border: 'border-rose-200',    badge: 'bg-rose-100 text-rose-700',       text: 'text-rose-700',    dot: 'bg-rose-500',    btn: 'bg-rose-600 hover:bg-rose-700',       ring: 'ring-rose-400' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   badge: 'bg-amber-100 text-amber-700',     text: 'text-amber-700',   dot: 'bg-amber-500',   btn: 'bg-amber-500 hover:bg-amber-600',     ring: 'ring-amber-400' },
  violet:  { bg: 'bg-violet-50',  border: 'border-violet-200',  badge: 'bg-violet-100 text-violet-700',   text: 'text-violet-700',  dot: 'bg-violet-500',  btn: 'bg-violet-600 hover:bg-violet-700',   ring: 'ring-violet-400' },
  slate:   { bg: 'bg-slate-50',   border: 'border-slate-200',   badge: 'bg-slate-100 text-slate-700',     text: 'text-slate-700',   dot: 'bg-slate-500',   btn: 'bg-slate-600 hover:bg-slate-700',     ring: 'ring-slate-400' },
};

const fmt = (n: number) =>
  Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// ─── Most Important Next Step logic ───────────────────────────────────────────
// Priority: lowest-level assessed wing. If none assessed, first unassessed wing.
// Among ties, step-completed wings are deprioritized.

function getMostImportantWing(wings: WingSummary[]): WingSummary | null {
  if (!wings.length) return null;
  const assessed = wings.filter((w) => w.assessed);
  const unassessed = wings.filter((w) => !w.assessed);

  // If some are assessed, pick the lowest level (uncompleted step preferred)
  if (assessed.length > 0) {
    const sorted = [...assessed].sort((a, b) => {
      // Completed steps go to the bottom
      if (a.stepCompletedAt && !b.stepCompletedAt) return 1;
      if (!a.stepCompletedAt && b.stepCompletedAt) return -1;
      return a.level - b.level;
    });
    return sorted[0];
  }

  // None assessed yet — return first unassessed
  return unassessed[0] ?? null;
}

// ─── Wing Card ────────────────────────────────────────────────────────────────

interface WingCardProps {
  wing: WingSummary;
  isPriority: boolean;
  onCompleteStep: (wing: WingSummary) => void;
  onUncompleteStep: (wing: WingSummary) => void;
}

function WingCard({ wing, isPriority, onCompleteStep, onUncompleteStep }: WingCardProps) {
  const navigate = useNavigate();
  const c = COLOR[wing.color] ?? COLOR.slate;
  const MAX_LEVEL = 3;
  const isDone = !!wing.stepCompletedAt;

  return (
    <div
      className={`rounded-xl border ${c.border} ${c.bg} p-5 flex flex-col gap-3 hover:shadow-md transition-shadow cursor-pointer relative ${
        isPriority ? `ring-2 ${c.ring} ring-offset-1` : ''
      }`}
      onClick={() => navigate(`/wings/${wing.id}`)}
    >
      {/* Priority badge */}
      {isPriority && (
        <div className="absolute -top-3 left-4">
          <span className="rounded-full bg-brand-600 px-3 py-0.5 text-[10px] font-bold text-white shadow">
            ✦ Most Important Next Step
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none">{wing.emoji}</span>
          <span className={`text-sm font-bold ${c.text}`}>{wing.name}</span>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.badge}`}>
          {wing.levelLabel}
        </span>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: MAX_LEVEL + 1 }).map((_, i) => (
          <div
            key={i}
            className={`h-2 w-2 rounded-full ${i <= wing.level ? c.dot : 'bg-gray-200'}`}
          />
        ))}
        <span className="ml-1 text-xs text-gray-400">Level {wing.level} / {MAX_LEVEL}</span>
      </div>

      {/* Next step */}
      <div className="flex-1">
        <p className={`text-[11px] font-semibold uppercase tracking-wide mb-1 ${
          isDone ? 'text-green-500' : 'text-gray-400'
        }`}>
          {isDone ? '✓ Step completed' : wing.assessed ? 'Your next step' : 'Suggested first step'}
        </p>
        <p className={`text-sm font-semibold leading-snug ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
          {wing.nextStep.title}
        </p>
      </div>

      {/* Action links */}
      <div className="flex flex-col gap-1.5 pt-1 border-t border-gray-200">
        {!isDone && (
          wing.nextStep.isInternal ? (
            <Link
              to={wing.nextStep.actionUrl}
              onClick={(e) => e.stopPropagation()}
              className={`text-xs font-semibold ${c.text} hover:underline`}
            >
              {wing.nextStep.actionLabel} →
            </Link>
          ) : (
            <a
              href={wing.nextStep.actionUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`text-xs font-semibold ${c.text} hover:underline`}
            >
              {wing.nextStep.actionLabel} ↗
            </a>
          )
        )}
        {wing.nextStep.isAffiliate && !isDone && (
          <p className="text-[10px] text-gray-400">Affiliate link · we may earn a commission</p>
        )}

        <div className="flex items-center justify-between">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/wings/${wing.id}`); }}
            className="text-xs text-gray-400 hover:text-gray-600 text-left"
          >
            {wing.assessed ? 'View details →' : 'Take assessment →'}
          </button>

          {/* Complete / Undo button */}
          {wing.assessed && (
            isDone ? (
              <button
                onClick={(e) => { e.stopPropagation(); onUncompleteStep(wing); }}
                className="text-[10px] text-gray-400 hover:text-gray-600 underline"
              >
                Undo
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onCompleteStep(wing); }}
                className="rounded-lg border border-green-300 bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700 hover:bg-green-100 transition"
              >
                Mark done ✓
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Net Worth strip ──────────────────────────────────────────────────────────

function NetWorthStrip({ data }: { data: NetWorthData | null }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold text-gray-500 uppercase tracking-wide">
        Net Worth Tracker
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Net worth',         value: data ? fmt(data.netWorth) : '—' },
          { label: 'Total assets',      value: data ? fmt(data.totalAssets) : '—' },
          { label: 'Total liabilities', value: data ? fmt(data.totalLiabilities) : '—' },
          { label: 'Equity / stocks',   value: data ? fmt(data.breakdown.equityValue) : '—' },
        ].map((s) => (
          <div key={s.label}>
            <p className="text-xs text-gray-400">{s.label}</p>
            <p className="mt-0.5 text-xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>
      {data && data.driftAlerts.length > 0 && (
        <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
          <p className="text-xs font-semibold text-amber-700">
            ⚠ Allocation drift detected —{' '}
            <Link to="/flo" className="underline">ask Flo how to rebalance</Link>
          </p>
        </div>
      )}
      <div className="mt-3 flex gap-3">
        <Link to="/assets" className="text-xs text-brand-600 font-medium hover:underline">
          Manage assets →
        </Link>
        <Link to="/documents" className="text-xs text-brand-600 font-medium hover:underline">
          Upload documents →
        </Link>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuthStore();
  const [wings, setWings] = useState<WingSummary[]>([]);
  const [netWorth, setNetWorth] = useState<NetWorthData | null>(null);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [profileCompleted, setProfileCompleted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // UI state
  const [showAssessmentFlow, setShowAssessmentFlow] = useState(false);
  const [celebrationWing, setCelebrationWing] = useState<WingSummary | null>(null);
  const [completingWingId, setCompletingWingId] = useState<string | null>(null);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);

  useEffect(() => {
    Promise.all([
      getAllWings(),
      api.get<NetWorthData>('/networth/current'),
      getFamilyProfile(),
      getTodos(),
    ])
      .then(([w, nwRes, profile, todoItems]) => {
        setWings(w);
        setNetWorth(nwRes.data);
        setProfileCompleted(!!profile.completedAt);
        setTodos(todoItems);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  async function handleCompleteStep(wing: WingSummary) {
    setCompletingWingId(wing.id);
    try {
      const res = await completeStep(wing.id);
      const updatedWing = { ...wing, stepCompletedAt: res.stepCompletedAt };
      setWings((prev) => prev.map((w) => w.id === wing.id ? updatedWing : w));
      setCelebrationWing(updatedWing);
    } catch (err) {
      console.error('Failed to complete step:', err);
    } finally {
      setCompletingWingId(null);
    }
  }

  async function handleUncompleteStep(wing: WingSummary) {
    try {
      await uncompleteStep(wing.id);
      setWings((prev) => prev.map((w) => w.id === wing.id ? { ...w, stepCompletedAt: null } : w));
    } catch (err) {
      console.error('Failed to uncomplete step:', err);
    }
  }

  function handleAssessmentFlowComplete(updatedWings: WingSummary[]) {
    setWings(updatedWings);
    setShowAssessmentFlow(false);
  }

  function handleQuestionnaireComplete() {
    setProfileCompleted(true);
    setShowQuestionnaire(false);
    // Reload todos since the questionnaire generates new ones
    getTodos().then(setTodos).catch(console.error);
  }

  function handleTodoComplete(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  function handleTodoDismiss(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error) {
    return <div className="p-8"><p className="text-sm text-red-600">{error}</p></div>;
  }

  const firstName = user?.fullName?.split(' ')[0] ?? 'there';
  const assessedCount = wings.filter((w) => w.assessed).length;
  const completedCount = wings.filter((w) => w.stepCompletedAt).length;
  const avgLevel = wings.length
    ? Math.round(wings.reduce((s, w) => s + w.level, 0) / wings.length)
    : 0;
  const levelLabels = ['Foundation', 'Building', 'Established', 'Advanced'];
  const priorityWing = getMostImportantWing(wings);

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Good {getTimeOfDay()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {assessedCount === 0
              ? 'Start by taking a quick assessment to discover your level in each wing.'
              : `${assessedCount} of 6 wings assessed · ${completedCount} steps completed · Overall level: ${levelLabels[avgLevel]}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {assessedCount < 6 && (
            <button
              onClick={() => setShowAssessmentFlow(true)}
              className="rounded-lg border border-brand-300 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100 transition"
            >
              {assessedCount === 0 ? '📋 Take full assessment' : '📋 Continue assessment'}
            </button>
          )}
          <Link
            to="/flo"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition"
          >
            <span>✦</span> Ask Flo
          </Link>
        </div>
      </div>

      {/* ── Family profile prompt ─────────────────────────────────────────── */}
      {profileCompleted === false && (
        <div className="rounded-2xl border-2 border-brand-200 bg-brand-50 p-5 flex items-center gap-4">
          <div className="text-3xl shrink-0">🏠</div>
          <div className="flex-1">
            <p className="text-sm font-bold text-brand-800">
              Set up your family profile — it takes 3 minutes
            </p>
            <p className="text-xs text-brand-600 mt-0.5">
              Tell Flo about your family, home, vehicles, insurance, and estate plan. She'll generate a personalized action list and give much better advice.
            </p>
          </div>
          <button
            onClick={() => setShowQuestionnaire(true)}
            className="shrink-0 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700 transition"
          >
            Start →
          </button>
        </div>
      )}

      {/* ── Most Important Next Step banner ───────────────────────────────── */}
      {priorityWing && !priorityWing.stepCompletedAt && (
        <MostImportantBanner
          wing={priorityWing}
          onComplete={() => handleCompleteStep(priorityWing)}
          completing={completingWingId === priorityWing.id}
        />
      )}

      {/* ── Six Wing Command Center ────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Six Wing Framework
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {assessedCount === 0
                ? 'Click any wing to take the assessment and see your personalized next step.'
                : 'Click any wing to view details or update your assessment.'}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {wings.map((wing) => (
            <WingCard
              key={wing.id}
              wing={wing}
              isPriority={priorityWing?.id === wing.id && !wing.stepCompletedAt}
              onCompleteStep={handleCompleteStep}
              onUncompleteStep={handleUncompleteStep}
            />
          ))}
        </div>
      </div>

      {/* ── Action Items (todos) ──────────────────────────────────────────── */}
      {(todos.length > 0 || profileCompleted) && (
        <div>
          <div className="flex items-center justify-between mb-3">
            {profileCompleted && todos.length === 0 && null}
          </div>
          <TodoList
            todos={todos}
            onTodoComplete={handleTodoComplete}
            onTodoDismiss={handleTodoDismiss}
          />
        </div>
      )}

      {/* ── Net Worth Tracker ─────────────────────────────────────────────── */}
      <NetWorthStrip data={netWorth} />

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {showAssessmentFlow && (
        <WingAssessmentFlow
          wings={wings}
          onComplete={handleAssessmentFlowComplete}
          onClose={() => setShowAssessmentFlow(false)}
        />
      )}

      {celebrationWing && (
        <StepCelebrationModal
          wing={celebrationWing}
          onClose={() => setCelebrationWing(null)}
        />
      )}

      {showQuestionnaire && (
        <FamilyQuestionnaire
          onComplete={handleQuestionnaireComplete}
          onClose={() => setShowQuestionnaire(false)}
        />
      )}
    </div>
  );
}

// ─── Most Important Banner ────────────────────────────────────────────────────

function MostImportantBanner({
  wing,
  onComplete,
  completing,
}: {
  wing: WingSummary;
  onComplete: () => void;
  completing: boolean;
}) {
  const navigate = useNavigate();
  const c = COLOR[wing.color] ?? COLOR.slate;

  return (
    <div className={`rounded-2xl border-2 ${c.border} ${c.bg} p-5`}>
      <div className="flex items-start gap-4">
        <div className={`rounded-xl border ${c.border} bg-white p-3 shrink-0`}>
          <span className="text-3xl leading-none">{wing.emoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
              ✦ Most Important Next Step
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.badge}`}>
              {wing.name} Wing · {wing.levelLabel}
            </span>
          </div>
          <h3 className="text-base font-bold text-gray-900 leading-snug">
            {wing.nextStep.title}
          </h3>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed line-clamp-2">
            {wing.nextStep.description}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {wing.nextStep.isInternal ? (
          <Link
            to={wing.nextStep.actionUrl}
            className={`rounded-xl px-4 py-2 text-sm font-bold text-white transition ${c.btn}`}
          >
            {wing.nextStep.actionLabel} →
          </Link>
        ) : (
          <a
            href={wing.nextStep.actionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`rounded-xl px-4 py-2 text-sm font-bold text-white transition ${c.btn}`}
          >
            {wing.nextStep.actionLabel} ↗
          </a>
        )}

        <button
          onClick={onComplete}
          disabled={completing}
          className="rounded-xl border border-green-300 bg-green-50 px-4 py-2 text-sm font-bold text-green-700 hover:bg-green-100 transition disabled:opacity-50 flex items-center gap-1.5"
        >
          {completing ? <Spinner className="h-4 w-4" /> : '✓'} Mark as complete
        </button>

        <button
          onClick={() => navigate(`/wings/${wing.id}`)}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          View wing details →
        </button>
      </div>

      {wing.nextStep.isAffiliate && (
        <p className="mt-2 text-[10px] text-gray-400">Affiliate link · LegacyOS may earn a commission at no cost to you.</p>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
