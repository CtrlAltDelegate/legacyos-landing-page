import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Sparkles, ClipboardList } from 'lucide-react';
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

// ─── Wing color config ────────────────────────────────────────────────────────
// Centralised so all wing UI stays in sync.

export const WING_COLOR: Record<string, {
  bg: string; border: string; accentBorder: string;
  badge: string; text: string; dot: string; btn: string; ring: string;
}> = {
  emerald: {
    bg: 'bg-green-50',    border: 'border-green-200',  accentBorder: 'border-l-green-600',
    badge: 'bg-green-100 text-green-700',  text: 'text-green-700',
    dot: 'bg-green-600',  btn: 'bg-green-600 hover:bg-green-700',  ring: 'ring-green-400',
  },
  blue: {
    bg: 'bg-blue-50',     border: 'border-blue-200',   accentBorder: 'border-l-blue-600',
    badge: 'bg-blue-100 text-blue-700',    text: 'text-blue-700',
    dot: 'bg-blue-600',   btn: 'bg-blue-600 hover:bg-blue-700',    ring: 'ring-blue-400',
  },
  rose: {
    bg: 'bg-red-50',      border: 'border-red-200',    accentBorder: 'border-l-red-600',
    badge: 'bg-red-100 text-red-700',      text: 'text-red-700',
    dot: 'bg-red-600',    btn: 'bg-red-600 hover:bg-red-700',      ring: 'ring-red-400',
  },
  amber: {
    bg: 'bg-amber-50',    border: 'border-amber-200',  accentBorder: 'border-l-amber-600',
    badge: 'bg-amber-100 text-amber-700',  text: 'text-amber-700',
    dot: 'bg-amber-500',  btn: 'bg-amber-600 hover:bg-amber-700',  ring: 'ring-amber-400',
  },
  violet: {
    bg: 'bg-violet-50',   border: 'border-violet-200', accentBorder: 'border-l-violet-600',
    badge: 'bg-violet-100 text-violet-700', text: 'text-violet-700',
    dot: 'bg-violet-600', btn: 'bg-violet-600 hover:bg-violet-700', ring: 'ring-violet-400',
  },
  slate: {
    bg: 'bg-gray-50',     border: 'border-gray-200',   accentBorder: 'border-l-gray-700',
    badge: 'bg-gray-100 text-gray-700',    text: 'text-gray-700',
    dot: 'bg-gray-700',   btn: 'bg-gray-700 hover:bg-gray-800',    ring: 'ring-gray-400',
  },
};

const fmt = (n: number) =>
  Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// ─── Most Important Next Step logic ───────────────────────────────────────────

function getMostImportantWing(wings: WingSummary[]): WingSummary | null {
  if (!wings.length) return null;
  const assessed = wings.filter((w) => w.assessed);
  const unassessed = wings.filter((w) => !w.assessed);
  if (assessed.length > 0) {
    return [...assessed].sort((a, b) => {
      if (a.stepCompletedAt && !b.stepCompletedAt) return 1;
      if (!a.stepCompletedAt && b.stepCompletedAt) return -1;
      return a.level - b.level;
    })[0];
  }
  return unassessed[0] ?? null;
}

// ─── Net Worth Hero Bar ───────────────────────────────────────────────────────

