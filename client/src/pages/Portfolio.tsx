import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { api, getErrorMessage } from '@/api/client';
import Spinner from '@/components/Spinner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Asset {
  id: string;
  name: string;
  assetClass: string;
  assetType: string;
  currentValue: number | null;
  estimatedValue: number | null;
  adjustedValue: number | null;
  mortgageBalance: number | null;
  monthlyRent: number | null;
  currentValueSource: string;
  sector: string | null;
  geography: string | null;
  marketCapCategory: string | null;
  isPretax: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const fmtPct = (n: number) => `${n.toFixed(1)}%`;

function assetValue(a: Asset): number {
  if (a.assetClass === 'real_estate') {
    const adj = Number(a.adjustedValue ?? a.estimatedValue ?? 0);
    const mort = Number(a.mortgageBalance ?? 0);
    return Math.max(0, adj - mort);
  }
  return Number(a.currentValue ?? 0);
}

const CRYPTO_SOURCES = ['coingecko', 'binance', 'coinbase'];
function isCrypto(a: Asset): boolean {
  if (a.assetType === 'crypto') return true;
  return CRYPTO_SOURCES.some((s) => (a.currentValueSource ?? '').toLowerCase().includes(s));
}

// ─── Color palette ────────────────────────────────────────────────────────────

const PALETTE = {
  stocks:         '#3a47ec',
  crypto:         '#f97316',
  retirement:     '#8b5cf6',
  primaryHome:    '#10b981',
  rentalRE:       '#059669',
  business:       '#0ea5e9',
  bonds:          '#6366f1',
  preciousMetals: '#d97706',
  cash:           '#64748b',
  other:          '#94a3b8',
};

const SECTOR_COLORS: Record<string, string> = {
  'Technology':          '#3b82f6',
  'Healthcare':          '#10b981',
  'Financials':          '#8b5cf6',
  'Consumer Cyclical':   '#f59e0b',
  'Consumer Defensive':  '#84cc16',
  'Energy':              '#f97316',
  'Communication Services': '#06b6d4',
  'Industrials':         '#6366f1',
  'Utilities':           '#ec4899',
  'Real Estate':         '#14b8a6',
  'Basic Materials':     '#a78bfa',
  'Unknown':             '#9ca3af',
};

function sectorColor(sector: string | null): string {
  return SECTOR_COLORS[sector ?? ''] ?? SECTOR_COLORS['Unknown'];
}

// ─── Allocation bucket logic ──────────────────────────────────────────────────

interface Bucket {
  key: string;
  label: string;
  value: number;
  color: string;
}

function buildBuckets(assets: Asset[]): Bucket[] {
  const b: Record<string, number> = {
    stocks: 0, crypto: 0, retirement: 0,
    primaryHome: 0, rentalRE: 0, business: 0,
    bonds: 0, preciousMetals: 0, cash: 0, other: 0,
  };

  for (const a of assets) {
    const v = assetValue(a);
    if (v <= 0) continue;

    if (a.assetClass === 'equity') {
      if (isCrypto(a)) {
        b.crypto += v;
      } else if (['retirement_401k', 'retirement_ira'].includes(a.assetType)) {
        b.retirement += v;
      } else {
        b.stocks += v;
      }
    } else if (a.assetClass === 'real_estate') {
      if (['primary_residence', 'secondary_residence'].includes(a.assetType)) {
        b.primaryHome += v;
      } else {
        b.rentalRE += v;
      }
    } else if (a.assetClass === 'other') {
      if (a.assetType === 'business_equity') b.business += v;
      else if (a.assetType === 'bonds')          b.bonds += v;
      else if (a.assetType === 'precious_metals') b.preciousMetals += v;
      else if (['savings', 'checking', 'money_market', 'tbills', 'cash'].includes(a.assetType)) b.cash += v;
      else b.other += v;
    } else if (a.assetClass === 'restricted') {
      b.other += v;
    }
  }

  const labels: Record<string, string> = {
    stocks:         'Stocks',
    crypto:         'Crypto',
    retirement:     'Retirement (401k/IRA)',
    primaryHome:    'Primary Home',
    rentalRE:       'Rental Real Estate',
    business:       'Business Equity',
    bonds:          'Bonds',
    preciousMetals: 'Precious Metals',
    cash:           'Cash & Savings',
    other:          'Other',
  };

  return Object.entries(b)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      key,
      label: labels[key] ?? key,
      value,
      color: PALETTE[key as keyof typeof PALETTE] ?? '#94a3b8',
    }))
    .sort((a, z) => z.value - a.value);
}

