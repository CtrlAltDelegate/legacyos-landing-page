import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

export interface BenchmarkPoint {
  label: string;
  portfolio: number;
  spy: number;
}

interface Props {
  data: BenchmarkPoint[];
  hasData: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-white border border-gray-100 shadow-md px-3 py-2 text-xs min-w-[130px]">
      <p className="text-gray-400 mb-1.5 font-medium">{label}</p>
      {payload.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (p: any) => (
          <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
            {p.dataKey === 'portfolio' ? 'Your portfolio' : 'S&P 500 (SPY)'}:{' '}
            {Number(p.value).toFixed(1)}
          </p>
        )
      )}
    </div>
  );
}

export default function BenchmarkChart({ data, hasData }: Props) {
  if (!hasData || data.length < 2) {
    return (
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 px-5 py-10 text-center">
        <p className="text-sm font-semibold text-gray-700 mb-1">Portfolio vs. S&amp;P 500</p>
        <p className="text-xs text-gray-400">
          Not enough snapshot data yet. This chart populates after 2+ monthly snapshots.
        </p>
      </div>
    );
  }

  const portfolioReturn = ((data[data.length - 1].portfolio - 100) / 1).toFixed(1);
  const spyReturn = ((data[data.length - 1].spy - 100) / 1).toFixed(1);
  const isBeating = Number(portfolioReturn) >= Number(spyReturn);

  return (
    <div className="rounded-xl bg-white shadow-sm border border-gray-100 px-5 py-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="section-label">Portfolio vs. S&amp;P 500</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Indexed to 100 at first snapshot &middot; {data.length} months
          </p>
        </div>
        <div className="text-right">
          <p
            className={`text-sm font-bold ${
              isBeating ? 'text-emerald-600' : 'text-gray-500'
            }`}
          >
            {isBeating ? '↑ Outperforming' : '↓ Underperforming'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            You:{' '}
            <span className={`font-semibold ${Number(portfolioReturn) >= 0 ? 'text-gray-700' : 'text-red-600'}`}>
              {Number(portfolioReturn) >= 0 ? '+' : ''}
              {portfolioReturn}%
            </span>{' '}
            &middot; SPY:{' '}
            <span className={`font-semibold ${Number(spyReturn) >= 0 ? 'text-gray-700' : 'text-red-600'}`}>
              {Number(spyReturn) >= 0 ? '+' : ''}
              {spyReturn}%
            </span>
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            width={36}
            tickFormatter={(v) => String(Math.round(v))}
          />
          <Tooltip content={CustomTooltip} />
          {/* Baseline at 100 */}
          <ReferenceLine y={100} stroke="#e5e7eb" strokeDasharray="4 2" />
          {/* Portfolio line */}
          <Line
            type="monotone"
            dataKey="portfolio"
            stroke="#3a47ec"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          {/* SPY line */}
          <Line
            type="monotone"
            dataKey="spy"
            stroke="#9ca3af"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-5 rounded-full bg-brand-600" />
          <span className="text-xs text-gray-400">Your portfolio</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="20" height="2" className="overflow-visible">
            <line
              x1="0"
              y1="1"
              x2="20"
              y2="1"
              stroke="#9ca3af"
              strokeWidth="1.5"
              strokeDasharray="5 3"
            />
          </svg>
          <span className="text-xs text-gray-400">S&amp;P 500 (SPY)</span>
        </div>
      </div>
    </div>
  );
}
