import { useEffect, useState, type FormEvent } from 'react';
import { api, getErrorMessage } from '@/api/client';
import Spinner from '@/components/Spinner';

interface Asset {
  id: string;
  name: string;
  assetClass: string;
  assetType: string;
  currentValue: number | null;
  estimatedValue: number | null;
  adjustedValue: number | null;
  ticker: string | null;
  isPretax: boolean;
  afterTaxValue?: number;
  accountLabel: string | null;
  isActive: boolean;
}

const fmt = (n: number | null) =>
  n != null
    ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    : '—';

const CLASS_LABELS: Record<string, string> = {
  equity: 'Equity',
  real_estate: 'Real estate',
  other: 'Other / cash',
  restricted: 'Restricted',
};

function displayValue(asset: Asset): number | null {
  if (asset.assetClass === 'real_estate') return asset.adjustedValue ?? asset.estimatedValue;
  return asset.currentValue;
}

export default function Assets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [assetClass, setAssetClass] = useState('equity');
  const [assetType, setAssetType] = useState('stock');
  const [currentValue, setCurrentValue] = useState('');
  const [ticker, setTicker] = useState('');
  const [isPretax, setIsPretax] = useState(false);
  const [accountLabel, setAccountLabel] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [monthlyPiti, setMonthlyPiti] = useState('');

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

  function resetForm() {
    setName(''); setAssetClass('equity'); setAssetType('stock');
    setCurrentValue(''); setTicker(''); setIsPretax(false);
    setAccountLabel(''); setEstimatedValue('');
    setPropertyAddress(''); setMonthlyRent(''); setMonthlyPiti('');
    setFormError('');
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { name, assetClass, assetType };
      if (assetClass === 'equity') {
        body.currentValue = Number(currentValue);
        if (ticker) body.ticker = ticker.toUpperCase();
        body.isPretax = isPretax;
        if (accountLabel) body.accountLabel = accountLabel;
      } else if (assetClass === 'real_estate') {
        body.estimatedValue = Number(estimatedValue);
        if (propertyAddress) body.propertyAddress = propertyAddress;
        if (monthlyRent) body.monthlyRent = Number(monthlyRent);
        if (monthlyPiti) body.monthlyPiti = Number(monthlyPiti);
      } else {
        body.currentValue = Number(currentValue);
      }
      await api.post('/assets', body);
      resetForm();
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this asset?')) return;
    try {
      await api.delete(`/assets/${id}`);
      load();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Spinner className="h-8 w-8" /></div>;
  }

  const grouped = Object.entries(CLASS_LABELS).map(([cls, label]) => ({
    cls, label,
    items: assets.filter((a) => a.assetClass === cls),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
          <p className="mt-1 text-sm text-gray-500">Track everything you own.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Add asset</button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Asset groups */}
      {grouped.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 text-sm">No assets yet. Add your first one.</p>
        </div>
      ) : (
        grouped.map(({ cls, label, items }) => (
          <div key={cls} className="card">
            <h2 className="mb-4 text-sm font-semibold text-gray-900 uppercase tracking-wide">{label}</h2>
            <div className="divide-y divide-gray-100">
              {items.map((asset) => (
                <div key={asset.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {asset.name}
                      {asset.ticker && <span className="ml-2 text-xs text-gray-400">{asset.ticker}</span>}
                      {asset.isPretax && (
                        <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                          Pre-tax
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">{asset.assetType.replace('_', ' ')}</p>
                    {asset.isPretax && asset.afterTaxValue != null && (
                      <p className="text-xs text-gray-400">After-tax: {fmt(asset.afterTaxValue)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-gray-900">{fmt(displayValue(asset))}</span>
                    <button
                      onClick={() => handleDelete(asset.id)}
                      className="text-xs text-gray-400 hover:text-red-600 transition"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Add asset slide-in */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Add asset</h2>
              <button onClick={() => { resetForm(); setShowForm(false); }} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>

            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="label">Name</label>
                <input required className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Vanguard brokerage" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Asset class</label>
                  <select className="input" value={assetClass} onChange={(e) => setAssetClass(e.target.value)}>
                    <option value="equity">Equity</option>
                    <option value="real_estate">Real estate</option>
                    <option value="other">Other / cash</option>
                    <option value="restricted">Restricted</option>
                  </select>
                </div>
                <div>
                  <label className="label">Type</label>
                  <select className="input" value={assetType} onChange={(e) => setAssetType(e.target.value)}>
                    {assetClass === 'equity' && <>
                      <option value="stock">Stock</option>
                      <option value="etf">ETF</option>
                      <option value="mutual_fund">Mutual fund</option>
                      <option value="brokerage">Brokerage</option>
                      <option value="retirement_401k">401(k)</option>
                      <option value="retirement_ira">IRA</option>
                    </>}
                    {assetClass === 'real_estate' && <>
                      <option value="primary_residence">Primary residence</option>
                      <option value="rental">Rental property</option>
                      <option value="commercial">Commercial</option>
                    </>}
                    {(assetClass === 'other' || assetClass === 'restricted') && <>
                      <option value="cash">Cash</option>
                      <option value="whole_life">Whole life insurance</option>
                      <option value="business_equity">Business equity</option>
                      <option value="other">Other</option>
                    </>}
                  </select>
                </div>
              </div>

              {assetClass === 'equity' && (
                <>
                  <div>
                    <label className="label">Current value ($)</label>
                    <input required type="number" min={0} className="input" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Ticker (optional)</label>
                      <input className="input" value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="VTSAX" />
                    </div>
                    <div>
                      <label className="label">Account label</label>
                      <input className="input" value={accountLabel} onChange={(e) => setAccountLabel(e.target.value)} placeholder="Fidelity IRA" />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={isPretax} onChange={(e) => setIsPretax(e.target.checked)} className="rounded" />
                    Pre-tax account (401k, traditional IRA)
                  </label>
                </>
              )}

              {assetClass === 'real_estate' && (
                <>
                  <div>
                    <label className="label">Estimated value ($)</label>
                    <input required type="number" min={0} className="input" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Property address (optional)</label>
                    <input className="input" value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Monthly rent ($)</label>
                      <input type="number" min={0} className="input" value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Monthly PITI ($)</label>
                      <input type="number" min={0} className="input" value={monthlyPiti} onChange={(e) => setMonthlyPiti(e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              {(assetClass === 'other' || assetClass === 'restricted') && (
                <div>
                  <label className="label">Current value ($)</label>
                  <input required type="number" min={0} className="input" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} />
                </div>
              )}

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { resetForm(); setShowForm(false); }} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1">
                  {submitting ? <Spinner className="h-4 w-4" /> : 'Add asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