function NetWorthBar({ data }: { data: NetWorthData | null }) {
  const isPositive = data ? data.netWorth >= 0 : true;

  return (
    <div className="rounded-xl bg-white shadow-md border border-gray-100 overflow-hidden">
      <div className="grid grid-cols-2 divide-x divide-gray-100 sm:grid-cols-4">
        {/* Net worth — hero metric */}
        <div className="col-span-2 sm:col-span-1 px-6 py-5 bg-white">
          <p className="section-label mb-2">Net worth</p>
          <p className={`text-3xl font-bold tabular font-mono tracking-tight ${
            isPositive ? 'text-gray-900' : 'text-red-600'
          }`}>
            {data ? fmt(data.netWorth) : '—'}
          </p>
          {data && data.netWorth > 0 && (
            <p className="mt-1 text-xs font-medium text-green-600">↑ positive net worth</p>
          )}
        </div>

        {/* Total assets */}
        <div className="px-6 py-5">
          <p className="section-label mb-2">Total assets</p>
          <p className="text-xl font-semibold tabular font-mono text-gray-700">
            {data ? fmt(data.totalAssets) : '—'}
          </p>
        </div>

        {/* Total liabilities */}
        <div className="px-6 py-5">
          <p className="section-label mb-2">Total liabilities</p>
          <p className="text-xl font-semibold tabular font-mono text-gray-700">
            {data ? fmt(data.totalLiabilities) : '—'}
          </p>
        </div>

        {/* Equity */}
        <div className="px-6 py-5">
          <p className="section-label mb-2">Equity &amp; stocks</p>
          <p className="text-xl font-semibold tabular font-mono text-gray-700">
            {data ? fmt(data.breakdown.equityValue) : '—'}
          </p>
        </div>
      </div>

      {/* Alerts + links row */}
      {data && (data.driftAlerts.length > 0 || true) && (
        <div className="border-t border-gray-100 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          {data.driftAlerts.length > 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
              <p className="text-xs font-semibold text-amber-700">
                Allocation drift detected —{' '}
                <Link to="/flo" className="text-brand-600 font-medium underline-offset-2 hover:underline">
                  ask Flo how to rebalance
                </Link>
              </p>
            </div>
          ) : (
            <div />
          )}
          <div className="flex gap-4">
            <Link to="/assets" className="text-sm font-medium text-brand-600 hover:text-brand-800 transition-colors">
              Manage assets →
            </Link>
            <Link to="/documents" className="text-sm font-medium text-brand-600 hover:text-brand-800 transition-colors">
              Upload documents →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
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
  const c = WING_COLOR[wing.color] ?? WING_COLOR.slate;
  const MAX_LEVEL = 3;
  const isDone = !!wing.stepCompletedAt;

  return (
    <div
      className={`relative rounded-xl ${c.bg} border-l-4 ${c.accentBorder} border border-r border-t border-b ${c.border} shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer flex flex-col gap-0 overflow-hidden ${
        isPriority ? `ring-2 ${c.ring} ring-offset-1` : ''
      }`}
      onClick={() => navigate(`/wings/${wing.id}`)}
    >
      {/* Priority badge */}
      {isPriority && (
        <div className="absolute -top-px left-4">
          <span className="rounded-b-full bg-brand-600 px-3 py-0.5 text-[10px] font-bold text-white shadow-sm">
            ✦ Priority
          </span>
        </div>
      )}

      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mt-1">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl leading-none">{wing.emoji}</span>
            <span className={`text-base font-bold ${c.text}`}>{wing.name}</span>
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
              className={`h-2.5 w-2.5 rounded-full ${i <= wing.level ? c.dot : 'bg-gray-200'}`}
            />
          ))}
          <span className="ml-1 text-xs text-gray-400">Level {wing.level} / {MAX_LEVEL}</span>
        </div>

        {/* Next step */}
        <div className="flex-1">
          <p className={`section-label mb-1 ${isDone ? 'text-green-500' : ''}`}>
            {isDone ? '✓ Step completed' : wing.assessed ? 'Your next step' : 'Suggested first step'}
          </p>
          <p className={`text-base font-semibold leading-snug ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
            {wing.nextStep.title}
          </p>
        </div>
      </div>

      {/* Action footer */}
      <div className="px-5 pb-4 border-t border-black/5 pt-3 flex items-center justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          {!isDone && (
            wing.nextStep.isInternal ? (
              <Link
                to={wing.nextStep.actionUrl}
                onClick={(e) => e.stopPropagation()}
                className={`text-xs font-semibold ${c.text} hover:underline truncate`}
              >
                {wing.nextStep.actionLabel} →
              </Link>
            ) : (
              <a
                href={wing.nextStep.actionUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`text-xs font-semibold ${c.text} hover:underline truncate`}
              >
                {wing.nextStep.actionLabel} ↗
              </a>
            )
          )}
          {wing.nextStep.isAffiliate && !isDone && (
            <p className="text-[10px] text-gray-400">Affiliate · we may earn a commission</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
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
                className="rounded-lg border border-green-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-green-700 hover:bg-green-50 transition-colors"
              >
                Done ✓
              </button>
            )
          )}
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/wings/${wing.id}`); }}
            className={`rounded-lg border ${c.border} bg-white px-2.5 py-1 text-[11px] font-medium ${c.text} hover:${c.bg} transition-colors`}
          >
            {wing.assessed ? 'Details →' : 'Assess →'}
          </button>
        </div>
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
        <Spinner className="h-8 w-8 text-brand-600" />
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

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Good {getTimeOfDay()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {assessedCount === 0
              ? 'Start by taking a quick assessment to discover your level in each wing.'
              : `${assessedCount} of 6 wings assessed · ${completedCount} steps completed · Overall: ${levelLabels[avgLevel]}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {assessedCount < 6 && (
            <button
              onClick={() => setShowAssessmentFlow(true)}
              className="btn-secondary gap-2"
            >
              <ClipboardList className="h-4 w-4" />
              {assessedCount === 0 ? 'Take assessment' : 'Continue assessment'}
            </button>
          )}
          <Link to="/flo" className="btn-primary gap-2">
            <Sparkles className="h-4 w-4" />
            Ask Flo
          </Link>
        </div>
      </div>

      {/* ── Net Worth Hero (moved above wings per design doc) ───────────── */}
      <NetWorthBar data={netWorth} />

      {/* ── Family profile prompt ────────────────────────────────────────── */}
      {profileCompleted === false && (
        <div className="rounded-xl bg-white shadow-sm border border-brand-100 p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
            <span className="text-2xl">🏠</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-900">
              Complete your family profile — takes 3 minutes
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Tell Flo about your family, vehicles, insurance, and estate plan. She'll build a personalized action list and give much better advice.
            </p>
          </div>
          <button
            onClick={() => setShowQuestionnaire(true)}
            className="btn-primary shrink-0"
          >
            Start →
          </button>
        </div>
      )}

      {/* ── Most Important Next Step banner ─────────────────────────────── */}
      {priorityWing && !priorityWing.stepCompletedAt && (
        <MostImportantBanner
          wing={priorityWing}
          onComplete={() => handleCompleteStep(priorityWing)}
          completing={completingWingId === priorityWing.id}
        />
      )}

      {/* ── Six Wing Framework ───────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="section-label">Six Wing Framework</h2>
            <p className="text-sm text-gray-500 mt-1">
              {assessedCount === 0
                ? 'Click any wing to take your assessment.'
                : 'Click any wing to view details or update your level.'}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* ── Action Items ─────────────────────────────────────────────────── */}
      {(todos.length > 0 || profileCompleted) && (
        <TodoList
          todos={todos}
          onTodoComplete={handleTodoComplete}
          onTodoDismiss={handleTodoDismiss}
        />
      )}

      {/* ── Modals ──────────────────────────────────────────────────────── */}
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
  wing, onComplete, completing,
}: {
  wing: WingSummary;
  onComplete: () => void;
  completing: boolean;
}) {
  const navigate = useNavigate();
  const c = WING_COLOR[wing.color] ?? WING_COLOR.slate;

  return (
    <div className={`rounded-xl bg-white shadow-md border-l-4 ${c.accentBorder} border ${c.border} p-5`}>
      <div className="flex items-start gap-4">
        <div className={`h-14 w-14 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
          <span className="text-3xl leading-none">{wing.emoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
              ✦ Most Important Next Step
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.badge}`}>
              {wing.name} · {wing.levelLabel}
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
          <Link to={wing.nextStep.actionUrl} className={`btn-primary text-sm px-4 py-2`}
            style={{ background: undefined }}
          >
            {wing.nextStep.actionLabel} →
          </Link>
        ) : (
          <a href={wing.nextStep.actionUrl} target="_blank" rel="noopener noreferrer"
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${c.btn}`}
          >
            {wing.nextStep.actionLabel} ↗
          </a>
        )}

        <button
          onClick={onComplete}
          disabled={completing}
          className="rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          {completing ? <Spinner className="h-4 w-4" /> : '✓'} Mark complete
        </button>

        <button onClick={() => navigate(`/wings/${wing.id}`)} className="btn-ghost text-sm">
          View details →
        </button>
      </div>

      {wing.nextStep.isAffiliate && (
        <p className="mt-2 text-[10px] text-gray-400">
          Affiliate link · LegacyOS may earn a commission at no cost to you.
        </p>
      )}
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
