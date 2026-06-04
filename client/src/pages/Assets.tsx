import { useEffect, useState } from 'react';
import { RefreshCw, Plus, Upload, ChevronDown } from 'lucide-react';
import { api, getErrorMessage } from '@/api/client';
import Spinner from '@/components/Spinner';
import AddAssetModal from '@/components/assets/AddAssetModal';
import EditPositionModal, { type EditableAsset } from '@/components/assets/EditPositionModal';
import EditAssetModal, { type EditableNonEquityAsset } from '@/components/assets/EditAssetModal';
import CsvImportModal from '@/components/assets/CsvImportModal';

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
  costBasisPerShare: number | null;
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

/** Whole-dollar format: $1,234  (no cents) — used for totals / summaries */
const fmt = (n: number | null | undefined) =>
  n != null
    ? Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    : '—';

/** Full currency format: $1,234.56  — used for individual position values */
const fmtMoney = (n: number | null | undefined) =>
  n != null
    ? Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—';

/** Format share/unit quantities — show enough decimals for crypto fractions */
function fmtShares(n: number | null | undefined): string {
  if (n == null) return '—';
  const num = Number(n);
  if (num === 0) return '0';
  // For very small numbers (< 0.001) show up to 9 decimal places
  if (Math.abs(num) < 0.001) return num.toLocaleString('en-US', { maximumFractionDigits: 9 });
  // For small numbers (< 1) show up to 6 decimal places
  if (Math.abs(num) < 1) return num.toLocaleString('en-US', { maximumFractionDigits: 6 });
  // For normal numbers show up to 4 decimal places
  return num.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

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

function AssetRow({ asset, onDelete, onRefresh, onEdit }: {
  asset: Asset;
  onDelete: (id: string) => void;
  onRefresh: (id: string) => void;
  onEdit: (asset: Asset) => void;
}) {
  const displayVal = getDisplayValue(asset);
  const equity = getEquity(asset);
  const monthlyCF = calcMonthlyCashFlow(asset);
  const isAuto = asset.currentValueSource === 'ticker_api';
  const cfColor = monthlyCF != null ? (monthlyCF >= 0 ? 'text-emerald-600' : 'text-red-500') : '';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-4 border-t border-gray-100 first:border-0 hover:bg-gray-50 -mx-6 px-6 transition-colors duration-150">
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
            <span>{fmtShares(asset.sharesHeld)} shares</span>
          )}

          {equity != null && (
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              Equity {fmtMoney(equity)}
            </span>
          )}

          {monthlyCF != null && (
            <span className={`font-medium ${cfColor}`}>
              {monthlyCF >= 0 ? '+' : ''}{fmtMoney(monthlyCF)}/mo cash flow
            </span>
          )}

          {asset.isPretax && asset.afterTaxValue != null && (
            <span>After-tax est: {fmtMoney(asset.afterTaxValue)}</span>
          )}

          {asset.ownershipPercent != null && (
            <span>{fmtPct(Number(asset.ownershipPercent))} ownership</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 sm:flex-shrink-0">
        <div className="text-right">
          <p className="text-sm font-bold text-gray-900">{fmtMoney(displayVal)}</p>
          {asset.currentValueUpdatedAt && isAuto && (
            <p className="text-[10px] text-gray-400">
              {new Date(asset.currentValueUpdatedAt).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(asset)}
            className="text-[11px] text-gray-400 hover:text-brand-600 transition"
            title="Edit asset"
          >
            ✎
          </button>
          {asset.ticker && (
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
            className="text-xs text-gray-300 hover:text-red-400 transition-colors"
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
  const groups = Array.from(map.values());
  // Sort positions within each account largest → smallest
  for (const grp of groups) {
    grp.positions.sort((a, b) => (Number(b.currentValue) || 0) - (Number(a.currentValue) || 0));
  }
  return groups;
}

// ─── Account order helpers ────────────────────────────────────────────────────

const ACCOUNT_ORDER_KEY = 'lo_account_order';

function loadAccountOrder(): string[] {
  try { return JSON.parse(localStorage.getItem(ACCOUNT_ORDER_KEY) ?? '[]'); }
  catch { return []; }
}

function applyAccountOrder(accounts: EquityAccountGroup[], order: string[]): EquityAccountGroup[] {
  if (!order.length) return accounts;
  return [...accounts].sort((a, b) => {
    const ai = order.indexOf(a.label);
    const bi = order.indexOf(b.label);
    // New accounts (not yet in saved order) float to the bottom
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

// ─── Equity position row (within an account) ──────────────────────────────────

function PositionRow({ asset, onDelete, onRefresh, onEdit }: {
  asset: Asset;
  onDelete: (id: string) => void;
  onRefresh: (id: string) => void;
  onEdit: (asset: Asset) => void;
}) {
  const isAuto = asset.currentValueSource === 'ticker_api';
  const isCash = asset.currentValueSource === 'manual' && !asset.sharesHeld;

  // Gain / loss — only when we have cost basis and shares
  const costBasis =
    asset.costBasisPerShare != null && asset.sharesHeld != null && !isCash
      ? Number(asset.costBasisPerShare) * Number(asset.sharesHeld)
      : null;
  const gainLoss = costBasis != null ? Number(asset.currentValue) - costBasis : null;
  const gainLossPct = gainLoss != null && costBasis && costBasis !== 0
    ? (gainLoss / costBasis) * 100
    : null;

  return (
    <div className="flex items-start gap-3 py-3 px-0 border-t border-gray-50 first:border-0 hover:bg-gray-50 -mx-5 px-5 transition-colors duration-150">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-900 truncate">{asset.name}</p>
          {/* Only show ticker badge when the name doesn't already contain the ticker (avoids "XOP XOP") */}
          {asset.ticker && !isCash &&
            !asset.name.toUpperCase().includes(asset.ticker.toUpperCase()) && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-mono font-medium text-gray-500">
              {asset.ticker}
            </span>
          )}
          {isCash && (
            <span className="rounded-full bg-green-50 border border-green-200 px-1.5 py-0.5 text-xs font-medium text-green-700">Cash</span>
          )}
          {isAuto && (
            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-600">Auto</span>
          )}
        </div>

        {/* Shares row */}
        {asset.sharesHeld != null && (
          <p className="text-xs text-gray-400 mt-0.5">
            {fmtShares(asset.sharesHeld)} shares
            {asset.currentValueUpdatedAt && isAuto && (
              <span className="ml-2">· {new Date(asset.currentValueUpdatedAt).toLocaleDateString()}</span>
            )}
          </p>
        )}

        {/* Gain / loss badge */}
        {gainLoss != null && gainLossPct != null && (
          <p className={`text-xs font-semibold mt-0.5 ${gainLoss >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {gainLoss >= 0 ? '▲' : '▼'}{' '}
            {fmtMoney(Math.abs(gainLoss))}
            {' '}
            <span className="font-normal opacity-75">({Math.abs(gainLossPct).toFixed(1)}%)</span>
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0 pt-0.5">
        <p className="text-sm font-semibold text-gray-900">{fmtMoney(asset.currentValue)}</p>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onEdit(asset)}
            className="text-[11px] text-gray-400 hover:text-brand-600 transition"
            title="Edit position"
          >
            ✎
          </button>
          {asset.ticker && (
            <button onClick={() => onRefresh(asset.id)} className="text-[11px] text-brand-600 hover:underline">
              Refresh
            </button>
          )}
          <button onClick={() => onDelete(asset.id)} className="text-xs text-gray-300 hover:text-red-400 transition-colors">
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
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingAsset, setEditingAsset] = useState<EditableAsset | null>(null);
  const [editingNonEquity, setEditingNonEquity] = useState<EditableNonEquityAsset | null>(null);
  // Persisted account display order (largest-first by default; user can reorder)
  const [accountOrder, setAccountOrder] = useState<string[]>(loadAccountOrder);

  // Expand / collapse state — persisted to localStorage
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => {
    try { return new Set<string>(JSON.parse(localStorage.getItem('lo_collapsed_sections') ?? '[]')); }
    catch { return new Set<string>(); }
  });
  const [collapsedAccounts, setCollapsedAccounts] = useState<Set<string>>(() => {
    try { return new Set<string>(JSON.parse(localStorage.getItem('lo_collapsed_accounts') ?? '[]')); }
    catch { return new Set<string>(); }
  });

  function toggleSection(key: string) {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      localStorage.setItem('lo_collapsed_sections', JSON.stringify([...next]));
      return next;
    });
  }

  function toggleAccount(label: string) {
    setCollapsedAccounts(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      localStorage.setItem('lo_collapsed_accounts', JSON.stringify([...next]));
      return next;
    });
  }

  function moveAccount(label: string, dir: 'up' | 'down', sortedAccounts: EquityAccountGroup[]) {
    const labels = sortedAccounts.map(a => a.label);
    const idx = labels.indexOf(label);
    if (dir === 'up' && idx > 0) [labels[idx - 1], labels[idx]] = [labels[idx], labels[idx - 1]];
    if (dir === 'down' && idx < labels.length - 1) [labels[idx], labels[idx + 1]] = [labels[idx + 1], labels[idx]];
    setAccountOrder(labels);
    localStorage.setItem(ACCOUNT_ORDER_KEY, JSON.stringify(labels));
  }

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
      const { data } = await api.get(`/assets/ticker/${asset.ticker}?assetType=${asset.assetType}`);
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Assets</h1>
          <p className="mt-1 text-sm text-gray-500">
            {assets.length === 0
              ? 'Add your first asset to start tracking net worth.'
              : `${assets.length} asset${assets.length !== 1 ? 's' : ''} tracked across all classes`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasEquity && (
            <button
              onClick={handleRefreshAll}
              disabled={refreshing}
              className="btn-secondary hidden sm:inline-flex"
            >
              {refreshing ? <Spinner className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
              Refresh prices
            </button>
          )}
          <button
            onClick={() => setShowCsvImport(true)}
            className="btn-secondary hidden sm:inline-flex"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add asset</span>
          </button>
        </div>
      </div>

      {/* Net worth summary card */}
      {assets.length > 0 && (
        <div className="rounded-xl bg-white shadow-md border border-gray-100 px-6 py-5">
          <p className="section-label mb-2">Total net worth</p>
          <p className={`text-3xl font-bold tabular font-mono tracking-tight ${totalNetWorth >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
            {fmt(totalNetWorth)}
          </p>
          {totalNetWorth > 0 && (
            <p className="mt-1 text-xs font-medium text-green-600">↑ positive net worth</p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Asset groups */}
      {grouped.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center shadow-sm">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-base font-semibold text-gray-700">No assets yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-5">Add your first asset to start tracking net worth.</p>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus className="h-4 w-4" />
            Add your first asset
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
            const rawAccounts = groupEquityByAccount(items);
            const defaultSorted = accountOrder.length
              ? rawAccounts
              : [...rawAccounts].sort((a, b) => b.totalValue - a.totalValue);
            const accounts = applyAccountOrder(defaultSorted, accountOrder);
            const sectionCollapsed = collapsedSections.has(cls);
            return (
              <div key={cls} className="space-y-3">
                {/* Section header — clickable to collapse */}
                <button
                  onClick={() => toggleSection(cls)}
                  className="w-full flex items-center justify-between px-1 pb-1 text-left group"
                >
                  <h2 className="section-label flex items-center gap-2 mb-0">
                    <span>{emoji}</span>
                    {label}
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 group-hover:text-gray-600 ${sectionCollapsed ? '-rotate-90' : ''}`} />
                  </h2>
                  <span className="text-sm font-bold tabular font-mono text-gray-700">{fmt(groupTotal)}</span>
                </button>

                {/* Account cards */}
                {!sectionCollapsed && accounts.map((acct, idx) => {
                  const accountCollapsed = collapsedAccounts.has(acct.label);
                  return (
                    <div key={acct.label} className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                      {/* Account header */}
                      <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          {/* Up / down reorder buttons */}
                          {accounts.length > 1 && (
                            <div className="flex flex-col gap-0 mr-0.5">
                              <button
                                onClick={() => moveAccount(acct.label, 'up', accounts)}
                                disabled={idx === 0}
                                className="text-gray-300 hover:text-gray-600 disabled:opacity-0 leading-none transition text-[10px] px-0.5"
                                title="Move account up"
                              >▲</button>
                              <button
                                onClick={() => moveAccount(acct.label, 'down', accounts)}
                                disabled={idx === accounts.length - 1}
                                className="text-gray-300 hover:text-gray-600 disabled:opacity-0 leading-none transition text-[10px] px-0.5"
                                title="Move account down"
                              >▼</button>
                            </div>
                          )}
                          {/* Account label — clicking toggles collapse */}
                          <button
                            onClick={() => toggleAccount(acct.label)}
                            className="flex items-center gap-1.5 text-left group/acct"
                          >
                            <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 group-hover/acct:text-gray-600 ${accountCollapsed ? '-rotate-90' : ''}`} />
                            <p className="text-sm font-bold text-gray-900">{acct.label}</p>
                          </button>
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
                      {/* Positions — hidden when account is collapsed */}
                      {!accountCollapsed && (
                        <div className="px-5">
                          {acct.positions.map(asset => (
                            <PositionRow
                              key={asset.id}
                              asset={asset}
                              onDelete={handleDelete}
                              onRefresh={handleRefreshOne}
                              onEdit={setEditingAsset}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          }

          // ── Non-equity: flat list ────────────────────────────────────────
          const sectionCollapsed = collapsedSections.has(cls);
          return (
            <div key={cls} className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              {/* Section header — full row is clickable */}
              <button
                onClick={() => toggleSection(cls)}
                className="w-full flex items-center justify-between px-6 py-4 bg-gray-50/60 text-left group"
                style={{ borderBottom: sectionCollapsed ? 'none' : undefined }}
              >
                <h2 className="section-label flex items-center gap-2 mb-0">
                  <span>{emoji}</span>
                  {label}
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 group-hover:text-gray-600 ${sectionCollapsed ? '-rotate-90' : ''}`} />
                </h2>
                <span className="text-sm font-bold tabular font-mono text-gray-700">{fmt(groupTotal)}</span>
              </button>
              {!sectionCollapsed && (
                <div className="px-6 border-t border-gray-100">
                  {items.map(asset => (
                    <AssetRow
                      key={asset.id}
                      asset={asset}
                      onDelete={handleDelete}
                      onRefresh={handleRefreshOne}
                      onEdit={setEditingNonEquity}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* CSV import modal */}
      {showCsvImport && (
        <CsvImportModal
          onClose={() => setShowCsvImport(false)}
          onImported={load}
        />
      )}

      {/* Add modal */}
      {showModal && (
        <AddAssetModal
          onClose={() => setShowModal(false)}
          onAdded={load}
        />
      )}

      {/* Edit equity position modal */}
      {editingAsset && (
        <EditPositionModal
          asset={editingAsset}
          onClose={() => setEditingAsset(null)}
          onSaved={load}
        />
      )}

      {/* Edit non-equity asset modal (real estate, cash, business, other) */}
      {editingNonEquity && (
        <EditAssetModal
          asset={editingNonEquity}
          onClose={() => setEditingNonEquity(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
