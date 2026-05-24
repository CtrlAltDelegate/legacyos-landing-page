import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '@/api/client';
import Spinner from '@/components/Spinner';
import AddAssetModal from '@/components/assets/AddAssetModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Asset {
  id: string;
  name: string;
  assetClass: string;
  assetType: string;
  currentValue: number | null;
  estimatedValue: number | null;
  adjustedValue: number | null;
  ticker: string | null;
  sharesHeld: number | null;
  isPretax: boolean;
  afterTaxValue?: number;
  accountLabel: string | null;
  currentValueSource: string;
  currentValueUpdatedAt: string | null;
  // Real estate
  mortgageBalance: number | null;
  monthlyRent: number | null;
  monthlyPiti: number | null;
  monthlyInsurance: number | null;
  monthlyHoa: number | null;
  managementFeePercent: number | null;
  maintenanceReserveMonthly: number | null;
  capexReserveMonthly: number | null;
  vacancyRatePercent: number | null;
  // Business
  ownershipPercent: number | null;
  isActive: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number | null | undefined) =>
  n != null
    ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    : '—';

const fmtPct = (n: number) => `${n.toFixed(1)}%`;

function getDisplayValue(asset: Asset): number | null {
  if (asset.assetClass === 'real_estate') {
    return asset.adjustedValue ?? asset.estimatedValue;
  }
  return asset.currentValue;
}

function getEquity(asset: Asset): number | null {
  if (asset.assetClass !== 'real_estate') return null;
  const val = asset.adjustedValue ?? asset.estimatedValue;
  if (val == null) return null;
  return val - (asset.mortgageBalance ?? 0);
}

function calcMonthlyCashFlow(asset: Asset): number | null {
  if (asset.assetType !== 'rental' || !asset.monthlyRent) return null;
  const rent = asset.monthlyRent;
  const vacancyLoss = rent * ((asset.vacancyRatePercent ?? 5) / 100);
  const mgmt = (asset.managementFeePercent ?? 0) > 0
    ? (rent - vacancyLoss) * ((asset.managementFeePercent!) / 100)
    : 0;
  const expenses =
    (asset.monthlyPiti ?? 0) +
    mgmt + vacancyLoss +
    (asset.monthlyInsurance ?? 0) +
    (asset.monthlyHoa ?? 0) +
    (asset.maintenanceReserveMonthly ?? 0) +
    (asset.capexReserveMonthly ?? 0);
  return rent - expenses;
}

// ─── Asset row ────────────────────────────────────────────────────────────────

