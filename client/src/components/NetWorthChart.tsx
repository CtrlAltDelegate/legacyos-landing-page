import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Snapshot {
  snapshotDate: string;
  netWorth: number | string;
}

interface Props {
  snapshots: Snapshot[];
}

const fmt = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `$${(n / 1_000).toFixed(0)}K`
    : `$${n.toFixed(0)}`;

const fmtFull = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function fmtMonth(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

interface TooltipPayload {
  value: number;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  return (
    <div className="rounded-lg bg-white border border-gray-100 shadow-md px-3 py-2">
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className={`text-sm font-bold font-mono ${value >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
        {fmtFull(value)}
      </p>
    </div>
  );
}

export default function NetWorthChart({ snapshots }: Props) {
  if (snapshots.length < 2) return null;

  const data = snapshots.map((s) => ({
    label: fmtMonth(s.snapshotDate),
    value: Number(s.netWorth),
  }));

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const isPositiveTrend = data[data.length - 1].value >= data[0].value;

  // Pad domain a little
  const domain = [Math.min(0, min) * 1.05, max * 1.05];

  return (
    <div className="rounded-xl bg-white shadow-sm border border-gray-100 px-5 py-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="section-label">Net worth history</h2>
          <p className="text-xs text-gray-400 mt-0.5">{snapshots.length} monthly snapshots</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
          isPositiveTrend ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
        }`}>
          {isPositiveTrend ? '↑' : '↓'} {Math.abs(((data[data.length - 1].value - data[0].value) / Math.abs(data[0].value || 1)) * 100).toFixed(1)}%
        </span>
      </div>

      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isPositiveTrend ? '#3a47ec' : '#ef4444'} stopOpacity={0.15} />
              <stop offset="95%" stopColor={isPositiveTrend ? '#3a47ec' : '#ef4444'} stopOpacity={0} />
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
            width={48}
            domain={domain}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={isPositiveTrend ? '#3a47ec' : '#ef4444'}
            strokeWidth={2}
            fill="url(#netWorthGradient)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
