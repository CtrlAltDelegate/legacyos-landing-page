import { useState, useEffect, useRef } from 'react';
import { api, getErrorMessage } from '@/api/client';
import Spinner from '@/components/Spinner';

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = 'equity' | 'real_estate' | 'cash' | 'business' | 'other';
type RESubtype = 'primary' | 'secondary' | 'rental' | 'commercial';
type EquityAccountType = 'taxable' | 'ira' | 'roth_ira' | '401k' | 'crypto';

interface TickerData { ticker: string; price: number; name: string; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });


function inp(
  label: string,
  value: string,
  onChange: (v: string) => void,
  opts?: { type?: string; placeholder?: string; prefix?: string; suffix?: string; required?: boolean; hint?: string }
) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}{opts?.required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {opts?.hint && <p className="text-[11px] text-gray-400 mb-1">{opts.hint}</p>}
      <div className="relative flex items-center">
        {opts?.prefix && <span className="absolute left-2.5 text-gray-400 text-sm">{opts.prefix}</span>}
        <input
          required={opts?.required}
          type={opts?.type ?? 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={opts?.placeholder}
          className={`w-full rounded-lg border border-gray-200 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-200 ${opts?.prefix ? 'pl-7' : 'pl-3'} ${opts?.suffix ? 'pr-10' : 'pr-3'}`}
        />
        {opts?.suffix && <span className="absolute right-2.5 text-gray-400 text-sm">{opts.suffix}</span>}
      </div>
    </div>
  );
}

// ─── Rental ROI Calculator ────────────────────────────────────────────────────

