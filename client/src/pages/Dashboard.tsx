import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getErrorMessage } from '@/api/client';
import { getAllWings, type WingSummary } from '@/api/wings';
import { useAuthStore } from '@/store/auth';
import Spinner from '@/components/Spinner';

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

// ─── Wing color map (Tailwind safe-listed classes) ────────────────────────────

const COLOR: Record<string, { bg: string; border: string; badge: string; text: string; dot: string }> = {
  emerald: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  rose: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    badge: 'bg-rose-100 text-rose-700',
    text: 'text-rose-700',
    dot: 'bg-rose-500',
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  violet: {
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    badge: 'bg-violet-100 text-violet-700',
    text: 'text-violet-700',
    dot: 'bg-violet-500',
  },
  slate: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    badge: 'bg-slate-100 text-slate-700',
    text: 'text-slate-700',
    dot: 'bg-slate-500',
  },
};

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// ─── Wing Card ────────────────────────────────────────────────────────────────

function WingCard({ wing }: { wing: WingSummary }) {
  const navigate = useNavigate();
  const c = COLOR[wing.color] ?? COLOR.slate;
  const MAX_LEVEL = 3;

  return (
    <div
      className={`rounded-xl border ${c.border} ${c.bg} p-5 flex flex-col gap-3 hover:shadow-md transition-shadow cursor-pointer`}
      onClick={() => navigate(`/wings/${wing.id}`)}
    >
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
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
          {wing.assessed ? 'Your next step' : 'Suggested first step'}
        </p>
        <p className="text-sm font-semibold text-gray-800 leading-snug">
          {wing.nextStep.title}
        </p>
      </div>

      {/* Action */}
      <div className="flex flex-col gap-1.5 pt-1 border-t border-gray-200">
        {wing.nextStep.isInternal ? (
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
        )}
        {wing.nextStep.isAffiliate && (
          <p className="text-[10px] text-gray-400">Affiliate link · we may earn a commission</p>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/wings/${wing.id}`); }}
          className="text-xs text-gray-400 hover:text-gray-600 text-left"
        >
          {wing.assessed ? 'View details →' : 'Take assessment →'}
        </button>
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
          { label: 'Net worth',        value: data ? fmt(data.netWorth) : '—' },
          { label: 'Total assets',     value: data ? fmt(data.totalAssets) : '—' },
          { label: 'Total liabilities',value: data ? fmt(data.totalLiabilities) : '—' },
          { label: 'Equity / stocks',  value: data ? fmt(data.breakdown.equityValue) : '—' },
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      getAllWings(),
      api.get<NetWorthData>('/networth/current'),
    ])
      .then(([w, nwRes]) => {
        setWings(w);
        setNetWorth(nwRes.data);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

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
  const avgLevel = wings.length
    ? Math.round(wings.reduce((s, w) => s + w.level, 0) / wings.length)
    : 0;

  const levelLabels = ['Foundation', 'Building', 'Established', 'Advanced'];

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Good {getTimeOfDay()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {assessedCount === 0
              ? 'Start by taking an assessment in any wing below. Each one unlocks your next step.'
              : `You have assessed ${assessedCount} of 6 Wings. Overall level: ${levelLabels[avgLevel]}.`}
          </p>
        </div>
        <Link
          to="/flo"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition"
        >
          <span>✦</span> Ask Flo
        </Link>
      </div>

      {/* ── Six Wing Command Center ────────────────────────────────────────── */}
      <div>
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Six Wing Framework
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          Click any wing to take the assessment and see your personalized next step.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wings.map((wing) => (
            <WingCard key={wing.id} wing={wing} />
          ))}
        </div>
      </div>

      {/* ── Net Worth Tracker ─────────────────────────────────────────────── */}
      <NetWorthStrip data={netWorth} />

    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
