import { useState } from 'react';
import { api, getErrorMessage } from '@/api/client';
import Spinner from '@/components/Spinner';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EditableNonEquityAsset {
  id: string;
  name: string;
  assetClass: string;
  assetType: string;
  currentValue: number | null;
  estimatedValue: number | null;
  mortgageBalance: number | null;
  monthlyRent: number | null;
  monthlyPiti: number | null;
  ownershipPercent: number | null;
}

interface Props {
  asset: EditableNonEquityAsset;
  onClose: () => void;
  onSaved: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      {hint && <p className="text-[11px] text-gray-400 mb-1">{hint}</p>}
      {children}
    </div>
  );
}

function MoneyInput({ value, onChange, placeholder = '0.00' }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="relative flex items-center">
      <span className="absolute left-2.5 text-gray-400 text-sm">$</span>
      <input
        type="number" step="0.01" min="0"
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 py-2 pl-7 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-200"
      />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditAssetModal({ asset, onClose, onSaved }: Props) {
  const isRealEstate = asset.assetClass === 'real_estate';
  const isRental     = asset.assetType === 'rental';
  const isBusiness   = asset.assetType === 'business_equity';

  const [name, setName]                     = useState(asset.name);
  const [estimatedValue, setEstimatedValue] = useState(
    asset.estimatedValue != null ? String(asset.estimatedValue) : ''
  );
  const [mortgageBalance, setMortgageBalance] = useState(
    asset.mortgageBalance != null ? String(asset.mortgageBalance) : ''
  );
  const [monthlyRent, setMonthlyRent]       = useState(
    asset.monthlyRent != null ? String(asset.monthlyRent) : ''
  );
  const [monthlyPiti, setMonthlyPiti]       = useState(
    asset.monthlyPiti != null ? String(asset.monthlyPiti) : ''
  );
  const [currentValue, setCurrentValue]     = useState(
    asset.currentValue != null ? String(asset.currentValue) : ''
  );
  const [ownershipPct, setOwnershipPct]     = useState(
    asset.ownershipPercent != null ? String(asset.ownershipPercent) : ''
  );

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body: Record<string, unknown> = { name };

      if (isRealEstate) {
        if (estimatedValue) body.estimatedValue = Number(estimatedValue);
        if (mortgageBalance !== '') body.mortgageBalance = Number(mortgageBalance);
        if (isRental) {
          if (monthlyRent) body.monthlyRent = Number(monthlyRent);
          if (monthlyPiti) body.monthlyPiti = Number(monthlyPiti);
        }
      } else if (isBusiness) {
        if (currentValue) body.currentValue = Number(currentValue);
        if (ownershipPct) body.ownershipPercent = Number(ownershipPct);
      } else {
        // Cash, whole life, vehicle, etc.
        if (currentValue) body.currentValue = Number(currentValue);
      }

      await api.put(`/assets/${asset.id}`, body);
      onSaved();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const assetTypeLabel =
    isRealEstate ? 'Real estate' :
    isBusiness   ? 'Business equity' :
    asset.assetType.replace(/_/g, ' ');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">Edit asset</h2>
            <p className="text-xs text-gray-400 mt-0.5 capitalize">{assetTypeLabel}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
        </div>

        {/* Body */}
        <form id="edit-asset-form" onSubmit={handleSave} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

          <Field label="Name">
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-200"
            />
          </Field>

          {/* ── Real Estate ── */}
          {isRealEstate && (
            <>
              <Field label="Estimated market value ($)" hint="LegacyOS uses 91% of this to account for selling costs.">
                <MoneyInput value={estimatedValue} onChange={setEstimatedValue} />
              </Field>
              <Field label="Mortgage balance ($)" hint="Outstanding principal remaining on the loan.">
                <MoneyInput value={mortgageBalance} onChange={setMortgageBalance} />
              </Field>
              {estimatedValue && (
                <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
                  <p className="text-xs text-blue-600">Estimated equity after selling costs</p>
                  <p className="text-lg font-bold text-blue-700">
                    {(Number(estimatedValue) * 0.91 - Number(mortgageBalance || 0))
                      .toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[11px] text-blue-500 mt-0.5">
                    {(Number(estimatedValue) * 0.91).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} adjusted value − {Number(mortgageBalance || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} mortgage
                  </p>
                </div>
              )}
              {isRental && (
                <>
                  <div className="border-t border-gray-100 pt-2">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">Rental income</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Monthly gross rent ($)">
                      <MoneyInput value={monthlyRent} onChange={setMonthlyRent} />
                    </Field>
                    <Field label="Monthly PITI ($)" hint="Principal + Interest + Tax + Insurance">
                      <MoneyInput value={monthlyPiti} onChange={setMonthlyPiti} />
                    </Field>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── Business equity ── */}
          {isBusiness && (
            <>
              <Field label="Current estimated valuation ($)">
                <MoneyInput value={currentValue} onChange={setCurrentValue} />
              </Field>
              <Field label="Your ownership (%)" hint="Your percentage of total equity.">
                <div className="relative flex items-center">
                  <input
                    type="number" step="0.1" min="0" max="100"
                    value={ownershipPct} onChange={e => setOwnershipPct(e.target.value)}
                    placeholder="100"
                    className="w-full rounded-lg border border-gray-200 py-2 pl-3 pr-8 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-200"
                  />
                  <span className="absolute right-2.5 text-gray-400 text-sm">%</span>
                </div>
              </Field>
              {currentValue && ownershipPct && (
                <div className="rounded-lg bg-violet-50 border border-violet-100 px-4 py-3">
                  <p className="text-xs text-violet-600">Your equity stake</p>
                  <p className="text-lg font-bold text-violet-700">
                    {((Number(currentValue) * Number(ownershipPct)) / 100)
                      .toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── Cash, whole life, vehicle, other ── */}
          {!isRealEstate && !isBusiness && (
            <Field label="Current balance / value ($)">
              <MoneyInput value={currentValue} onChange={setCurrentValue} />
            </Field>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
            Cancel
          </button>
          <button type="submit" form="edit-asset-form" disabled={saving}
            className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition flex items-center justify-center gap-2">
            {saving ? <><Spinner className="h-4 w-4" /> Saving…</> : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