function RentalROIPanel({
  grossRent, piti, managementFee, isManaged, insurance, hoa,
  maintenanceMonthly, capexMonthly, vacancyRate,
  purchasePrice, mortgageBalance, estimatedValue,
}: {
  grossRent: number; piti: number; managementFee: number; isManaged: boolean;
  insurance: number; hoa: number; maintenanceMonthly: number; capexMonthly: number;
  vacancyRate: number; purchasePrice: number; mortgageBalance: number; estimatedValue: number;
}) {
  const vacancy = grossRent * (vacancyRate / 100);
  const mgmt = isManaged ? (grossRent - vacancy) * (managementFee / 100) : 0;
  const totalExpenses = piti + mgmt + vacancy + insurance + hoa + maintenanceMonthly + capexMonthly;
  const monthlyCF = grossRent - totalExpenses;
  const annualCF = monthlyCF * 12;
  const noi = (grossRent - vacancy - mgmt - insurance - hoa - maintenanceMonthly - capexMonthly) * 12;
  const downPayment = Math.max(0, purchasePrice - mortgageBalance);
  const equity = Math.max(0, estimatedValue - mortgageBalance);
  const capRate = estimatedValue > 0 ? (noi / estimatedValue) * 100 : 0;
  const cashOnCash = downPayment > 0 ? (annualCF / downPayment) * 100 : 0;
  const roe = equity > 0 ? (annualCF / equity) * 100 : 0;

  const cfColor = monthlyCF >= 0 ? 'text-emerald-700' : 'text-red-600';

  return (
    <div className="mt-4 rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-3">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Live ROI Calculator</p>

      {/* Monthly breakdown */}
      <div className="space-y-1 text-xs">
        <div className="flex justify-between text-gray-700">
          <span>Gross rent</span><span className="font-medium">{fmt(grossRent)}</span>
        </div>
        {isManaged && mgmt > 0 && (
          <div className="flex justify-between text-gray-500">
            <span>Management ({managementFee}%)</span><span>−{fmt(mgmt)}</span>
          </div>
        )}
        {vacancy > 0 && (
          <div className="flex justify-between text-gray-500">
            <span>Vacancy ({vacancyRate}%)</span><span>−{fmt(vacancy)}</span>
          </div>
        )}
        {piti > 0 && (
          <div className="flex justify-between text-gray-500">
            <span>Mortgage (PITI)</span><span>−{fmt(piti)}</span>
          </div>
        )}
        {insurance > 0 && (
          <div className="flex justify-between text-gray-500">
            <span>Insurance</span><span>−{fmt(insurance)}</span>
          </div>
        )}
        {hoa > 0 && (
          <div className="flex justify-between text-gray-500">
            <span>HOA</span><span>−{fmt(hoa)}</span>
          </div>
        )}
        {maintenanceMonthly > 0 && (
          <div className="flex justify-between text-gray-500">
            <span>Maintenance reserve</span><span>−{fmt(maintenanceMonthly)}</span>
          </div>
        )}
        {capexMonthly > 0 && (
          <div className="flex justify-between text-gray-500">
            <span>CapEx reserve</span><span>−{fmt(capexMonthly)}</span>
          </div>
        )}
        <div className={`flex justify-between border-t border-gray-200 pt-1.5 font-bold text-sm ${cfColor}`}>
          <span>Monthly cash flow</span><span>{fmt(monthlyCF)}</span>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        {[
          { label: 'Cash-on-cash', value: cashOnCash, tip: 'Annual CF ÷ down payment' },
          { label: 'Cap rate', value: capRate, tip: 'NOI ÷ property value' },
          { label: 'Return on equity', value: roe, tip: 'Annual CF ÷ equity' },
        ].map(m => (
          <div key={m.label} className="rounded-lg bg-white border border-gray-200 p-2 text-center" title={m.tip}>
            <p className={`text-base font-bold ${m.value >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
              {m.value.toFixed(1)}%
            </p>
            <p className="text-[10px] text-gray-400 leading-tight">{m.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Category cards ───────────────────────────────────────────────────────────

const CATEGORIES: { id: Category; emoji: string; label: string; desc: string }[] = [
  { id: 'equity',      emoji: '📈', label: 'Equities & Crypto',  desc: 'Stocks, ETFs, funds, crypto, retirement accounts' },
  { id: 'real_estate', emoji: '🏠', label: 'Real Estate',        desc: 'Primary home, rental, commercial property' },
  { id: 'cash',        emoji: '💵', label: 'Cash & Savings',     desc: 'Checking, savings, HYSA, T-Bills, money market' },
  { id: 'business',    emoji: '🏢', label: 'Business Equity',    desc: 'Private company, LLC, partnership ownership' },
  { id: 'other',       emoji: '📦', label: 'Other Assets',       desc: 'Whole life cash value, collectibles, vehicles, misc' },
];

// ─── Main modal ───────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onAdded: () => void;
}

export default function AddAssetModal({ onClose, onAdded }: Props) {
  const [step, setStep] = useState<'category' | 'details'>('category');
  const [category, setCategory] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // ── Equity form state ──────────────────────────────────────────────────────
  const [eqAccountType, setEqAccountType] = useState<EquityAccountType>('taxable');
  const [eqLabel, setEqLabel]       = useState('');
  const [eqTicker, setEqTicker]     = useState('');
  const [eqShares, setEqShares]     = useState('');
  const [eqCostBasis, setEqCostBasis] = useState('');
  const [eqIsPretax, setEqIsPretax] = useState(false);
  const [tickerData, setTickerData] = useState<TickerData | null>(null);
  const [tickerLoading, setTickerLoading] = useState(false);
  const [tickerError, setTickerError] = useState('');
  const tickerTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Real estate form state ─────────────────────────────────────────────────
  const [reSubtype, setReSubtype]   = useState<RESubtype>('primary');
  const [reName, setReName]         = useState('');
  const [reAddress, setReAddress]   = useState('');
  const [rePurchasePrice, setRePurchasePrice] = useState('');
  const [reEstValue, setReEstValue] = useState('');
  const [reMortgage, setReMortgage] = useState('');
  const [rePiti, setRePiti]         = useState('');
  const [reInsurance, setReInsurance] = useState('');
  const [reHoa, setReHoa]           = useState('');
  // Rental-specific
  const [reRent, setReRent]         = useState('');
  const [reIsManaged, setReIsManaged] = useState(false);
  const [reMgmtFee, setReMgmtFee]   = useState('10');
  const [reMaintenance, setReMaintenance] = useState('');
  const [reCapex, setReCapex]       = useState('');
  const [reVacancy, setReVacancy]   = useState('5');
  const [reMaintenancePct, setReMaintenancePct] = useState('1'); // % of value / year

  // ── Cash form state ────────────────────────────────────────────────────────
  const [cashName, setCashName]     = useState('');
  const [cashType, setCashType]     = useState('savings');
  const [cashBalance, setCashBalance] = useState('');

  // ── Business equity form state ─────────────────────────────────────────────
  const [bizName, setBizName]       = useState('');
  const [bizOwnership, setBizOwnership] = useState('');
  const [bizValuation, setBizValuation] = useState('');
  const [bizMethod, setBizMethod]   = useState('revenue_multiple');
  const [bizNotes, setBizNotes]     = useState('');

  // ── Other form state ───────────────────────────────────────────────────────
  const [otherName, setOtherName]   = useState('');
  const [otherType, setOtherType]   = useState('other');
  const [otherValue, setOtherValue] = useState('');
  const [otherNotes, setOtherNotes] = useState('');

  // ── Ticker lookup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!eqTicker || eqTicker.length < 1) {
      setTickerData(null);
      setTickerError('');
      return;
    }
    if (tickerTimeout.current) clearTimeout(tickerTimeout.current);
    tickerTimeout.current = setTimeout(async () => {
      setTickerLoading(true);
      setTickerError('');
      try {
        const { data } = await api.get(`/assets/ticker/${eqTicker.toUpperCase()}`);
        setTickerData(data);
      } catch {
        setTickerData(null);
        setTickerError(`No price data found for "${eqTicker.toUpperCase()}"`);
      } finally {
        setTickerLoading(false);
      }
    }, 800);
  }, [eqTicker]);

  // ── Auto-calculate maintenance reserve from % of value ──────────────────
  const autoMaintenance = reEstValue && reMaintenancePct
    ? ((Number(reEstValue) * Number(reMaintenancePct)) / 100 / 12).toFixed(0)
    : '';

  function selectCategory(cat: Category) {
    setCategory(cat);
    setFormError('');
    // Auto-set pretax for retirement account types
    if (cat === 'equity') setEqIsPretax(false);
    setStep('details');
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      let body: Record<string, unknown> = {};

      if (category === 'equity') {
        const isPretax = eqIsPretax || eqAccountType === '401k' || eqAccountType === 'ira';
        const shares = Number(eqShares);
        const price = tickerData?.price ?? 0;
        const isCrypto = eqAccountType === 'crypto';
        body = {
          assetClass: 'equity',
          assetType: eqAccountType === '401k' ? 'retirement_401k'
                   : eqAccountType === 'ira'  ? 'retirement_ira'
                   : eqAccountType === 'roth_ira' ? 'retirement_ira'
                   : isCrypto ? 'crypto'
                   : 'stock',
          name: eqLabel || (tickerData?.name ?? eqTicker.toUpperCase()),
          ticker: eqTicker ? eqTicker.toUpperCase() : undefined,
          sharesHeld: shares,
          costBasisPerShare: eqCostBasis ? Number(eqCostBasis) : undefined,
          accountLabel: eqLabel || undefined,
          isPretax,
          // Set initial value from price lookup so it's not blank until cron runs
          currentValue: shares > 0 && price > 0 ? parseFloat((shares * price).toFixed(2)) : undefined,
        };
      }

      else if (category === 'real_estate') {
        const isRental = reSubtype === 'rental';
        const maintenanceMonthly = reMaintenance
          ? Number(reMaintenance)
          : (autoMaintenance ? Number(autoMaintenance) : undefined);
        body = {
          assetClass: 'real_estate',
          assetType: reSubtype === 'primary' ? 'primary_residence'
                   : reSubtype === 'secondary' ? 'secondary_residence'
                   : reSubtype === 'rental' ? 'rental'
                   : 'commercial',
          name: reName,
          propertyAddress: reAddress || undefined,
          purchasePrice: rePurchasePrice ? Number(rePurchasePrice) : undefined,
          estimatedValue: Number(reEstValue),
          mortgageBalance: reMortgage ? Number(reMortgage) : undefined,
          monthlyPiti: rePiti ? Number(rePiti) : undefined,
          monthlyInsurance: reInsurance ? Number(reInsurance) : undefined,
          monthlyHoa: reHoa ? Number(reHoa) : undefined,
          ...(isRental && {
            monthlyRent: Number(reRent),
            managementFeePercent: reIsManaged ? Number(reMgmtFee) : 0,
            maintenanceReserveMonthly: maintenanceMonthly,
            capexReserveMonthly: reCapex ? Number(reCapex) : undefined,
            vacancyRatePercent: Number(reVacancy),
          }),
        };
      }

      else if (category === 'cash') {
        body = {
          assetClass: 'other',
          assetType: cashType,
          name: cashName,
          currentValue: Number(cashBalance),
        };
      }

      else if (category === 'business') {
        body = {
          assetClass: 'other',
          assetType: 'business_equity',
          name: bizName,
          ownershipPercent: Number(bizOwnership),
          currentValue: Number(bizValuation),
          valuationMethod: bizMethod,
          valuationNotes: bizNotes || undefined,
        };
      }

      else if (category === 'other') {
        body = {
          assetClass: 'other',
          assetType: otherType,
          name: otherName,
          currentValue: Number(otherValue),
          notes: otherNotes || undefined,
        };
      }

      await api.post('/assets', body);
      onAdded();
      onClose();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const estimatedEquityValue = tickerData && eqShares
    ? tickerData.price * Number(eqShares)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            {step === 'details' && (
              <button onClick={() => setStep('category')} className="text-gray-400 hover:text-gray-700 text-sm">
                ← Back
              </button>
            )}
            <h2 className="text-base font-bold text-gray-900">
              {step === 'category' ? 'Add asset' : CATEGORIES.find(c => c.id === category)?.label}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">

          {/* ── Step 1: Category selector ─────────────────────────────────── */}
          {step === 'category' && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500 mb-4">What type of asset are you adding?</p>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => selectCategory(cat.id)}
                  className="w-full flex items-center gap-4 rounded-xl border border-gray-200 p-4 text-left hover:border-brand-400 hover:bg-brand-50 transition group"
                >
                  <span className="text-2xl">{cat.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-brand-700">{cat.label}</p>
                    <p className="text-xs text-gray-500">{cat.desc}</p>
                  </div>
                  <span className="ml-auto text-gray-300 group-hover:text-brand-400">→</span>
                </button>
              ))}
            </div>
          )}

          {/* ── Step 2: Details forms ─────────────────────────────────────── */}
          {step === 'details' && (
            <form id="asset-form" onSubmit={handleSubmit} className="space-y-4">

              {/* ── Equities & Crypto ──────────────────────────────────────── */}
              {category === 'equity' && (
                <>
                  {/* Account type */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">Account type</label>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                      {([
                        { id: 'taxable', label: 'Brokerage' },
                        { id: 'ira',     label: 'IRA' },
                        { id: 'roth_ira',label: 'Roth IRA' },
                        { id: '401k',    label: '401(k)' },
                        { id: 'crypto',  label: 'Crypto' },
                      ] as { id: EquityAccountType; label: string }[]).map(opt => (
                        <button
                          key={opt.id} type="button"
                          onClick={() => {
                            setEqAccountType(opt.id);
                            setEqIsPretax(opt.id === '401k' || opt.id === 'ira');
                            if (opt.id === 'crypto') { setEqTicker(''); setTickerData(null); }
                          }}
                          className={`rounded-lg border py-2 text-xs font-semibold transition ${eqAccountType === opt.id ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {inp('Account / Position label', eqLabel, setEqLabel, { placeholder: 'e.g. Fidelity Roth IRA', required: true })}

                  {/* Ticker lookup */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      {eqAccountType === 'crypto' ? 'Coin symbol' : 'Ticker symbol'}
                      <span className="ml-1 font-normal text-gray-400">(optional for broad funds)</span>
                    </label>
                    <div className="relative">
                      <input
                        value={eqTicker}
                        onChange={e => setEqTicker(e.target.value.toUpperCase())}
                        placeholder={eqAccountType === 'crypto' ? 'BTC, ETH, SOL...' : 'AAPL, VTSAX, VOO...'}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm uppercase focus:border-brand-500 focus:outline-none"
                      />
                      {tickerLoading && <Spinner className="absolute right-3 top-2.5 h-4 w-4" />}
                    </div>
                    {tickerError && <p className="mt-1 text-xs text-red-500">{tickerError}</p>}
                    {tickerData && (
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-600">
                        <span className="font-semibold text-emerald-700">${tickerData.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span className="text-gray-400">per share</span>
                        <span className="text-gray-400">·</span>
                        <span>{tickerData.name}</span>
                      </div>
                    )}
                  </div>

                  {inp('Shares / units held', eqShares, setEqShares, { type: 'number', placeholder: '0.00', required: true })}

                  {/* Live value preview */}
                  {estimatedEquityValue !== null && estimatedEquityValue > 0 && (
                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
                      <p className="text-xs text-emerald-600">Estimated position value</p>
                      <p className="text-lg font-bold text-emerald-700">{fmt(estimatedEquityValue)}</p>
                      <p className="text-[11px] text-emerald-500 mt-0.5">
                        {Number(eqShares).toLocaleString()} shares × ${tickerData!.price.toFixed(2)} · Updated automatically by price feed
                      </p>
                    </div>
                  )}

                  {!tickerData && !eqTicker && (
                    <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
                      <p className="text-xs text-blue-600">💡 Enter a ticker to look up the live price. Your position value will be calculated automatically and updated on a regular schedule.</p>
                    </div>
                  )}

                  {inp('Cost basis per share ($)', eqCostBasis, setEqCostBasis, { type: 'number', placeholder: '0.00', prefix: '$', hint: 'Optional — used for unrealized gain/loss tracking' })}

                  {(eqAccountType === '401k' || eqAccountType === 'ira') && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                      <p className="text-xs text-amber-700">⚠ This is a pre-tax account. LegacyOS will show an estimated after-tax value based on your assumed tax rate.</p>
                    </div>
                  )}
                </>
              )}

              {/* ── Real Estate ────────────────────────────────────────────── */}
              {category === 'real_estate' && (
                <>
                  {/* Sub-type */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">Property type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { id: 'primary',   label: '🏡 Primary Home',    desc: 'Where you live' },
                        { id: 'secondary', label: '🏖 Secondary Home',  desc: 'Vacation / second home' },
                        { id: 'rental',    label: '🏘 Rental Property', desc: 'Income-generating residential' },
                        { id: 'commercial',label: '🏢 Commercial',      desc: 'Office, retail, industrial, 5+ units' },
                      ] as { id: RESubtype; label: string; desc: string }[]).map(opt => (
                        <button
                          key={opt.id} type="button"
                          onClick={() => setReSubtype(opt.id)}
                          className={`rounded-xl border p-3 text-left transition ${reSubtype === opt.id ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <p className="text-xs font-semibold text-gray-900">{opt.label}</p>
                          <p className="text-[11px] text-gray-400">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {inp('Property name / nickname', reName, setReName, { placeholder: 'e.g. Main Street Duplex', required: true })}
                  {inp('Property address', reAddress, setReAddress, { placeholder: '123 Main St, Austin TX' })}

                  <div className="grid grid-cols-2 gap-3">
                    {inp('Purchase price ($)', rePurchasePrice, setRePurchasePrice, { type: 'number', prefix: '$' })}
                    {inp('Current estimated value ($)', reEstValue, setReEstValue, { type: 'number', prefix: '$', required: true })}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {inp('Mortgage balance ($)', reMortgage, setReMortgage, { type: 'number', prefix: '$' })}
                    {inp('Monthly PITI ($)', rePiti, setRePiti, { type: 'number', prefix: '$', hint: 'Principal + Interest + Tax + Insurance' })}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {inp('Monthly insurance ($)', reInsurance, setReInsurance, { type: 'number', prefix: '$' })}
                    {inp('Monthly HOA ($)', reHoa, setReHoa, { type: 'number', prefix: '$' })}
                  </div>

                  {/* Equity preview for primary/secondary */}
                  {(reSubtype === 'primary' || reSubtype === 'secondary') && reEstValue && (
                    <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
                      <p className="text-xs text-blue-600">Estimated equity</p>
                      <p className="text-lg font-bold text-blue-700">
                        {fmt(Math.max(0, Number(reEstValue) * 0.91 - Number(reMortgage || 0)))}
                      </p>
                      <p className="text-[11px] text-blue-500 mt-0.5">91% of estimated value (net of selling costs) minus mortgage balance</p>
                    </div>
                  )}

                  {/* Rental-specific fields */}
                  {reSubtype === 'rental' && (
                    <>
                      <div className="border-t border-gray-100 pt-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Rental income & expenses</p>
                      </div>

                      {inp('Monthly gross rent ($)', reRent, setReRent, { type: 'number', prefix: '$', required: true })}

                      <div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={reIsManaged} onChange={e => setReIsManaged(e.target.checked)} className="rounded" />
                          <span className="text-sm text-gray-700">Professionally managed</span>
                        </label>
                        {reIsManaged && (
                          <div className="mt-2 pl-6">
                            {inp('Management fee (%)', reMgmtFee, setReMgmtFee, { type: 'number', suffix: '%', placeholder: '10' })}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {inp('Vacancy rate (%)', reVacancy, setReVacancy, { type: 'number', suffix: '%', placeholder: '5', hint: 'Months vacant per year ÷ 12' })}
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Maintenance reserve</label>
                          <p className="text-[11px] text-gray-400 mb-1">% of value/yr auto-calculates monthly</p>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <input
                                type="number" value={reMaintenancePct}
                                onChange={e => { setReMaintenancePct(e.target.value); setReMaintenance(''); }}
                                placeholder="1"
                                className="w-full rounded-lg border border-gray-200 py-2 pl-3 pr-8 text-sm focus:border-brand-500 focus:outline-none"
                              />
                              <span className="absolute right-2.5 top-2 text-gray-400 text-sm">%</span>
                            </div>
                            <span className="text-gray-400 self-center text-xs">or</span>
                            <div className="relative flex-1">
                              <span className="absolute left-2.5 top-2 text-gray-400 text-sm">$</span>
                              <input
                                type="number" value={reMaintenance}
                                onChange={e => { setReMaintenance(e.target.value); setReMaintenancePct(''); }}
                                placeholder={autoMaintenance || '0'}
                                className="w-full rounded-lg border border-gray-200 py-2 pl-7 pr-3 text-sm focus:border-brand-500 focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {inp('Monthly CapEx reserve ($)', reCapex, setReCapex, { type: 'number', prefix: '$', hint: 'HVAC, roof, appliances — typically $100–300/mo' })}

                      {/* Live ROI calculator */}
                      {reRent && (
                        <RentalROIPanel
                          grossRent={Number(reRent)}
                          piti={Number(rePiti || 0)}
                          managementFee={Number(reMgmtFee || 10)}
                          isManaged={reIsManaged}
                          insurance={Number(reInsurance || 0)}
                          hoa={Number(reHoa || 0)}
                          maintenanceMonthly={reMaintenance ? Number(reMaintenance) : Number(autoMaintenance || 0)}
                          capexMonthly={Number(reCapex || 0)}
                          vacancyRate={Number(reVacancy || 5)}
                          purchasePrice={Number(rePurchasePrice || 0)}
                          mortgageBalance={Number(reMortgage || 0)}
                          estimatedValue={Number(reEstValue || 0)}
                        />
                      )}
                    </>
                  )}

                  {/* Commercial note */}
                  {reSubtype === 'commercial' && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                      <p className="text-xs text-amber-700">💡 For commercial RE, enter your estimated value and any known debt. Full NOI/DSCR analysis coming soon. Ask Flo in the meantime.</p>
                    </div>
                  )}
                </>
              )}

              {/* ── Cash & Savings ─────────────────────────────────────────── */}
              {category === 'cash' && (
                <>
                  {inp('Account name', cashName, setCashName, { placeholder: 'e.g. Capital One HYSA', required: true })}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Account type</label>
                    <select value={cashType} onChange={e => setCashType(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
                      <option value="savings">Savings / HYSA</option>
                      <option value="checking">Checking</option>
                      <option value="money_market">Money market</option>
                      <option value="tbills">T-Bills / Treasury</option>
                      <option value="cash">Cash on hand</option>
                    </select>
                  </div>
                  {inp('Current balance ($)', cashBalance, setCashBalance, { type: 'number', prefix: '$', required: true })}
                </>
              )}

              {/* ── Business Equity ────────────────────────────────────────── */}
              {category === 'business' && (
                <>
                  {inp('Business name', bizName, setBizName, { required: true })}
                  {inp('Your ownership (%)', bizOwnership, setBizOwnership, { type: 'number', suffix: '%', placeholder: '100', required: true, hint: 'Your percentage of equity' })}
                  {inp('Estimated total valuation ($)', bizValuation, setBizValuation, { type: 'number', prefix: '$', required: true })}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Valuation method</label>
                    <select value={bizMethod} onChange={e => setBizMethod(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
                      <option value="revenue_multiple">Revenue multiple</option>
                      <option value="ebitda_multiple">EBITDA multiple</option>
                      <option value="book_value">Book value</option>
                      <option value="other">Other / estimate</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                    <textarea
                      value={bizNotes} onChange={e => setBizNotes(e.target.value)}
                      placeholder="e.g. 3x revenue multiple based on last 12 months · TTM revenue $450k"
                      rows={2}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none resize-none"
                    />
                  </div>
                  {bizOwnership && bizValuation && (
                    <div className="rounded-lg bg-violet-50 border border-violet-200 px-4 py-3">
                      <p className="text-xs text-violet-600">Your equity stake</p>
                      <p className="text-lg font-bold text-violet-700">
                        {fmt((Number(bizValuation) * Number(bizOwnership)) / 100)}
                      </p>
                      <p className="text-[11px] text-violet-500 mt-0.5">{Number(bizOwnership)}% of {fmt(Number(bizValuation))}</p>
                    </div>
                  )}
                </>
              )}

              {/* ── Other ──────────────────────────────────────────────────── */}
              {category === 'other' && (
                <>
                  {inp('Asset name', otherName, setOtherName, { required: true })}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Asset type</label>
                    <select value={otherType} onChange={e => setOtherType(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
                      <option value="whole_life">Whole life insurance (cash value)</option>
                      <option value="vehicle">Vehicle</option>
                      <option value="collectible">Collectibles / art / jewelry</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  {inp('Current estimated value ($)', otherValue, setOtherValue, { type: 'number', prefix: '$', required: true })}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                    <textarea
                      value={otherNotes} onChange={e => setOtherNotes(e.target.value)}
                      placeholder="Any additional context..."
                      rows={2}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none resize-none"
                    />
                  </div>
                </>
              )}

              {formError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                  <p className="text-sm text-red-700">{formError}</p>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        {step === 'details' && (
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
              Cancel
            </button>
            <button
              type="submit"
              form="asset-form"
              disabled={submitting}
              className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition flex items-center justify-center"
            >
              {submitting ? <Spinner className="h-4 w-4" /> : 'Add asset'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
