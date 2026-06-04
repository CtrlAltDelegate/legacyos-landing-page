import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

export interface TrajectorySnapshot {
  snapshotDate: string;
  netWorth: number | string;
}

export interface TrajectoryGoal {
  targetMonthlyIncome: number | null;
  targetDate: string | null;
  riskTolerance: string | null;
}

interface Props {
  snapshots: TrajectorySnapshot[];
  goal: TrajectoryGoal | null;
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

const fmt = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `$${(n / 1_000).toFixed(0)}K`
    : `$${n.toFixed(0)}`;

const fmtFull = (n: number) =>
  n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

function fmtMonth(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit',
  });
}

function fmtMonthFull(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

// ─── Linear regression ────────────────────────────────────────────────────────

function linearRegression(points: { x: number; y: number }[]): {
  slope: number;
  intercept: number;
} {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y ?? 0 };
  const sumX = points.reduce((a, p) => a + p.x, 0);
  const sumY = points.reduce((a, p) => a + p.y, 0);
  const sumXY = points.reduce((a, p) => a + p.x * p.y, 0);
  const sumX2 = points.reduce((a, p) => a + p.x * p.x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actual = payload.find((p: any) => p.dataKey === 'actual');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projected = payload.find((p: any) => p.dataKey === 'projected');
  return (
    <div className="rounded-lg bg-white border border-gray-100 shadow-md px-3 py-2">
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      {actual?.value != null && (
        <p className="text-sm font-bold text-gray-900">{fmtFull(Number(actual.value))}</p>
      )}
      {projected?.value != null && actual?.value == null && (
        <p className="text-sm font-bold text-brand-600">
          {fmtFull(Number(projected.value))}{' '}
          <span className="text-xs font-normal text-gray-400">projected</span>
        </p>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TrajectoryChart({ snapshots, goal }: Props) {
  if (snapshots.length < 2) {
    return (
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 px-5 py-10 text-center">
        <p className="text-sm font-semibold text-gray-700 mb-1">Net Worth Trajectory</p>
        <p className="text-xs text-gray-400">
          Not enough data yet. Projections appear after 2+ monthly snapshots.
        </p>
      </div>
    );
  }

  // Regression on snapshot data
  const points = snapshots.map((s, i) => ({ x: i, y: Number(s.netWorth) }));
  const { slope, intercept } = linearRegression(points);
  const lastIdx = snapshots.length - 1;
  const lastDate = new Date(snapshots[lastIdx].snapshotDate);
  const currentNW = points[lastIdx].y;

  // Determine projection horizon: goal target date or 5 years, whichever is further
  const targetDate = goal?.targetDate ? new Date(goal.targetDate) : null;
  const fiveYearsOut = addMonths(lastDate, 60);
  const projectionEnd =
    targetDate && targetDate > fiveYearsOut ? targetDate : fiveYearsOut;
  const projectionMonths = Math.min(
    120, // hard cap at 10 years
    Math.ceil(
      (projectionEnd.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    )
  );

  // Build unified data array
  type DataPoint = {
    label: string;
    actual?: number;
    projected?: number;
  };
  const data: DataPoint[] = [];

  // Historical actual points
  for (const snap of snapshots) {
    data.push({ label: fmtMonth(snap.snapshotDate), actual: Number(snap.netWorth) });
  }

  // Junction: last actual point also anchors the projected line
  data[lastIdx].projected = currentNW;

  // Future projected points
  for (let m = 1; m <= projectionMonths; m++) {
    const projValue = Math.max(0, Math.round(intercept + slope * (lastIdx + m)));
    const projDate = addMonths(lastDate, m);
    data.push({
      label: projDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      projected: projValue,
    });
  }

  // Target net worth via 4% safe-withdrawal rule
  const targetNW =
    goal?.targetMonthlyIncome && Number(goal.targetMonthlyIncome) > 0
      ? Number(goal.targetMonthlyIncome) * 12 * 25
      : null;

  // Projected endpoint value
  const projectedEndValue = Math.max(
    0,
    Math.round(intercept + slope * (lastIdx + projectionMonths))
  );

  // Projected value at goal target date
  const projectedAtTargetDate =
    targetDate && targetDate > lastDate
      ? Math.max(
          0,
          Math.round(
            intercept +
              slope *
                (lastIdx +
                  Math.ceil(
                    (targetDate.getTime() - lastDate.getTime()) /
                      (1000 * 60 * 60 * 24 * 30.44)
                  ))
          )
        )
      : null;

  // When does projected line cross the target NW?
  let goalCrossLabel: string | null = null;
  if (targetNW && slope > 0) {
    const monthsToGoal = (targetNW - intercept) / slope - lastIdx;
    if (monthsToGoal > 0 && monthsToGoal <= projectionMonths) {
      goalCrossLabel = addMonths(lastDate, Math.round(monthsToGoal)).toLocaleDateString(
        'en-US',
        { month: 'short', year: 'numeric' }
      );
    }
  }

  // Chart y-axis domain
  const allVals = data.flatMap((d) =>
    [d.actual, d.projected, targetNW].filter((v): v is number => v != null)
  );
  const maxVal = Math.max(...allVals);
  const minVal = Math.min(0, ...allVals);

  return (
    <div className="rounded-xl bg-white shadow-sm border border-gray-100 px-5 py-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="section-label">Net Worth Trajectory</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Linear trend from {snapshots.length} snapshots &middot; projected{' '}
            {projectionMonths}mo forward
          </p>
        </div>
        {projectedAtTargetDate != null && targetDate && (
          <div className="text-right">
            <p className="text-xs text-gray-400">
              At target date ({targetDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})
            </p>
            <p className="text-sm font-bold text-brand-700">
              {fmtFull(projectedAtTargetDate)}
            </p>
          </div>
        )}
      </div>

      {/* Insight callout */}
      {slope > 0 ? (
        <div className="mb-4 rounded-lg bg-brand-50 border border-brand-100 px-4 py-3">
          <p className="text-sm text-brand-800">
            At your current trajectory, you&apos;ll reach{' '}
            <span className="font-bold">{fmt(projectedEndValue)}</span> by{' '}
            <span className="font-bold">{fmtMonthFull(projectionEnd)}</span>.
            {goalCrossLabel && targetNW && (
              <>
                {' '}
                Goal of{' '}
                <span className="font-bold">{fmt(targetNW)}</span> reached around{' '}
                <span className="font-bold">{goalCrossLabel}</span>.
              </>
            )}
          </p>
        </div>
      ) : (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-100 px-4 py-3">
          <p className="text-sm text-amber-800">
            Your net worth trend is currently flat or declining. Review your
            assets and liabilities with Flo.
          </p>
        </div>
      )}

      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="trajActualGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3a47ec" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#3a47ec" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="trajProjGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3a47ec" stopOpacity={0.06} />
              <stop offset="95%" stopColor="#3a47ec" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={fmt}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            width={52}
            domain={[Math.min(0, minVal * 1.05), maxVal * 1.1]}
          />
          <Tooltip content={CustomTooltip} />
          {/* Goal net worth reference line */}
          {targetNW && (
            <ReferenceLine
              y={targetNW}
              stroke="#10b981"
              strokeDasharray="4 3"
              label={{
                value: `Goal: ${fmt(targetNW)}`,
                position: 'insideTopRight',
                fontSize: 10,
                fill: '#10b981',
              }}
            />
          )}
          {/* Actual net worth area */}
          <Area
            type="monotone"
            dataKey="actual"
            stroke="#3a47ec"
            strokeWidth={2}
            fill="url(#trajActualGrad)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            connectNulls={false}
          />
          {/* Projected net worth area (dashed) */}
          <Area
            type="monotone"
            dataKey="projected"
            stroke="#3a47ec"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            fill="url(#trajProjGrad)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-5 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-5 rounded-full bg-brand-600" />
          <span className="text-xs text-gray-400">Actual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="20" height="2" className="overflow-visible">
            <line
              x1="0"
              y1="1"
              x2="20"
              y2="1"
              stroke="#3a47ec"
              strokeWidth="1.5"
              strokeDasharray="5 4"
            />
          </svg>
          <span className="text-xs text-gray-400">Projected (linear trend)</span>
        </div>
        {targetNW && (
          <div className="flex items-center gap-1.5">
            <svg width="20" height="2" className="overflow-visible">
              <line
                x1="0"
                y1="1"
                x2="20"
                y2="1"
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
            </svg>
            <span className="text-xs text-gray-400">Goal</span>
          </div>
        )}
      </div>
    </div>
  );
}
