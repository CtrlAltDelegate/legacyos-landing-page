import { useState, useEffect, FormEvent } from 'react';
import api from '../services/api';

type Tab = 'equities' | 'real_estate' | 'other' | 'restricted';

interface Equity {
  id: string; ticker: string; name?: string; shares: number;
  cost_basis?: number; current_price?: number; account_type?: string;
}
interface RealEstate {
  id: string; address: string; property_type?: string;
  estimated_value: number; adjusted_value?: number; mortgage_balance?: number;
  adjustment_percent?: number; equity?: number;
}
interface OtherAsset {
  id: string; name: string; category?: string; current_value: number; valuation_method?: string;
}
interface RestrictedAsset {
  id: string; name: string; category?: string; estimated_value?: number;
  vest_date?: string; probability?: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export default function Assets() {
  const [tab, setTab] = useState<Tab>('equities');
  const [equities, setEquities] = useState<Equity[]>([]);
  const [realEstate, setRealEstate] = useState<RealEstate[]>([]);
  const [other, setOther] = useState<OtherAsset[]>([]);
  const [restricted, setRestricted] = useState<RestrictedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Equity form
  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('');
  const [costBasis, setCostBasis] = useState('');
  const [accountType, setAccountType] = useState('taxable');

  // Real estate form
  const [address, setAddress] = useState('');
  const [propType, setPropType] = useState('primary_residence');
  const [estValue, setEstValue] = useState('');
  const [mortgageBalance, setMortgageBalance] = useState('');
  const [reValuationNote, setReValuationNote] = useState(false);

  // Other asset form
  const [assetName, setAssetName] = useState('');
  const [assetCategory, setAssetCategory] = useState('business_equity');
  const [assetValue, setAssetValue] = useState('');
  const [valuationMethod, setValuationMethod] = useState('');
  const [businessEquityPrompt, setBusinessEquityPrompt] = useState(false);

  // Restricted form
  const [rName, setRName] = useState('');
  const [rCategory, setRCategory] = useState('unvested_equity');
  const [rValue, setRValue] = useState('');
  const [rVestDate, setRVestDate] = useState('');
  const [rProbability, setRProbability] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await api.get('/assets/all');
      setEquities(res.data.equities || []);
      setRealEstate(res.data.real_estate || []);
      setOther(res.data.other_assets || []);
      setRestricted(res.data.restricted_assets || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleDelete = async (type: Tab, id: string) => {
    if (!confirm('Remove this asset?')) return;
    await api.delete(`/assets/${type}/${id}`);
    fetchAll();
  };

  const handleEquitySubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/assets/equities', { ticker: ticker.toUpperCase(), shares: parseFloat(shares), cost_basis: costBasis ? parseFloat(costBasis) : undefined, account_type: accountType });
      setShowForm(false); setTicker(''); setShares(''); setCostBasis('');
      fetchAll();
    } finally { setSaving(false); }
  };

