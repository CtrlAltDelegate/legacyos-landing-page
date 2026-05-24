import { useState } from 'react';
import { api, getErrorMessage } from '@/api/client';
import Spinner from '@/components/Spinner';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EditableAsset {
  id: string;
  name: string;
  ticker: string | null;
  assetClass: string;
  assetType: string;
  sharesHeld: number | null;
  costBasisPerShare: number | null;
  currentValue: number | null;
  currentValueSource: string;
  accountLabel: string | null;
}

interface Props {
  asset: EditableAsset;
  onClose: () => void;
  onSaved: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      {hint && <p className="text-[11px] text-gray-400 mb-1">{hint}</p>}
      {children}
    </div>
  );
}

function MoneyInput({
  value, onChange, placeholder = '0.00', step = '0.01', required = false,
}: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; step?: string; required?: boolean;
}) {
  return (
    <div className="relative flex items-center">
      <span className="absolute left-2.5 text-gray-400 text-sm">$</span>
      <input
        required={required}
        type="number"
        step={step}
        min="0"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 py-2 pl-7 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-200"
      />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditPositionModal({ asset, onClose, onSaved }: Props) {
  const isCash    = asset.currentValueSource === 'manual' && !asset.sharesHeld;
  const isManual  = asset.currentValueSource === 'manual' && !isCash;
  const isAuto    = asset.currentValueSource === 'ticker_api';
  const isCrypto  = asset.assetType === 'crypto';

  // Shared fields
  const [name, setName]               = useState(asset.name);

  // Auto-priced positions (shares × live price)
  const [shares, setShares]           = useState(asset.sharesHeld != null ? String(asset.sharesHeld) : '');
  const [costBasis, setCostBasis]     = useState(asset.costBasisPerShare != null ? String(asset.costBasisPerShare) : '');

  // Manual positions (401k funds, etc.)
  const [currentValue, setCurrentValue] = useState(
    asset.currentValue != null ? String(asset.currentValue) : ''
  );

  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body: Record<string, unknown> = { name };

      if (isCash) {
        // Cash position — just update the dollar balance
        body.currentValue = Number(currentValue);
      } else if (isAuto) {
        // Ticker-priced — update shares + cost basis; value recalculates on next refresh
        if (shares) body.sharesHeld = Number(shares);
        if (costBasis) body.costBasisPerShare = Number(costBasis);
        // If shares changed, clear the stale currentValue so it's obvious a refresh is needed
        // (leaving it in place is fine too — user can hit Refresh)
      } else {
        // Manual investment (401k fund etc.) — update value + optionally shares/cost basis
        body.currentValue = Number(currentValue);
        if (shares) body.sharesHeld = Number(shares);
        if (costBasis) body.costBasisPerShare = Number(costBasis);
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">Edit position</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {asset.accountLabel ? `${asset.accountLabel} · ` : ''}{asset.ticker ?? asset.name}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
        </div>

        {/* Body */}
        <form id="edit-form" onSubmit={handleSave} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

          {/* Position / fund name */}
          <Field label="Position name">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-200"
            />
          </Field>

          {/* ── Cash position ── */}
          {isCash && (
            <Field label="Cash balance ($)" hint="Update whenever your balance changes.">
              <MoneyInput value={currentValue} onChange={setCurrentValue} required />
            </Field>
          )}

          {/* ── Auto-priced (ticker) position ── */}
          {isAuto && (
            <>
              <Field
                label={isCrypto ? 'Units held' : 'Shares held'}
                hint="The price updates automatically — just keep the quantity current."
              >
                <input
                  type="number"
                  step={isCrypto ? '0.000000001' : '0.0001'}
                  min="0"
                  value={shares}
                  onChange={e => setShares(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-200"
                />
              </Field>

              <Field
                label="Avg cost basis per share ($)"
                hint="Used to calculate unrealized gain / loss. Update if you bought more at a different price."
              >
                <MoneyInput
                  value={costBasis}
                  onChange={setCostBasis}
                  step="0.00001"
                  placeholder="0.00000"
                />
              </Field>

              <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5">
                <p className="text-xs text-blue-700">
                  💡 The dollar value updates automatically from the price feed.
                  Hit <span className="font-semibold">Refresh</span> on the position card after saving to recalculate it with your new share count.
                </p>
              </div>
            </>
          )}

          {/* ── Manual investment position (401k fund, etc.) ── */}
          {isManual && (
            <>
              <Field label="Current position value ($)" hint="Enter the total value from your latest statement.">
                <MoneyInput value={currentValue} onChange={setCurrentValue} required />
              </Field>

              <Field
                label="Shares / units held"
                hint="Optional — needed for gain/loss tracking."
              >
                <input
                  type="number"
                  step="0.000000001"
                  min="0"
                  value={shares}
                  onChange={e => setShares(e.target.value)}
                  placeholder="0.000"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-200"
                />
              </Field>

              <Field
                label="Avg cost basis per share ($)"
                hint="Optional — used for gain/loss tracking."
              >
                <MoneyInput
                  value={costBasis}
                  onChange={setCostBasis}
                  step="0.00001"
                  placeholder="0.00000"
                />
              </Field>
            </>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-form"
            disabled={saving}
            className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {saving ? <><Spinner className="h-4 w-4" /> Saving…</> : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
