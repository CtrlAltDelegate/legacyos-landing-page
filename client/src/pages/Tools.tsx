import { useState, useEffect, useId } from 'react';
import {
  ComposedChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Line,
} from 'recharts';
import { Calculator, Flame, PiggyBank, CreditCard, Plus, Trash2 } from 'lucide-react';
import { api } from '@/api/client';

// ─── Shared helpers ───────────────────────────────────────────────────────────

const fmtUSD = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const fmtK = (n: number) =>
  Math.abs(n) >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : Math.abs(n) >= 1_000
    ? `$${(n / 1_000).toFixed(0)}K`
    : `$${n.toFixed(0)}`;

// Compound future value: PV grows at rate r/yr for n years with PMT annual additions
function fv(pv: number, pmt: number, rateAnnual: number, years: number): number {
  if (years <= 0) return pv;
  if (rateAnnual === 0) return pv + pmt * years;
  const r = rateAnnual / 100;
  return pv * Math.pow(1 + r, years) + pmt * (Math.pow(1 + r, years) - 1) / r;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'fire' | 'retirement' | 'debt';

interface DebtEntry {
  id: string;
  name: string;
  balance: number;
  apr: number;
  minimumPayment: number;
}

// ─── Shared input components ──────────────────────────────────────────────────

function NumInput({
  label, value, onChange, prefix = '$', suffix, min = 0, step = 1, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  prefix?: string; suffix?: string; min?: number; step?: number; placeholder?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </label>
      <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-brand-400 focus-within:border-brand-400 transition">
        {prefix && <span className="text-sm text-gray-400 flex-shrink-0">{prefix}</span>}
        <input
          id={id}
          type="number"
          value={value}
          min={min}
          step={step}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent text-sm text-gray-900 outline-none min-w-0"
        />
        {suffix && <span className="text-sm text-gray-400 flex-shrink-0">{suffix}</span>}
      </div>
    </div>
  );
}

function RangeInput({
  label, value, onChange, min, max, step = 0.5, display,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step?: number; display: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
        <span className="text-sm font-bold text-brand-700">{display}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand-600"
      />
      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
        <span>{min}%</span><span>{max}%</span>
      </div>
    </div>
  );
}

// ─── Tab nav ──────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; Icon: React.ElementType; tagline: string }[] = [
  { id: 'fire',       label: 'FIRE Calculator',       Icon: Flame,     tagline: 'When can you retire?' },
  { id: 'retirement', label: 'Retirement Projector',  Icon: PiggyBank, tagline: 'Will your 401k be enough?' },
  { id: 'debt',       label: 'Debt Payoff Planner',   Icon: CreditCard, tagline: 'Avalanche vs. snowball' },
];

// ─── Custom tooltip ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-white border border-gray-100 shadow-md px-3 py-2 text-sm">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any) => (
        <p key={p.dataKey} className="font-semibold" style={{ color: p.color }}>
          {p.name}: {fmtK(Number(p.value))}
        </p>
      ))}
    </div>
  );
}

// ─── FIRE Calculator ──────────────────────────────────────────────────────────