  const handleRESubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const val = parseFloat(estValue);
    const adjusted = Math.round(val * 0.91);
    try {
      await api.post('/assets/real_estate', { address, property_type: propType, estimated_value: val, adjusted_value: adjusted, mortgage_balance: mortgageBalance ? parseFloat(mortgageBalance) : 0 });
      setShowForm(false); setAddress(''); setEstValue(''); setMortgageBalance(''); setReValuationNote(false);
      fetchAll();
    } finally { setSaving(false); }
  };

  const handleOtherSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/assets/other', { name: assetName, category: assetCategory, current_value: parseFloat(assetValue), valuation_method: valuationMethod || undefined });
      setShowForm(false); setAssetName(''); setAssetValue(''); setValuationMethod(''); setBusinessEquityPrompt(false);
      fetchAll();
    } finally { setSaving(false); }
  };

  const handleRestrictedSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/assets/restricted', { name: rName, category: rCategory, estimated_value: rValue ? parseFloat(rValue) : undefined, vest_date: rVestDate || undefined, probability: rProbability ? parseFloat(rProbability) : undefined });
      setShowForm(false); setRName(''); setRValue(''); setRVestDate(''); setRProbability('');
      fetchAll();
    } finally { setSaving(false); }
  };

  const tabs: { id: Tab; label: string; badge?: string }[] = [
    { id: 'equities', label: 'Equities' },
    { id: 'real_estate', label: 'Real Estate' },
    { id: 'other', label: 'Other Assets' },
    { id: 'restricted', label: 'Restricted', badge: 'Not in NW' },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium text-ink">Assets</h1>
          <p className="text-sm text-muted mt-0.5">Track your complete financial picture</p>
        </div>
        <button
          onClick={() => setShowForm(f => !f)}
          className="px-4 py-2 bg-ink text-white text-sm font-medium rounded-lg hover:bg-ink/80 transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add asset'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-white border border-black/10 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setShowForm(false); }}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5 ${tab === t.id ? 'bg-ink text-white font-medium' : 'text-muted hover:text-ink'}`}
          >
            {t.label}
            {t.badge && <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* Restricted note */}
      {tab === 'restricted' && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-400/40 rounded-xl text-sm text-amber-700">
          Restricted assets (unvested equity, pending inheritance, etc.) are tracked here for awareness but are <strong>never counted in your net worth</strong>.
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="mb-4 bg-white border border-black/10 rounded-xl p-5">
          <div className="text-sm font-medium text-ink mb-4">
            Add {tab === 'equities' ? 'equity' : tab === 'real_estate' ? 'real estate' : tab === 'other' ? 'other asset' : 'restricted asset'}
          </div>

          {tab === 'equities' && (
            <form onSubmit={handleEquitySubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Ticker symbol</label>
                  <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} required placeholder="AAPL" className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg bg-canvas focus:outline-none focus:ring-2 focus:ring-flo-600/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Shares</label>
                  <input type="number" step="any" value={shares} onChange={e => setShares(e.target.value)} required placeholder="100" className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg bg-canvas focus:outline-none focus:ring-2 focus:ring-flo-600/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Cost basis per share (optional)</label>
                  <input type="number" step="any" value={costBasis} onChange={e => setCostBasis(e.target.value)} placeholder="150.00" className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg bg-canvas focus:outline-none focus:ring-2 focus:ring-flo-600/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Account type</label>
                  <select value={accountType} onChange={e => setAccountType(e.target.value)} className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg bg-canvas focus:outline-none focus:ring-2 focus:ring-flo-600/30">
                    <option value="taxable">Taxable</option>
                    <option value="ira">IRA</option>
                    <option value="roth_ira">Roth IRA</option>
                    <option value="401k">401(k)</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-ink text-white text-sm rounded-lg hover:bg-ink/80 disabled:opacity-50">{saving ? 'Saving…' : 'Add equity'}</button>
            </form>
          )}

          {tab === 'real_estate' && (
            <form onSubmit={handleRESubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Property address</label>
                <input value={address} onChange={e => setAddress(e.target.value)} required placeholder="123 Main St, City, State" className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg bg-canvas focus:outline-none focus:ring-2 focus:ring-flo-600/30" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Property type</label>
                  <select value={propType} onChange={e => setPropType(e.target.value)} className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg bg-canvas focus:outline-none focus:ring-2 focus:ring-flo-600/30">
                    <option value="primary_residence">Primary residence</option>
                    <option value="rental">Rental</option>
                    <option value="commercial">Commercial</option>
                    <option value="land">Land</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Estimated value</label>
                  <input type="number" step="any" value={estValue} onChange={e => { setEstValue(e.target.value); setReValuationNote(true); }} required placeholder="500000" className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg bg-canvas focus:outline-none focus:ring-2 focus:ring-flo-600/30" />
                </div>
              </div>
              {reValuationNote && estValue && (
                <div className="px-3 py-2 bg-sage-50 border-l-4 border-sage-600 rounded-r-lg text-xs text-sage-700">
                  We'll use <strong>91% of this ({fmt(Math.round(parseFloat(estValue) * 0.91))})</strong> to account for selling costs and market variance. The original estimate is kept in your record.
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Mortgage balance (leave blank if owned outright)</label>
                <input type="number" step="any" value={mortgageBalance} onChange={e => setMortgageBalance(e.target.value)} placeholder="250000" className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg bg-canvas focus:outline-none focus:ring-2 focus:ring-flo-600/30" />
              </div>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-ink text-white text-sm rounded-lg hover:bg-ink/80 disabled:opacity-50">{saving ? 'Saving…' : 'Add property'}</button>
            </form>
          )}

          {tab === 'other' && (
            <form onSubmit={handleOtherSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Asset name</label>
                  <input value={assetName} onChange={e => setAssetName(e.target.value)} required placeholder="My Business" className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg bg-canvas focus:outline-none focus:ring-2 focus:ring-flo-600/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Category</label>
                  <select value={assetCategory} onChange={e => { setAssetCategory(e.target.value); setBusinessEquityPrompt(false); }} className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg bg-canvas focus:outline-none focus:ring-2 focus:ring-flo-600/30">
                    <option value="business_equity">Business equity</option>
                    <option value="whole_life">Whole life cash value</option>
                    <option value="cash">Cash / T-bills</option>
                    <option value="crypto">Crypto</option>
                    <option value="collectible">Collectible</option>
                    <option value="vehicle">Vehicle</option>
                    <option value="annuity">Annuity</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Current value</label>
                <input type="number" step="any" value={assetValue} onChange={e => { setAssetValue(e.target.value); if (assetCategory === 'business_equity' && e.target.value && parseFloat(e.target.value) % 1000 === 0) setBusinessEquityPrompt(true); }} required placeholder="100000" className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg bg-canvas focus:outline-none focus:ring-2 focus:ring-flo-600/30" />
              </div>
              {businessEquityPrompt && assetCategory === 'business_equity' && (
                <div className="px-3 py-2 bg-flo-50 border-l-4 border-flo-600 rounded-r-lg text-xs text-flo-700">
                  How did you arrive at this valuation? Storing the methodology helps Flo reason more accurately.
                  <div className="mt-1">
                    <input value={valuationMethod} onChange={e => setValuationMethod(e.target.value)} placeholder="e.g. 3× revenue, EBITDA multiple, book value" className="w-full px-2 py-1.5 border border-flo-100 rounded bg-white text-xs focus:outline-none focus:ring-2 focus:ring-flo-600/30" />
                  </div>
                </div>
              )}
              <button type="submit" disabled={saving} className="px-4 py-2 bg-ink text-white text-sm rounded-lg hover:bg-ink/80 disabled:opacity-50">{saving ? 'Saving…' : 'Add asset'}</button>
            </form>
          )}

          {tab === 'restricted' && (
            <form onSubmit={handleRestrictedSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Asset name</label>
                  <input value={rName} onChange={e => setRName(e.target.value)} required placeholder="ACME Corp RSUs" className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg bg-canvas focus:outline-none focus:ring-2 focus:ring-flo-600/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Category</label>
                  <select value={rCategory} onChange={e => setRCategory(e.target.value)} className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg bg-canvas focus:outline-none focus:ring-2 focus:ring-flo-600/30">
                    <option value="unvested_equity">Unvested equity / RSUs</option>
                    <option value="pending_inheritance">Pending inheritance</option>
                    <option value="lawsuit_settlement">Lawsuit settlement</option>
                    <option value="deferred_comp">Deferred compensation</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Estimated value (optional)</label>
                  <input type="number" step="any" value={rValue} onChange={e => setRValue(e.target.value)} placeholder="50000" className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg bg-canvas focus:outline-none focus:ring-2 focus:ring-flo-600/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Vest / expected date</label>
                  <input type="date" value={rVestDate} onChange={e => setRVestDate(e.target.value)} className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg bg-canvas focus:outline-none focus:ring-2 focus:ring-flo-600/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Probability % (0–100)</label>
                  <input type="number" min="0" max="100" value={rProbability} onChange={e => setRProbability(e.target.value)} placeholder="80" className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg bg-canvas focus:outline-none focus:ring-2 focus:ring-flo-600/30" />
                </div>
              </div>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-ink text-white text-sm rounded-lg hover:bg-ink/80 disabled:opacity-50">{saving ? 'Saving…' : 'Add restricted asset'}</button>
            </form>
          )}
        </div>
      )}

      {/* Asset lists */}
      {loading ? (
        <div className="text-sm text-muted">Loading assets…</div>
      ) : (
        <>
          {tab === 'equities' && (
            equities.length === 0 ? (
              <EmptyState message="No equities yet. Add your first position above." />
            ) : (
              <AssetTable headers={['Ticker', 'Shares', 'Price', 'Value', 'Account', '']}>
                {equities.map(e => (
                  <tr key={e.id} className="border-t border-black/5 hover:bg-black/[0.02]">
                    <td className="px-4 py-3 text-sm font-medium text-ink">{e.ticker}</td>
                    <td className="px-4 py-3 text-sm text-muted">{e.shares}</td>
                    <td className="px-4 py-3 text-sm text-muted">{e.current_price ? fmt(e.current_price) : '–'}</td>
                    <td className="px-4 py-3 text-sm text-ink">{e.current_price ? fmt(e.current_price * e.shares) : '–'}</td>
                    <td className="px-4 py-3 text-xs text-muted capitalize">{e.account_type || 'taxable'}</td>
                    <td className="px-4 py-3 text-right"><button onClick={() => handleDelete('equities', e.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button></td>
                  </tr>
                ))}
              </AssetTable>
            )
          )}

          {tab === 'real_estate' && (
            realEstate.length === 0 ? (
              <EmptyState message="No properties yet. Add your first property above." />
            ) : (
              <AssetTable headers={['Address', 'Est. Value', 'Mortgage', 'Equity', '']}>
                {realEstate.map(r => (
                  <tr key={r.id} className="border-t border-black/5 hover:bg-black/[0.02]">
                    <td className="px-4 py-3 text-sm font-medium text-ink">{r.address}</td>
                    <td className="px-4 py-3 text-sm text-muted">{fmt(r.adjusted_value || r.estimated_value)}</td>
                    <td className="px-4 py-3 text-sm text-muted">{fmt(r.mortgage_balance || 0)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-ink">{fmt(r.equity || 0)}</td>
                    <td className="px-4 py-3 text-right"><button onClick={() => handleDelete('real_estate', r.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button></td>
                  </tr>
                ))}
              </AssetTable>
            )
          )}

          {tab === 'other' && (
            other.length === 0 ? (
              <EmptyState message="No other assets yet. Add business equity, whole life cash value, crypto, etc." />
            ) : (
              <AssetTable headers={['Name', 'Category', 'Value', 'Method', '']}>
                {other.map(o => (
                  <tr key={o.id} className="border-t border-black/5 hover:bg-black/[0.02]">
                    <td className="px-4 py-3 text-sm font-medium text-ink">{o.name}</td>
                    <td className="px-4 py-3 text-xs text-muted capitalize">{o.category?.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-sm font-medium text-ink">{fmt(o.current_value)}</td>
                    <td className="px-4 py-3 text-xs text-muted">{o.valuation_method || '–'}</td>
                    <td className="px-4 py-3 text-right"><button onClick={() => handleDelete('other', o.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button></td>
                  </tr>
                ))}
              </AssetTable>
            )
          )}

          {tab === 'restricted' && (
            restricted.length === 0 ? (
              <EmptyState message="No restricted assets. Add unvested equity, pending inheritance, etc." />
            ) : (
              <AssetTable headers={['Name', 'Category', 'Est. Value', 'Vest Date', 'Probability', '']}>
                {restricted.map(r => (
                  <tr key={r.id} className="border-t border-black/5 hover:bg-black/[0.02]">
                    <td className="px-4 py-3 text-sm font-medium text-ink">{r.name}</td>
                    <td className="px-4 py-3 text-xs text-muted capitalize">{r.category?.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-sm text-ink">{r.estimated_value ? fmt(r.estimated_value) : '–'}</td>
                    <td className="px-4 py-3 text-xs text-muted">{r.vest_date ? new Date(r.vest_date).toLocaleDateString() : '–'}</td>
                    <td className="px-4 py-3 text-xs text-muted">{r.probability != null ? `${r.probability}%` : '–'}</td>
                    <td className="px-4 py-3 text-right"><button onClick={() => handleDelete('restricted', r.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button></td>
                  </tr>
                ))}
              </AssetTable>
            )
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-sm text-muted text-center py-12 bg-white border border-black/10 rounded-xl">
      {message}
    </div>
  );
}

function AssetTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-black/10 rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-black/[0.02]">
            {headers.map(h => (
              <th key={h} className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