function AssetRow({ asset, onDelete, onRefresh }: {
  asset: Asset;
  onDelete: (id: string) => void;
  onRefresh: (id: string) => void;
}) {
  const displayVal = getDisplayValue(asset);
  const equity = getEquity(asset);
  const monthlyCF = calcMonthlyCashFlow(asset);
  const isAuto = asset.currentValueSource === 'ticker_api';
  const cfColor = monthlyCF != null ? (monthlyCF >= 0 ? 'text-emerald-600' : 'text-red-500') : '';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-4 border-t border-gray-100 first:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 truncate">{asset.name}</p>
          {asset.ticker && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-mono font-medium text-gray-500">
              {asset.ticker}
            </span>
          )}
          {asset.isPretax && (
            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">Pre-tax</span>
          )}
          {isAuto && (
            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-600">Auto-updated</span>
          )}
        </div>

        {/* Sub-details */}
        <div className="mt-0.5 flex items-center gap-3 flex-wrap text-xs text-gray-400">
          <span className="capitalize">{asset.assetType.replace(/_/g, ' ')}</span>

          {asset.sharesHeld != null && (
            <span>{Number(asset.sharesHeld).toLocaleString()} shares</span>
          )}

          {equity != null && (
            <span className="text-blue-600 font-medium">Equity: {fmt(equity)}</span>
          )}

          {monthlyCF != null && (
            <span className={`font-medium ${cfColor}`}>
              {monthlyCF >= 0 ? '+' : ''}{fmt(monthlyCF)}/mo cash flow
            </span>
          )}

          {asset.isPretax && asset.afterTaxValue != null && (
            <span>After-tax est: {fmt(asset.afterTaxValue)}</span>
          )}

          {asset.ownershipPercent != null && (
            <span>{fmtPct(Number(asset.ownershipPercent))} ownership</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 sm:flex-shrink-0">
        <div className="text-right">
          <p className="text-sm font-bold text-gray-900">{fmt(displayVal)}</p>
          {asset.currentValueUpdatedAt && isAuto && (
            <p className="text-[10px] text-gray-400">
              {new Date(asset.currentValueUpdatedAt).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {asset.ticker && !isAuto && (
            <button
              onClick={() => onRefresh(asset.id)}
              className="text-[11px] text-brand-600 hover:underline"
              title="Refresh price from market data"
            >
              Refresh
            </button>
          )}
          <button
            onClick={() => onDelete(asset.id)}
            className="text-xs text-gray-400 hover:text-red-500 transition"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Equity account grouping ──────────────────────────────────────────────────

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  stock:           'Brokerage',
  retirement_ira:  'IRA / Roth IRA',
  retirement_401k: '401(k)',
  crypto:          'Crypto',
};

interface EquityAccountGroup {
  label: string;
  assetType: string;
  isPretax: boolean;
  totalValue: number;
  positions: Asset[];
}

function groupEquityByAccount(equityAssets: Asset[]): EquityAccountGroup[] {
  const map = new Map<string, EquityAccountGroup>();
  for (const a of equityAssets) {
    const key = a.accountLabel ?? a.name;
    if (!map.has(key)) {
      map.set(key, {
        label: key,
        assetType: a.assetType,
        isPretax: a.isPretax,
        totalValue: 0,
        positions: [],
      });
    }
    const grp = map.get(key)!;
    grp.totalValue += Number(a.currentValue) || 0;
    grp.positions.push(a);
  }
  return Array.from(map.values());
}

// ─── Equity position row (within an account) ──────────────────────────────────

function PositionRow({ asset, onDelete, onRefresh }: {
  asset: Asset;
  onDelete: (id: string) => void;
  onRefresh: (id: string) => void;
}) {
  const isAuto = asset.currentValueSource === 'ticker_api';
  return (
    <div className="flex items-center gap-3 py-2.5 border-t border-gray-50 first:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-900 truncate">{asset.name}</p>
          {asset.ticker && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-mono font-medium text-gray-500">
              {asset.ticker}
            </span>
          )}
          {isAuto && (
            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-600">Auto</span>
          )}
        </div>
        {asset.sharesHeld != null && (
          <p className="text-xs text-gray-400 mt-0.5">
            {Number(asset.sharesHeld).toLocaleString()} shares
            {asset.currentValueUpdatedAt && isAuto && (
              <span className="ml-2">· {new Date(asset.currentValueUpdatedAt).toLocaleDateString()}</span>
            )}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <p className="text-sm font-semibold text-gray-900">{fmt(asset.currentValue)}</p>
        <div className="flex items-center gap-1.5">
          {asset.ticker && !isAuto && (
            <button onClick={() => onRefresh(asset.id)} className="text-[11px] text-brand-600 hover:underline">
              Refresh
            </button>
          )}
          <button onClick={() => onDelete(asset.id)} className="text-xs text-gray-300 hover:text-red-500 transition">
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Group header ─────────────────────────────────────────────────────────────

const GROUP_CONFIG: Record<string, { label: string; emoji: string }> = {
  equity:      { label: 'Equities & Crypto',     emoji: '📈' },
  real_estate: { label: 'Real Estate',            emoji: '🏠' },
  other:       { label: 'Cash, Business & Other', emoji: '💵' },
  restricted:  { label: 'Restricted',             emoji: '🔒' },
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Assets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/assets');
      setAssets(data.assets);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this asset? The history will be preserved.')) return;
    try {
      await api.delete(`/assets/${id}`);
      load();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  }

  async function handleRefreshAll() {
    setRefreshing(true);
    try {
      const { data } = await api.post('/assets/refresh-prices');
      alert(`Updated ${data.updated} asset(s) with current market prices.`);
      load();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setRefreshing(false);
    }
  }

  async function handleRefreshOne(assetId: string) {
    const asset = assets.find(a => a.id === assetId);
    if (!asset?.ticker) return;
    try {
      const { data } = await api.get(`/assets/ticker/${asset.ticker}`);
      const newValue = parseFloat((data.price * Number(asset.sharesHeld ?? 0)).toFixed(2));
      await api.put(`/assets/${assetId}`, { currentValue: newValue });
      load();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Spinner className="h-8 w-8" /></div>;
  }

  const hasEquity = assets.some(a => a.assetClass === 'equity' && a.ticker);
  const totalNetWorth = assets.reduce((sum, a) => {
    if (a.assetClass === 'real_estate') {
      const val = (a.adjustedValue ?? a.estimatedValue ?? 0) - (a.mortgageBalance ?? 0);
      return sum + val;
    }
    return sum + (Number(a.currentValue) || 0);
  }, 0);

  const grouped = Object.entries(GROUP_CONFIG)
    .map(([cls, meta]) => ({
      cls, ...meta,
      items: assets.filter(a => a.assetClass === cls),
    }))
    .filter(g => g.items.length > 0);

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {assets.length === 0
              ? 'Add your first asset to start tracking net worth.'
              : `${assets.length} asset${assets.length !== 1 ? 's' : ''} · Total: ${fmt(totalNetWorth)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasEquity && (
            <button
              onClick={handleRefreshAll}
              disabled={refreshing}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
            >
              {refreshing ? <Spinner className="h-4 w-4" /> : '↻ Refresh prices'}
            </button>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition"
          >
            + Add asset
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Asset groups */}
      {grouped.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <p className="text-3xl mb-3">📊</p>
          <p className="text-gray-600 font-semibold">No assets yet</p>
          <p className="text-sm text-gray-400 mt-1">Add your first asset to see your net worth.</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition"
          >
            + Add your first asset
          </button>
        </div>
      ) : (
        grouped.map(({ cls, label, emoji, items }) => {
          const groupTotal = items.reduce((sum, a) => {
            if (a.assetClass === 'real_estate') {
              return sum + Math.max(0, ((a.adjustedValue ?? a.estimatedValue ?? 0) - (a.mortgageBalance ?? 0)));
            }
            return sum + (Number(a.currentValue) || 0);
          }, 0);

          // ── Equity: render grouped by account ───────────────────────────
          if (cls === 'equity') {
            const accounts = groupEquityByAccount(items);
            return (
              <div key={cls} className="space-y-3">
                {/* Section header */}
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <span>{emoji}</span> {label}
                  </h2>
                  <span className="text-sm font-semibold text-gray-500">{fmt(groupTotal)}</span>
                </div>
                {/* Account cards */}
                {accounts.map(acct => (
                  <div key={acct.label} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                    {/* Account header */}
                    <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-900">{acct.label}</p>
                        <span className="rounded-full bg-white border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                          {ACCOUNT_TYPE_LABELS[acct.assetType] ?? acct.assetType}
                        </span>
                        {acct.isPretax && (
                          <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-700">Pre-tax</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-900">{fmt(acct.totalValue)}</span>
                        <button
                          onClick={() => setShowModal(true)}
                          className="text-[11px] font-semibold text-brand-600 hover:underline"
                          title="Add position to this account"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                    {/* Positions */}
                    <div className="px-5">
                      {acct.positions.map(asset => (
                        <PositionRow
                          key={asset.id}
                          asset={asset}
                          onDelete={handleDelete}
                          onRefresh={handleRefreshOne}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          }

          // ── Non-equity: flat list ────────────────────────────────────────
          return (
            <div key={cls} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span>{emoji}</span> {label}
                </h2>
                <span className="text-sm font-semibold text-gray-500">{fmt(groupTotal)}</span>
              </div>
              <div className="px-6">
                {items.map(asset => (
                  <AssetRow
                    key={asset.id}
                    asset={asset}
                    onDelete={handleDelete}
                    onRefresh={handleRefreshOne}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Add modal */}
      {showModal && (
        <AddAssetModal
          onClose={() => setShowModal(false)}
          onAdded={load}
        />
      )}
    </div>
  );
}