// ─── Bar row (horizontal progress bar) ───────────────────────────────────────

function BarRow({ label, value, pct, color, sub }: {
  label: string; value: number; pct: number; color: string; sub?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-medium text-gray-700 flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          {label}
          {sub && <span className="text-gray-400 font-normal ml-1">({sub})</span>}
        </span>
        <span className="text-gray-500 font-medium tabular-nums">{fmt(value)} · {fmtPct(pct)}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── Custom donut tooltip ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg bg-white border border-gray-100 shadow-md px-3 py-2 text-xs">
      <p className="font-semibold text-gray-800">{d.label}</p>
      <p className="text-gray-500">{fmt(d.value)}</p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Portfolio() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/assets')
      .then(({ data }) => setAssets(data.assets ?? []))
      .catch((e) => setError(getErrorMessage(e)))
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
    return (
      <div className="p-6">
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      </div>
    );
  }

  const activeAssets = assets.filter((a) => assetValue(a) > 0);
  const totalValue = activeAssets.reduce((s, a) => s + assetValue(a), 0);
  const buckets = buildBuckets(activeAssets);

  if (activeAssets.length === 0) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Portfolio</h1>
        <p className="text-sm text-gray-500 mb-8">Add assets to see your allocation breakdown.</p>
      </div>
    );
  }

  // ── Stock sub-breakdowns ────────────────────────────────────────────────────

  const stockAssets = activeAssets.filter(
    (a) => a.assetClass === 'equity' && !isCrypto(a) && !['retirement_401k', 'retirement_ira'].includes(a.assetType)
  );
  const totalStocks = stockAssets.reduce((s, a) => s + assetValue(a), 0);

  // Sector
  const sectorMap = new Map<string, number>();
  for (const a of stockAssets) {
    const s = a.sector ?? 'Unknown';
    sectorMap.set(s, (sectorMap.get(s) ?? 0) + assetValue(a));
  }
  const sectors = [...sectorMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  // Geography
  const geoMap = new Map<string, number>();
  for (const a of stockAssets) {
    const g = a.geography ?? 'Unknown';
    const label = g === 'domestic' ? 'Domestic (US)' : g === 'international' ? 'International' : g === 'emerging' ? 'Emerging Markets' : 'Unknown';
    geoMap.set(label, (geoMap.get(label) ?? 0) + assetValue(a));
  }
  const geos = [...geoMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  // Market cap
  const capMap = new Map<string, number>();
  const CAP_LABELS: Record<string, string> = {
    mega_cap: 'Mega Cap ($200B+)', large_cap: 'Large Cap ($10B–$200B)',
    mid_cap: 'Mid Cap ($2B–$10B)', small_cap: 'Small Cap ($300M–$2B)', micro_cap: 'Micro Cap (<$300M)',
  };
  const CAP_COLORS: Record<string, string> = {
    mega_cap: '#1d4ed8', large_cap: '#3a47ec', mid_cap: '#6366f1', small_cap: '#8b5cf6', micro_cap: '#a78bfa',
  };
  for (const a of stockAssets) {
    const c = a.marketCapCategory ?? 'Unknown';
    const label = CAP_LABELS[c] ?? 'Unknown';
    capMap.set(label, (capMap.get(label) ?? 0) + assetValue(a));
  }
  const caps = [...capMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const GEO_COLORS = ['#3a47ec', '#10b981', '#f59e0b', '#9ca3af'];

  const stocksBucket = buckets.find((b) => b.key === 'stocks');
  const hasStockBreakdowns = totalStocks > 0;
  const hasEnrichment = stockAssets.some((a) => a.sector || a.geography || a.marketCapCategory);

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">Portfolio</h1>
        <p className="text-sm text-gray-500">
          Allocation across {activeAssets.length} position{activeAssets.length !== 1 ? 's' : ''} &middot; Total: <span className="font-semibold text-gray-700">{fmt(totalValue)}</span>
        </p>
      </div>

      {/* ── Top row: donut + bucket list ──────────────────────────────────── */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6">
        <h2 className="section-label mb-5">Overall allocation</h2>
        <div className="flex flex-col sm:flex-row gap-6 items-center">
          {/* Donut */}
          <div className="flex-shrink-0 w-44 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={buckets}
                  dataKey="value"
                  innerRadius="62%"
                  outerRadius="90%"
                  paddingAngle={buckets.length > 1 ? 2 : 0}
                  startAngle={90}
                  endAngle={-270}
                >
                  {buckets.map((b) => (
                    <Cell key={b.key} fill={b.color} />
                  ))}
                </Pie>
                <Tooltip content={DonutTooltip} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bucket list */}
          <div className="flex-1 space-y-2.5 w-full">
            {buckets.map((b) => (
              <BarRow
                key={b.key}
                label={b.label}
                value={b.value}
                pct={(b.value / totalValue) * 100}
                color={b.color}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Stocks detail ─────────────────────────────────────────────────── */}
      {hasStockBreakdowns && stocksBucket && (
        <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6 space-y-6">
          <div className="flex items-baseline justify-between">
            <h2 className="section-label">Stocks breakdown</h2>
            <span className="text-sm font-semibold text-gray-500">{fmt(totalStocks)} · {fmtPct((totalStocks / totalValue) * 100)}</span>
          </div>

          {/* Enrich nudge — only when data is partially or fully missing */}
          {!hasEnrichment && (
            <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-2.5">
              <p className="text-xs text-amber-700">
                <span className="font-semibold">Sector &amp; geography data not yet populated.</span>{' '}
                Go to <span className="font-medium">Assets → Refresh Prices</span> to backfill your existing holdings.
                New positions auto-enrich when added via ticker lookup.
              </p>
            </div>
          )}

          {/* By Position — always shown */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">By Position</p>
            <div className="space-y-2.5">
              {stockAssets
                .sort((a, b) => assetValue(b) - assetValue(a))
                .map((a) => (
                  <BarRow
                    key={a.id}
                    label={a.name}
                    value={assetValue(a)}
                    pct={(assetValue(a) / totalStocks) * 100}
                    color={sectorColor(a.sector)}
                    sub={[a.sector, a.geography === 'domestic' ? 'US' : a.geography === 'international' ? 'Intl' : a.geography === 'emerging' ? 'Emerging' : null]
                      .filter(Boolean).join(' · ') || undefined}
                  />
                ))}
            </div>
          </div>

          {/* Sector breakdown — shown when at least one position has sector data */}
          {sectors.some((s) => s.label !== 'Unknown') && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">By Sector</p>
              <div className="space-y-2.5">
                {sectors.map(({ label, value }) => (
                  <BarRow
                    key={label}
                    label={label}
                    value={value}
                    pct={(value / totalStocks) * 100}
                    color={sectorColor(label)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Geography breakdown — shown when at least one position has geography data */}
          {geos.some((g) => g.label !== 'Unknown') && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">By Geography</p>
              <div className="space-y-2.5">
                {geos.map(({ label, value }, i) => (
                  <BarRow
                    key={label}
                    label={label}
                    value={value}
                    pct={(value / totalStocks) * 100}
                    color={GEO_COLORS[i] ?? '#94a3b8'}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Market cap breakdown — shown when at least one position has cap data */}
          {caps.some((c) => c.label !== 'Unknown') && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">By Market Cap</p>
              <div className="space-y-2.5">
                {caps.map(({ label, value }) => (
                  <BarRow
                    key={label}
                    label={label}
                    value={value}
                    pct={(value / totalStocks) * 100}
                    color={CAP_COLORS[Object.entries(CAP_LABELS).find(([, v]) => v === label)?.[0] ?? ''] ?? '#6366f1'}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Real estate detail ────────────────────────────────────────────── */}
      {(() => {
        const reAssets = activeAssets.filter((a) => a.assetClass === 'real_estate');
        if (!reAssets.length) return null;
        const reTotal = reAssets.reduce((s, a) => s + assetValue(a), 0);
        const primary = reAssets.filter((a) => ['primary_residence', 'secondary_residence'].includes(a.assetType));
        const rental  = reAssets.filter((a) => !['primary_residence', 'secondary_residence'].includes(a.assetType));
        const primaryVal = primary.reduce((s, a) => s + assetValue(a), 0);
        const rentalVal  = rental.reduce((s, a) => s + assetValue(a), 0);
        return (
          <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="section-label">Real estate breakdown</h2>
              <span className="text-sm font-semibold text-gray-500">{fmt(reTotal)} · {fmtPct((reTotal / totalValue) * 100)}</span>
            </div>
            <div className="space-y-2.5">
              {primaryVal > 0 && (
                <BarRow label="Primary / secondary home" value={primaryVal} pct={(primaryVal / reTotal) * 100} color={PALETTE.primaryHome}
                  sub={primary.map((a) => a.name).join(', ')} />
              )}
              {rentalVal > 0 && (
                <BarRow label="Rental / commercial" value={rentalVal} pct={(rentalVal / reTotal) * 100} color={PALETTE.rentalRE}
                  sub={rental.map((a) => a.name).join(', ')} />
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Crypto detail ─────────────────────────────────────────────────── */}
      {(() => {
        const cryptoAssets = activeAssets.filter(isCrypto);
        if (!cryptoAssets.length) return null;
        const cryptoTotal = cryptoAssets.reduce((s, a) => s + assetValue(a), 0);
        return (
          <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="section-label">Crypto breakdown</h2>
              <span className="text-sm font-semibold text-gray-500">{fmt(cryptoTotal)} · {fmtPct((cryptoTotal / totalValue) * 100)}</span>
            </div>
            <div className="space-y-2.5">
              {cryptoAssets
                .sort((a, b) => assetValue(b) - assetValue(a))
                .map((a) => (
                  <BarRow
                    key={a.id}
                    label={a.name}
                    value={assetValue(a)}
                    pct={(assetValue(a) / cryptoTotal) * 100}
                    color={PALETTE.crypto}
                    sub={a.assetType === 'crypto' ? (a.name !== a.name ? undefined : undefined) : undefined}
                  />
                ))}
            </div>
          </div>
        );
      })()}

      {/* ── Position list — all assets ────────────────────────────────────── */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6">
        <h2 className="section-label mb-4">All positions</h2>
        <div className="space-y-1">
          {activeAssets
            .sort((a, b) => assetValue(b) - assetValue(a))
            .map((a) => {
              const v = assetValue(a);
              const pct = (v / totalValue) * 100;
              const tags: string[] = [];
              if (a.sector) tags.push(a.sector);
              if (a.geography) tags.push(a.geography === 'domestic' ? 'US' : a.geography === 'international' ? 'Intl' : 'Emerging');
              if (a.marketCapCategory) tags.push(a.marketCapCategory.replace('_cap', '').replace('_', ' ') + ' cap');
              return (
                <div key={a.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{a.name}</p>
                    {tags.length > 0 && (
                      <p className="text-xs text-gray-400">{tags.join(' · ')}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold tabular-nums text-gray-700">{fmt(v)}</p>
                    <p className="text-xs text-gray-400">{fmtPct(pct)}</p>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