function FireCalculator({ prefillNW }: { prefillNW: number | null }) {
  const [currentNW,      setCurrentNW]      = useState(prefillNW != null ? String(Math.round(prefillNW)) : '');
  const [monthlySavings, setMonthlySavings] = useState('');
  const [targetIncome,   setTargetIncome]   = useState('');
  const [currentAge,     setCurrentAge]     = useState('35');
  const [retireAge,      setRetireAge]      = useState('55');
  const [returnRate,     setReturnRate]     = useState(7);

  useEffect(() => {
    if (prefillNW != null && currentNW === '') {
      setCurrentNW(String(Math.round(prefillNW)));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillNW]);

  const pv          = Number(currentNW)      || 0;
  const pmt         = (Number(monthlySavings) || 0) * 12;
  const target      = (Number(targetIncome)   || 0) * 300; // 4% SWR = 25× annual = monthly × 300
  const curAge      = Number(currentAge)      || 35;
  const retAge      = Number(retireAge)       || 55;
  const years       = Math.max(0, retAge - curAge);

  // Three scenarios
  const SCENARIOS = [
    { rate: 5,   label: 'Conservative (5%)',  color: '#94a3b8', fill: '#f1f5f9' },
    { rate: returnRate, label: `Base (${returnRate}%)`, color: '#3a47ec', fill: '#eef0fd' },
    { rate: 9,   label: 'Optimistic (9%)',    color: '#10b981', fill: '#f0fdf4' },
  ];

  // Build chart data (annual steps)
  const maxYears = Math.max(years + 10, 30);
  const chartData = Array.from({ length: maxYears + 1 }, (_, i) => {
    const row: Record<string, number | string> = { label: String(curAge + i) };
    for (const s of SCENARIOS) {
      row[s.label] = Math.round(fv(pv, pmt, s.rate, i));
    }
    return row;
  });

  // Find FIRE year for base scenario
  const baseLabel = SCENARIOS[1].label;
  const fireYear = target > 0
    ? chartData.find((d) => Number(d[baseLabel]) >= target)
    : null;
  const fireAge  = fireYear ? Number(fireYear.label) : null;
  const projectedAtRetire = Math.round(fv(pv, pmt, returnRate, years));
  const isOnTrack = target > 0 && projectedAtRetire >= target;

  const hasInputs = pv > 0 || pmt > 0;

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-bold text-gray-800 mb-4">Your Numbers</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <NumInput label="Current net worth" value={currentNW} onChange={setCurrentNW} placeholder="250000" />
          <NumInput label="Monthly savings" value={monthlySavings} onChange={setMonthlySavings} placeholder="3000" />
          <NumInput label="Target monthly income" value={targetIncome} onChange={setTargetIncome} placeholder="8000" />
          <NumInput label="Current age" value={currentAge} onChange={setCurrentAge} prefix="" placeholder="35" />
          <NumInput label="Target retire age" value={retireAge} onChange={setRetireAge} prefix="" placeholder="55" />
          <div className="col-span-2 sm:col-span-1">
            <RangeInput
              label="Expected return"
              value={returnRate}
              onChange={setReturnRate}
              min={3} max={12}
              display={`${returnRate}%`}
            />
          </div>
        </div>
      </div>

      {!hasInputs && (
        <p className="text-sm text-gray-400 text-center py-4">
          Enter your net worth and monthly savings to see projections.
        </p>
      )}

      {hasInputs && (
        <>
          {/* Summary cards */}
          {target > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">FIRE Number</p>
                <p className="text-lg font-bold text-gray-900">{fmtK(target)}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">25× annual income</p>
              </div>
              <div className={`rounded-xl border shadow-sm p-4 ${isOnTrack ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">At Retire Age {retireAge}</p>
                <p className={`text-lg font-bold ${isOnTrack ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {fmtK(projectedAtRetire)}
                </p>
                <p className={`text-[10px] mt-0.5 ${isOnTrack ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {isOnTrack ? '✓ On track' : `${fmtK(target - projectedAtRetire)} gap`}
                </p>
              </div>
              <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">FIRE Age (base)</p>
                <p className="text-lg font-bold text-gray-900">
                  {fireAge != null ? `Age ${fireAge}` : '—'}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {fireAge != null ? `${fireAge - curAge} years away` : 'Extend horizon or save more'}
                </p>
              </div>
              <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Monthly from FIRE</p>
                <p className="text-lg font-bold text-brand-700">{fmtUSD(Number(targetIncome) || 0)}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">at 4% withdrawal rate</p>
              </div>
            </div>
          )}

          {/* Chart */}
          <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">Net Worth Projection — 3 Scenarios</h3>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  {SCENARIOS.map((s) => (
                    <linearGradient key={s.label} id={`grad-${s.label}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={s.color} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={s.color} stopOpacity={0}    />
                    </linearGradient>
                  ))}
                </defs>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={Math.floor(maxYears / 6)} />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={52} />
                <Tooltip content={ChartTooltip} />
                {target > 0 && (
                  <ReferenceLine y={target} stroke="#10b981" strokeDasharray="4 3"
                    label={{ value: `FIRE: ${fmtK(target)}`, position: 'insideTopRight', fontSize: 10, fill: '#10b981' }}
                  />
                )}
                {years > 0 && (
                  <ReferenceLine x={String(retAge)} stroke="#f59e0b" strokeDasharray="4 3"
                    label={{ value: `Age ${retAge}`, position: 'insideTopLeft', fontSize: 10, fill: '#f59e0b' }}
                  />
                )}
                {SCENARIOS.map((s) => (
                  <Area
                    key={s.label}
                    type="monotone"
                    dataKey={s.label}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={s.label === baseLabel ? 2 : 1.5}
                    fill={`url(#grad-${s.label})`}
                    dot={false}
                    activeDot={{ r: 3, strokeWidth: 0 }}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-3">
              {SCENARIOS.map((s) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-[10px] text-gray-400">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Insight */}
          <div className="rounded-xl bg-brand-50 border border-brand-100 px-5 py-4">
            <p className="text-sm text-brand-800">
              {target > 0
                ? isOnTrack
                  ? `At ${returnRate}% returns you'll hit your FIRE number of ${fmtK(target)} by age ${fireAge ?? retireAge}, reaching ${fmtK(projectedAtRetire)} at age ${retireAge}. You're on track.`
                  : `You'll have ${fmtK(projectedAtRetire)} at age ${retireAge} — ${fmtK(target - projectedAtRetire)} short of your FIRE number. ${fireAge ? `At ${returnRate}% you'd hit FIRE at age ${fireAge}.` : 'Consider increasing savings or adjusting your income target.'}`
                : `At ${returnRate}% returns you'll have ${fmtK(projectedAtRetire)} at age ${retireAge}. Enter a target monthly income above to see your FIRE number.`
              }
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Retirement Calculator ────────────────────────────────────────────────────

function RetirementCalculator({ prefillRetirementBalance }: { prefillRetirementBalance: number | null }) {
  const [currentBalance,  setCurrentBalance]  = useState(prefillRetirementBalance != null ? String(Math.round(prefillRetirementBalance)) : '');

  useEffect(() => {
    if (prefillRetirementBalance != null && currentBalance === '') {
      setCurrentBalance(String(Math.round(prefillRetirementBalance)));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillRetirementBalance]);
  const [monthlyContrib,  setMonthlyContrib]  = useState('');
  const [annualSalary,    setAnnualSalary]    = useState('');
  const [matchRate,       setMatchRate]       = useState('50');   // employer matches 50% of contributions
  const [matchCap,        setMatchCap]        = useState('6');    // up to 6% of salary
  const [currentAge,      setCurrentAge]      = useState('35');
  const [retireAge,       setRetireAge]       = useState('65');
  const [returnRate,      setReturnRate]      = useState(7);

  const pv             = Number(currentBalance) || 0;
  const yourAnnual     = (Number(monthlyContrib) || 0) * 12;
  const salary         = Number(annualSalary)   || 0;
  const mRate          = Number(matchRate)       / 100;
  const mCap           = Number(matchCap)        / 100;
  const employerAnnual = salary > 0 ? Math.min(yourAnnual * mRate, salary * mCap) : 0;
  const totalAnnual    = yourAnnual + employerAnnual;
  const years          = Math.max(0, (Number(retireAge) || 65) - (Number(currentAge) || 35));

  // Build annual chart data: your contributions, employer, growth
  type RetRow = { age: string; yours: number; employer: number; growth: number; total: number };
  const chartData: RetRow[] = [];
  let cumYours = 0, cumEmployer = 0;
  for (let i = 0; i <= years; i++) {
    const totalNow = Math.round(fv(pv, totalAnnual, returnRate, i));
    cumYours    = Math.round(yourAnnual    * i + pv);
    cumEmployer = Math.round(employerAnnual * i);
    const growth = Math.max(0, totalNow - cumYours - cumEmployer);
    chartData.push({ age: String((Number(currentAge) || 35) + i), yours: cumYours, employer: cumEmployer, growth, total: totalNow });
  }

  const projected = chartData[chartData.length - 1]?.total ?? 0;
  const yourTotal = yourAnnual * years + pv;
  const empTotal  = employerAnnual * years;
  const growth    = Math.max(0, projected - yourTotal - empTotal);

  // Monthly income from 4% SWR
  const monthlyIncome = Math.round(projected * 0.04 / 12);

  const hasInputs = pv > 0 || yourAnnual > 0;

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-bold text-gray-800 mb-4">Your Numbers</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <NumInput label="Current balance" value={currentBalance} onChange={setCurrentBalance} placeholder="85000"
            suffix={prefillRetirementBalance != null ? '← prefilled' : undefined} />
          <NumInput label="Monthly contribution" value={monthlyContrib} onChange={setMonthlyContrib} placeholder="1500" />
          <NumInput label="Annual salary" value={annualSalary} onChange={setAnnualSalary} placeholder="120000"
            suffix="optional" />
          <NumInput label="Employer match %" value={matchRate} onChange={setMatchRate} prefix="" suffix="%" placeholder="50" />
          <NumInput label="Match cap (% of salary)" value={matchCap} onChange={setMatchCap} prefix="" suffix="%" placeholder="6" />
          <NumInput label="Current age" value={currentAge} onChange={setCurrentAge} prefix="" placeholder="35" />
          <NumInput label="Retirement age" value={retireAge} onChange={setRetireAge} prefix="" placeholder="65" />
          <div className="col-span-2 sm:col-span-1">
            <RangeInput label="Expected return" value={returnRate} onChange={setReturnRate} min={3} max={12} display={`${returnRate}%`} />
          </div>
        </div>
        {salary > 0 && employerAnnual > 0 && (
          <p className="mt-3 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
            Employer match: {fmtUSD(employerAnnual)}/yr ({fmtUSD(employerAnnual / 12)}/mo) — free money, don't leave it on the table.
          </p>
        )}
      </div>

      {!hasInputs && (
        <p className="text-sm text-gray-400 text-center py-4">
          Enter your current balance and monthly contribution to see projections.
        </p>
      )}

      {hasInputs && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Balance at {retireAge}</p>
              <p className="text-lg font-bold text-gray-900">{fmtK(projected)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">at {returnRate}% return</p>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 shadow-sm p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Monthly Income</p>
              <p className="text-lg font-bold text-emerald-700">{fmtUSD(monthlyIncome)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">4% safe withdrawal</p>
            </div>
            <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Your Contributions</p>
              <p className="text-lg font-bold text-brand-700">{fmtK(yourTotal)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{fmtUSD(yourAnnual)}/yr</p>
            </div>
            <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Investment Growth</p>
              <p className="text-lg font-bold text-amber-600">{fmtK(growth)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {projected > 0 ? `${Math.round(growth / projected * 100)}% of total` : '—'}
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">Balance Breakdown Over Time</h3>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="retGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <XAxis dataKey="age" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={Math.floor(years / 6)} />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={52} />
                <Tooltip content={ChartTooltip} />
                <Area type="monotone" dataKey="yours"    name="Your contributions"    stroke="#3a47ec" strokeWidth={0} fill="#eef0fd" stackId="1" dot={false} />
                <Area type="monotone" dataKey="employer" name="Employer match"        stroke="#10b981" strokeWidth={0} fill="#dcfce7" stackId="1" dot={false} />
                <Area type="monotone" dataKey="growth"   name="Investment growth"     stroke="#f59e0b" strokeWidth={1.5} fill="url(#retGrowthGrad)" stackId="1" dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="total"    name="Total balance"         stroke="#1e293b" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-4 mt-3">
              {[
                { color: '#eef0fd', label: 'Your contributions', border: '#3a47ec' },
                { color: '#dcfce7', label: 'Employer match',      border: '#10b981' },
                { color: '#fef3c7', label: 'Investment growth',   border: '#f59e0b' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div className="h-2.5 w-3 rounded-sm border" style={{ background: item.color, borderColor: item.border }} />
                  <span className="text-[10px] text-gray-400">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-brand-50 border border-brand-100 px-5 py-4">
            <p className="text-sm text-brand-800">
              {fmtK(projected)} at retirement age {retireAge} supports{' '}
              <strong>{fmtUSD(monthlyIncome)}/month</strong> in withdrawals (4% rule).
              {empTotal > 0 && (
                <> Employer contributions add <strong>{fmtK(empTotal)}</strong> — make sure you're getting the full match.</>
              )}
              {' '}Investment growth accounts for <strong>{projected > 0 ? Math.round(growth / projected * 100) : 0}%</strong> of your ending balance.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Debt Payoff Calculator ───────────────────────────────────────────────────

function DebtPayoffCalculator({ prefillDebts }: { prefillDebts: DebtEntry[] }) {
  const [debts,       setDebts]       = useState<DebtEntry[]>(prefillDebts);
  const [extra,       setExtra]       = useState('');
  const [method,      setMethod]      = useState<'avalanche' | 'snowball'>('avalanche');
  const [addingNew,   setAddingNew]   = useState(false);
  const [newName,     setNewName]     = useState('');
  const [newBalance,  setNewBalance]  = useState('');
  const [newAPR,      setNewAPR]      = useState('');
  const [newMin,      setNewMin]      = useState('');

  // When prefill arrives after mount, apply it (if user hasn't changed anything)
  useEffect(() => {
    if (prefillDebts.length > 0 && debts.length === 0) {
      setDebts(prefillDebts);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillDebts]);

  function addDebt() {
    if (!newName || !newBalance || !newAPR || !newMin) return;
    setDebts(prev => [...prev, {
      id: `manual-${Date.now()}`,
      name: newName,
      balance: Number(newBalance),
      apr: Number(newAPR),
      minimumPayment: Number(newMin),
    }]);
    setNewName(''); setNewBalance(''); setNewAPR(''); setNewMin('');
    setAddingNew(false);
  }

  function removeDebt(id: string) {
    setDebts(prev => prev.filter(d => d.id !== id));
  }

  // Simulation
  function simulate(ds: DebtEntry[], extraMonthly: number, m: 'avalanche' | 'snowball') {
    if (!ds.length) return { months: 0, totalInterest: 0 };
    const entries = ds.map(d => ({ ...d, remaining: d.balance }));
    const fixedBudget = entries.reduce((s, d) => s + d.minimumPayment, 0) + extraMonthly;
    let totalInterest = 0;
    let month = 0;

    while (entries.some(d => d.remaining > 0.01) && month < 600) {
      month++;
      for (const d of entries) {
        if (d.remaining > 0) {
          const interest = d.remaining * d.apr / 100 / 12;
          totalInterest += interest;
          d.remaining += interest;
        }
      }
      const sorted = entries
        .filter(d => d.remaining > 0)
        .sort((a, b) => m === 'avalanche' ? b.apr - a.apr : a.remaining - b.remaining);

      let budget = fixedBudget;
      for (const p of sorted) {
        const d = entries.find(x => x.id === p.id)!;
        const pay = Math.min(budget, d.remaining);
        d.remaining -= pay;
        budget -= pay;
        if (budget <= 0) break;
      }
      for (const d of entries) { if (d.remaining < 0.01) d.remaining = 0; }
    }
    return { months: month, totalInterest };
  }

  const extraMonthly = Number(extra) || 0;
  const avalanche    = simulate(debts, extraMonthly, 'avalanche');
  const snowball     = simulate(debts, extraMonthly, 'snowball');
  const selected     = method === 'avalanche' ? avalanche : snowball;
  const totalDebt    = debts.reduce((s, d) => s + d.balance, 0);

  function fmtMonths(m: number) {
    if (m === 0) return '—';
    if (m >= 600) return '>50 yrs';
    const y = Math.floor(m / 12), mo = m % 12;
    return y > 0 ? `${y}y ${mo}mo` : `${mo}mo`;
  }

  const savingsVsSnowball = avalanche.totalInterest < snowball.totalInterest
    ? snowball.totalInterest - avalanche.totalInterest
    : 0;
  const savingsVsAvalanche = snowball.totalInterest < avalanche.totalInterest
    ? avalanche.totalInterest - snowball.totalInterest
    : 0;

  return (
    <div className="space-y-6">
      {/* Debt list */}
      <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-800">Your Debts</h2>
          <button
            onClick={() => setAddingNew(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 transition"
          >
            <Plus className="h-3.5 w-3.5" /> Add debt
          </button>
        </div>

        {debts.length === 0 && !addingNew && (
          <p className="text-sm text-gray-400 py-4 text-center">
            No debts added. Click "Add debt" or check that you have liabilities in LegacyOS.
          </p>
        )}

        {debts.length > 0 && (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-[10px] font-bold uppercase tracking-wide text-gray-400 pb-2 px-2">Name</th>
                  <th className="text-right text-[10px] font-bold uppercase tracking-wide text-gray-400 pb-2 px-2">Balance</th>
                  <th className="text-right text-[10px] font-bold uppercase tracking-wide text-gray-400 pb-2 px-2">APR</th>
                  <th className="text-right text-[10px] font-bold uppercase tracking-wide text-gray-400 pb-2 px-2">Min/mo</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {debts.map((d) => (
                  <tr key={d.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 px-2 font-medium text-gray-800">{d.name}</td>
                    <td className="py-2.5 px-2 text-right text-gray-700">{fmtUSD(d.balance)}</td>
                    <td className="py-2.5 px-2 text-right">
                      <span className={`font-semibold ${d.apr >= 15 ? 'text-red-600' : d.apr >= 7 ? 'text-amber-600' : 'text-gray-700'}`}>
                        {d.apr}%
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right text-gray-600">{fmtUSD(d.minimumPayment)}</td>
                    <td className="py-2.5 px-2">
                      <button onClick={() => removeDebt(d.id)} className="text-gray-300 hover:text-red-400 transition">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add debt form */}
        {addingNew && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="col-span-2 sm:col-span-4">
              <NumInput label="Debt name" value={newName} onChange={setNewName} prefix="" placeholder="Chase Sapphire" />
            </div>
            <NumInput label="Balance" value={newBalance} onChange={setNewBalance} placeholder="8500" />
            <NumInput label="APR %" value={newAPR} onChange={setNewAPR} prefix="" suffix="%" placeholder="22.4" />
            <NumInput label="Min payment" value={newMin} onChange={setNewMin} placeholder="200" />
            <div className="flex items-end gap-2">
              <button onClick={addDebt} className="btn-primary text-sm px-4 py-2 rounded-lg flex-1">Add</button>
              <button onClick={() => setAddingNew(false)} className="btn-secondary text-sm px-3 py-2 rounded-lg">✕</button>
            </div>
          </div>
        )}
      </div>

      {/* Method + extra payment */}
      {debts.length > 0 && (
        <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Strategy</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Payoff method</p>
              <div className="flex flex-col gap-2">
                {([
                  { id: 'avalanche', label: 'Avalanche', desc: 'Highest APR first — minimizes interest' },
                  { id: 'snowball',  label: 'Snowball',  desc: 'Lowest balance first — fastest wins' },
                ] as const).map((m) => (
                  <label key={m.id} className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${method === m.id ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="method" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} className="mt-0.5 accent-brand-600" />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{m.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <NumInput
                label="Extra monthly payment"
                value={extra}
                onChange={setExtra}
                placeholder="500"
              />
              <p className="text-xs text-gray-400 mt-2">
                Above and beyond your minimum payments. Even an extra $100/mo can save thousands in interest.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {debts.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Total Debt</p>
              <p className="text-lg font-bold text-gray-900">{fmtUSD(totalDebt)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{debts.length} account{debts.length !== 1 ? 's' : ''}</p>
            </div>
            <div className={`rounded-xl border shadow-sm p-4 ${method === 'avalanche' ? 'bg-brand-50 border-brand-200' : 'bg-white border-gray-100'}`}>
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Avalanche</p>
              <p className="text-lg font-bold text-gray-900">{fmtMonths(avalanche.months)}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{fmtUSD(Math.round(avalanche.totalInterest))} interest</p>
            </div>
            <div className={`rounded-xl border shadow-sm p-4 ${method === 'snowball' ? 'bg-brand-50 border-brand-200' : 'bg-white border-gray-100'}`}>
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Snowball</p>
              <p className="text-lg font-bold text-gray-900">{fmtMonths(snowball.months)}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{fmtUSD(Math.round(snowball.totalInterest))} interest</p>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 shadow-sm p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Best Method Saves</p>
              <p className="text-lg font-bold text-emerald-700">
                {fmtUSD(Math.round(Math.max(savingsVsSnowball, savingsVsAvalanche)))}
              </p>
              <p className="text-[10px] text-emerald-600 mt-0.5">
                {savingsVsSnowball > 0 ? 'Avalanche wins' : savingsVsAvalanche > 0 ? 'Snowball wins' : 'Same result'}
              </p>
            </div>
          </div>

          {/* Per-debt payoff order */}
          <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
              {method === 'avalanche' ? 'Avalanche' : 'Snowball'} — Payoff Priority Order
            </h3>
            <div className="space-y-2">
              {[...debts]
                .sort((a, b) => method === 'avalanche' ? b.apr - a.apr : a.balance - b.balance)
                .map((d, i) => {
                  const pct = totalDebt > 0 ? d.balance / totalDebt : 0;
                  return (
                    <div key={d.id} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-400 w-4 flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-800 truncate">{d.name}</span>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <span className={`text-xs font-bold ${d.apr >= 15 ? 'text-red-600' : d.apr >= 7 ? 'text-amber-600' : 'text-gray-500'}`}>{d.apr}% APR</span>
                            <span className="text-xs text-gray-500">{fmtUSD(d.balance)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full bg-brand-400" style={{ width: `${pct * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="rounded-xl bg-brand-50 border border-brand-100 px-5 py-4">
            <p className="text-sm text-brand-800">
              {method === 'avalanche'
                ? `The avalanche method pays off your ${fmtUSD(totalDebt)} in debt in ${fmtMonths(selected.months)}, costing ${fmtUSD(Math.round(selected.totalInterest))} in interest total.${savingsVsSnowball > 0 ? ` That's ${fmtUSD(Math.round(savingsVsSnowball))} less than snowball.` : ''}`
                : `The snowball method pays off your ${fmtUSD(totalDebt)} in debt in ${fmtMonths(selected.months)}, costing ${fmtUSD(Math.round(selected.totalInterest))} in interest total. Quick wins boost motivation.${savingsVsAvalanche > 0 ? ` Avalanche would save ${fmtUSD(Math.round(savingsVsAvalanche))} in interest.` : ''}`
              }
              {extraMonthly > 0 && ` Extra ${fmtUSD(extraMonthly)}/mo is applied to the priority debt.`}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Tools page ──────────────────────────────────────────────────────────

export default function Tools() {
  const [activeTab,    setActiveTab]    = useState<Tab>('fire');
  const [currentNW,    setCurrentNW]    = useState<number | null>(null);
  const [retBalance,   setRetBalance]   = useState<number | null>(null);
  const [prefillDebts, setPrefillDebts] = useState<DebtEntry[]>([]);

  useEffect(() => {
    // Prefill net worth for FIRE calculator
    api.get<{ netWorth: number; assets: number; liabilities: number }>('/networth/current')
      .then(r => setCurrentNW(r.data.netWorth))
      .catch(() => {});

    // Prefill retirement balance from assets (types: retirement_401k, retirement_ira, etc.)
    api.get<{ assets: Array<{ assetType: string; currentValue: string | null; isPretax: boolean }> }>('/assets')
      .then(r => {
        const retTypes = new Set(['retirement_401k', 'retirement_ira', 'roth_ira', 'pension']);
        const total = r.data.assets
          .filter(a => retTypes.has(a.assetType))
          .reduce((s, a) => s + (Number(a.currentValue) || 0), 0);
        if (total > 0) setRetBalance(total);
      })
      .catch(() => {});

    // Prefill debts from liabilities
    api.get<{ liabilities: Array<{ id: string; name: string; balance: number; interestRate: number | null; monthlyPayment: number | null }> }>('/liabilities')
      .then(r => {
        const debts = r.data.liabilities
          .filter(l => l.balance > 0)
          .map(l => ({
            id: l.id,
            name: l.name,
            balance: l.balance,
            apr: l.interestRate ?? 0,
            minimumPayment: l.monthlyPayment ?? 0,
          }));
        setPrefillDebts(debts);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Calculator className="h-6 w-6 text-brand-600" />
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Financial Tools</h1>
        </div>
        <p className="text-sm text-gray-500">
          Interactive calculators built from your LegacyOS data. Adjust any input to explore scenarios.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map(({ id, label, Icon, tagline }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-shrink-0 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-left transition ${
              activeTab === id
                ? 'bg-brand-600 border-brand-600 text-white shadow-sm'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold leading-tight">{label}</p>
              <p className={`text-[10px] leading-tight mt-0.5 ${activeTab === id ? 'text-brand-200' : 'text-gray-400'}`}>
                {tagline}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'fire'       && <FireCalculator        prefillNW={currentNW} />}
        {activeTab === 'retirement' && <RetirementCalculator  prefillRetirementBalance={retBalance} />}
        {activeTab === 'debt'       && <DebtPayoffCalculator  prefillDebts={prefillDebts} />}
      </div>

      {/* Footer disclaimer */}
      <p className="text-[11px] text-gray-400 pb-4">
        These calculators are for educational purposes only and do not constitute financial advice.
        Projections assume constant returns and do not account for inflation, taxes, or market volatility.
      </p>
    </div>
  );
}
