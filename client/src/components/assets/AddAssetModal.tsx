import { useState, useEffect, useRef } from 'react';
import { api, getErrorMessage } from '@/api/client';
import Spinner from '@/components/Spinner';

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = 'equity' | 'real_estate' | 'cash' | 'business' | 'other';
type RESubtype = 'primary' | 'secondary' | 'rental' | 'commercial';
type EquityAccountType = 'taxable' | 'ira' | 'roth_ira' | '401k' | 'crypto';
type Step = 'category' | 'account' | 'details';
type AccountMode = 'existing' | 'new' | null;

interface TickerData {
  ticker: string;
  price: number;
  name?: string;
  sector?: string | null;
  geography?: string | null;
  marketCapCategory?: string | null;
}

interface EquityAccount {
  label: string;
  type: EquityAccountType;
  isPretax: boolean;
  totalValue: number;
  count: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCOUNT_TYPE_LABELS: Record<EquityAccountType, string> = {
  taxable:  'Brokerage',
  ira:      'IRA',
  roth_ira: 'Roth IRA',
  '401k':   '401(k)',
  crypto:   'Crypto',
};

const ACCOUNT_TYPES: { id: EquityAccountType; label: string }[] = [
  { id: 'taxable',  label: 'Brokerage' },
  { id: 'ira',      label: 'IRA' },
  { id: 'roth_ira', label: 'Roth IRA' },
  { id: '401k',     label: '401(k)' },
  { id: 'crypto',   label: 'Crypto' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function dbTypeToAccountType(assetType: string): EquityAccountType {
  if (assetType === 'retirement_401k') return '401k';
  if (assetType === 'retirement_ira')  return 'ira';
  if (assetType === 'crypto')          return 'crypto';
  return 'taxable';
}

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
      <div className="space-y-1 text-xs">
        <div className="flex justify-between text-gray-700"><span>Gross rent</span><span className="font-medium">{fmt(grossRent)}</span></div>
        {isManaged && mgmt > 0 && <div className="flex justify-between text-gray-500"><span>Management ({managementFee}%)</span><span>−{fmt(mgmt)}</span></div>}
        {vacancy > 0 && <div className="flex justify-between text-gray-500"><span>Vacancy ({vacancyRate}%)</span><span>−{fmt(vacancy)}</span></div>}
        {piti > 0 && <div className="flex justify-between text-gray-500"><span>Mortgage (PITI)</span><span>−{fmt(piti)}</span></div>}
        {insurance > 0 && <div className="flex justify-between text-gray-500"><span>Insurance</span><span>−{fmt(insurance)}</span></div>}
        {hoa > 0 && <div className="flex justify-between text-gray-500"><span>HOA</span><span>−{fmt(hoa)}</span></div>}
        {maintenanceMonthly > 0 && <div className="flex justify-between text-gray-500"><span>Maintenance reserve</span><span>−{fmt(maintenanceMonthly)}</span></div>}
        {capexMonthly > 0 && <div className="flex justify-between text-gray-500"><span>CapEx reserve</span><span>−{fmt(capexMonthly)}</span></div>}
        <div className={`flex justify-between border-t border-gray-200 pt-1.5 font-bold text-sm ${cfColor}`}>
          <span>Monthly cash flow</span><span>{fmt(monthlyCF)}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 pt-1">
        {[
          { label: 'Cash-on-cash', value: cashOnCash, tip: 'Annual CF ÷ down payment' },
          { label: 'Cap rate',     value: capRate,    tip: 'NOI ÷ property value' },
          { label: 'Return on equity', value: roe,    tip: 'Annual CF ÷ equity' },
        ].map(m => (
          <div key={m.label} className="rounded-lg bg-white border border-gray-200 p-2 text-center" title={m.tip}>
            <p className={`text-base font-bold ${m.value >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{m.value.toFixed(1)}%</p>
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
  const [step, setStep] = useState<Step>('category');
  const [category, setCategory] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // ── Account picker state ───────────────────────────────────────────────────
  const [accountMode, setAccountMode] = useState<AccountMode>(null);
  const [equityAccounts, setEquityAccounts] = useState<EquityAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // ── Equity form state ──────────────────────────────────────────────────────
  const [eqAccountType, setEqAccountType] = useState<EquityAccountType>('taxable');
  const [eqLabel, setEqLabel]       = useState('');
  const [eqTicker, setEqTicker]     = useState('');
  const [eqPositionName, setEqPositionName] = useState(''); // manual fund/position name (401k etc.)
  const [eqShares, setEqShares]     = useState('');
  const [eqCostBasis, setEqCostBasis] = useState('');
  const [eqIsPretax, setEqIsPretax] = useState(false);
  const [tickerData, setTickerData] = useState<TickerData | null>(null);
  const [tickerLoading, setTickerLoading] = useState(false);
  const [tickerError, setTickerError] = useState('');
  const [isCashPosition, setIsCashPosition] = useState(false);
  const [cashPositionValue, setCashPositionValue] = useState('');
  const [isManualEntry, setIsManualEntry] = useState(false); // manual investment (not cash)
  const [manualPositionValue, setManualPositionValue] = useState('');
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
  const [reRent, setReRent]         = useState('');
  const [reIsManaged, setReIsManaged] = useState(false);
  const [reMgmtFee, setReMgmtFee]   = useState('10');
  const [reMaintenance, setReMaintenance] = useState('');
  const [reCapex, setReCapex]       = useState('');
  const [reVacancy, setReVacancy]   = useState('5');
  const [reMaintenancePct, setReMaintenancePct] = useState('1');

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

  // ── Fetch existing equity accounts ─────────────────────────────────────────
  async function fetchEquityAccounts() {
    setLoadingAccounts(true);
    try {
      const { data } = await api.get('/assets');
      const assets: Array<{ assetClass: string; assetType: string; accountLabel: string | null; currentValue: number | null; isPretax: boolean }> = data.assets;
      const map = new Map<string, EquityAccount>();
      for (const a of assets.filter(x => x.assetClass === 'equity' && x.accountLabel)) {
        const key = a.accountLabel!;
        if (!map.has(key)) {
          map.set(key, {
            label: key,
            type: dbTypeToAccountType(a.assetType),
            isPretax: a.isPretax,
            totalValue: 0,
            count: 0,
          });
        }
        const acct = map.get(key)!;
        acct.totalValue += Number(a.currentValue) || 0;
        acct.count++;
      }
      setEquityAccounts(Array.from(map.values()));
    } catch { /* ignore */ }
    finally { setLoadingAccounts(false); }
  }

  // ── Ticker lookup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!eqTicker || eqTicker.length < 1) {
      setTickerData(null);
      setTickerError('');
      return;
    }
    setIsCashPosition(false);
    setCashPositionValue('');
    setIsManualEntry(false);
    setManualPositionValue('');
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

  // ── Auto-calculate maintenance reserve ────────────────────────────────────
  const autoMaintenance = reEstValue && reMaintenancePct
    ? ((Number(reEstValue) * Number(reMaintenancePct)) / 100 / 12).toFixed(0)
    : '';

  // ── Navigation ────────────────────────────────────────────────────────────
  function selectCategory(cat: Category) {
    setCategory(cat);
    setFormError('');
    if (cat === 'equity') {
      setStep('account');
      fetchEquityAccounts();
    } else {
      setStep('details');
    }
  }

  function selectExistingAccount(acct: EquityAccount) {
    setEqLabel(acct.label);
    setEqAccountType(acct.type);
    setEqIsPretax(acct.isPretax);
    setAccountMode('existing');
    setStep('details');
  }

  function selectNewAccount() {
    setAccountMode('new');
    setEqLabel('');
    setEqAccountType('taxable');
    setEqIsPretax(false);
    setStep('details');
  }

  function goBack() {
    if (step === 'details' && category === 'equity') {
      setStep('account');
      setFormError('');
    } else if (step === 'details' || step === 'account') {
      setStep('category');
      setCategory(null);
      setAccountMode(null);
      setFormError('');
    }
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
        const isCrypto = eqAccountType === 'crypto';
        const assetType = eqAccountType === '401k'    ? 'retirement_401k'
                        : eqAccountType === 'ira'      ? 'retirement_ira'
                        : eqAccountType === 'roth_ira' ? 'retirement_ira'
                        : isCrypto ? 'crypto'
                        : 'stock';

        if (isCashPosition) {
          // Cash / money market position (FCASH, SPAXX, etc.) — no shares, just a dollar value
          body = {
            assetClass: 'equity',
            assetType,
            name: eqTicker ? eqTicker.toUpperCase() : 'Uninvested Cash',
            ticker: eqTicker ? eqTicker.toUpperCase() : undefined,
            accountLabel: eqLabel || undefined,
            isPretax,
            currentValue: Number(cashPositionValue),
            currentValueSource: 'manual',
          };
        } else if (isManualEntry) {
          // Manual investment position — 401k fund, mutual fund, or any position without auto-pricing
          const positionName = eqPositionName.trim()
            || (eqTicker ? eqTicker.toUpperCase() : 'Investment Position');
          body = {
            assetClass: 'equity',
            assetType,
            name: positionName,
            ticker: eqTicker ? eqTicker.toUpperCase() : undefined,
            sharesHeld: eqShares ? Number(eqShares) : undefined,
            costBasisPerShare: eqCostBasis ? Number(eqCostBasis) : undefined,
            accountLabel: eqLabel || undefined,
            isPretax,
            currentValue: Number(manualPositionValue),
            currentValueSource: 'manual',
          };
        } else {
          const shares = Number(eqShares);
          const price = tickerData?.price ?? 0;
          // Fund name takes priority over auto-fetched name (important for 401k)
          const positionName = eqPositionName.trim()
            || tickerData?.name
            || (eqTicker ? eqTicker.toUpperCase() : eqLabel);
          body = {
            assetClass: 'equity',
            assetType,
            name: positionName,
            ticker: eqTicker ? eqTicker.toUpperCase() : undefined,
            sharesHeld: shares,
            costBasisPerShare: eqCostBasis ? Number(eqCostBasis) : undefined,
            accountLabel: eqLabel || undefined,
            isPretax,
            currentValue: shares > 0 && price > 0 ? parseFloat((shares * price).toFixed(2)) : undefined,
            // Enrichment from Yahoo Finance (populated automatically on ticker resolve)
            sector:            tickerData?.sector ?? null,
            geography:         tickerData?.geography ?? null,
            marketCapCategory: tickerData?.marketCapCategory ?? null,
          };
        }
      }

      else if (category === 'real_estate') {
        const isRental = reSubtype === 'rental';
        const maintenanceMonthly = reMaintenance
          ? Number(reMaintenance)
          : (autoMaintenance ? Number(autoMaintenance) : undefined);
        body = {
          assetClass: 'real_estate',
          assetType: reSubtype === 'primary'   ? 'primary_residence'
                   : reSubtype === 'secondary' ? 'secondary_residence'
                   : reSubtype === 'rental'    ? 'rental'
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

  const headerTitle =
    step === 'category' ? 'Add asset' :
    step === 'account'  ? 'Choose account' :
    accountMode === 'existing' ? `Add position to ${eqLabel}` :
    CATEGORIES.find(c => c.id === category)?.label ?? 'Add asset';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            {step !== 'category' && (
              <button onClick={goBack} className="text-gray-400 hover:text-gray-700 text-sm">
                ← Back
              </button>
            )}
            <h2 className="text-base font-bold text-gray-900 truncate max-w-[260px]">{headerTitle}</h2>
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

          {/* ── Step 2: Account picker (equity only) ──────────────────────── */}
          {step === 'account' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">Which account is this position for?</p>

              {loadingAccounts ? (
                <div className="flex justify-center py-6"><Spinner className="h-5 w-5" /></div>
              ) : (
                <>
                  {/* Existing accounts */}
                  {equityAccounts.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Existing accounts</p>
                      {equityAccounts.map(acct => (
                        <button
                          key={acct.label}
                          type="button"
                          onClick={() => selectExistingAccount(acct)}
                          className="w-full flex items-center justify-between rounded-xl border border-gray-200 p-4 text-left hover:border-brand-400 hover:bg-brand-50 transition group"
                        >
                          <div>
                            <p className="text-sm font-semibold text-gray-900 group-hover:text-brand-700">{acct.label}</p>
                            <p className="text-xs text-gray-500">
                              {ACCOUNT_TYPE_LABELS[acct.type]}
                              {acct.isPretax && ' · Pre-tax'}
                              {' · '}{acct.count} position{acct.count !== 1 ? 's' : ''}
                              {acct.totalValue > 0 && ` · ${fmt(acct.totalValue)}`}
                            </p>
                          </div>
                          <span className="text-gray-300 group-hover:text-brand-400 text-lg">→</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* New account */}
                  <button
                    type="button"
                    onClick={selectNewAccount}
                    className="w-full flex items-center gap-4 rounded-xl border-2 border-dashed border-gray-300 p-4 text-left hover:border-brand-400 hover:bg-brand-50 transition group"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-lg group-hover:bg-brand-100 group-hover:text-brand-700">+</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-700 group-hover:text-brand-700">New account</p>
                      <p className="text-xs text-gray-400">Create a new brokerage, IRA, crypto, or retirement account</p>
                    </div>
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── Step 3: Details forms ─────────────────────────────────────── */}
          {step === 'details' && (
            <form id="asset-form" onSubmit={handleSubmit} className="space-y-4">

              {/* ── Equities & Crypto ──────────────────────────────────────── */}
              {category === 'equity' && (
                <>
                  {/* Existing account — show badge */}
                  {accountMode === 'existing' && (
                    <div className="flex items-center gap-2 rounded-lg bg-brand-50 border border-brand-200 px-4 py-3">
                      <span className="text-brand-700 font-semibold text-sm">{eqLabel}</span>
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-600">
                        {ACCOUNT_TYPE_LABELS[eqAccountType]}
                      </span>
                      {eqIsPretax && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Pre-tax</span>
                      )}
                    </div>
                  )}

                  {/* New account — show name + type fields */}
                  {accountMode === 'new' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-2">Account type</label>
                        <div className="grid grid-cols-5 gap-2">
                          {ACCOUNT_TYPES.map(opt => (
                            <button
                              key={opt.id} type="button"
                              onClick={() => {
                                setEqAccountType(opt.id);
                                setEqIsPretax(opt.id === '401k' || opt.id === 'ira');
                              }}
                              className={`rounded-lg border py-2 text-xs font-semibold transition ${eqAccountType === opt.id ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {inp('Account name', eqLabel, setEqLabel, { placeholder: 'e.g. Fidelity Brokerage, Schwab IRA', required: true })}
                      {(eqAccountType === '401k' || eqAccountType === 'ira') && (
                        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                          <p className="text-xs text-amber-700">⚠ Pre-tax account — LegacyOS will show an estimated after-tax value based on your assumed tax rate.</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Divider */}
                  {accountMode === 'new' && (
                    <div className="border-t border-gray-100 pt-2">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">Position details</p>
                    </div>
                  )}

                  {/* Fund name — always shown for 401k; also shown in manual-entry mode */}
                  {(eqAccountType === '401k' || isManualEntry) && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Fund / position name{isManualEntry && !eqPositionName && <span className="text-red-500 ml-0.5">*</span>}
                      </label>
                      <input
                        value={eqPositionName}
                        onChange={e => setEqPositionName(e.target.value)}
                        placeholder="e.g. JP Morgan Large Growth R6, Retirement 2060 Fund"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-200"
                      />
                      {eqAccountType === '401k' && (
                        <p className="text-[11px] text-gray-400 mt-1">
                          Enter the name exactly as it appears in your plan portal.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Ticker lookup */}
                  {!isManualEntry && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      {eqAccountType === 'crypto' ? 'Coin symbol' :
                       eqAccountType === '401k'   ? 'Fund ticker' :
                       'Ticker symbol'}
                      {eqAccountType !== '401k' && (
                        <span className="ml-1 font-normal text-gray-400">(optional for broad funds)</span>
                      )}
                    </label>
                    {eqAccountType === '401k' && (
                      <p className="text-[11px] text-gray-400 mb-1">
                        Optional — check your plan portal or search <span className="underline">finance.yahoo.com</span>. Examples: JLGMX, FXAIX, TRRLX.
                      </p>
                    )}
                    <div className="relative">
                      <input
                        value={eqTicker}
                        onChange={e => setEqTicker(e.target.value.toUpperCase())}
                        placeholder={
                          eqAccountType === 'crypto' ? 'BTC, ETH, SOL...' :
                          eqAccountType === '401k'   ? 'e.g. JLGMX (optional)' :
                          'AAPL, VTSAX, VOO...'
                        }
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm uppercase focus:border-brand-500 focus:outline-none"
                      />
                      {tickerLoading && <Spinner className="absolute right-3 top-2.5 h-4 w-4" />}
                    </div>
                    {tickerError && !isCashPosition && (
                      <div className="mt-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 space-y-2">
                        <p className="text-xs text-red-600">{tickerError}</p>
                        <div className="flex flex-col gap-1.5">
                          <button
                            type="button"
                            onClick={() => { setIsManualEntry(true); setTickerError(''); }}
                            className="text-xs text-brand-600 hover:underline font-medium text-left"
                          >
                            📊 Track as investment position (enter value manually)
                          </button>
                          <button
                            type="button"
                            onClick={() => { setIsCashPosition(true); setTickerError(''); }}
                            className="text-xs text-brand-600 hover:underline font-medium text-left"
                          >
                            💵 This is uninvested cash or a money market fund
                          </button>
                        </div>
                      </div>
                    )}
                    {/* Also let them skip ticker and go manual directly (401k) */}
                    {eqAccountType === '401k' && !eqTicker && !tickerError && (
                      <button
                        type="button"
                        onClick={() => { setIsManualEntry(true); }}
                        className="mt-1.5 text-[11px] text-brand-600 hover:underline font-medium"
                      >
                        Don't have the ticker? Enter value manually →
                      </button>
                    )}
                    {tickerData && (
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-600">
                        <span className="font-semibold text-emerald-700">${tickerData.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span className="text-gray-400">per share · NAV</span>
                        <span className="text-gray-400">·</span>
                        <span>{tickerData.name}</span>
                      </div>
                    )}
                  </div>
                  )}

                  {/* Manual investment entry mode */}
                  {isManualEntry ? (
                    <div className="space-y-3">
                      <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 flex items-center justify-between">
                        <p className="text-xs text-blue-700">
                          📊 Manual entry — update the value when your statement refreshes
                        </p>
                        <button
                          type="button"
                          onClick={() => { setIsManualEntry(false); setManualPositionValue(''); }}
                          className="text-[11px] text-gray-400 hover:text-gray-600 ml-2 flex-shrink-0"
                        >
                          ✕ Undo
                        </button>
                      </div>
                      {/* Current total value */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Current position value ($)<span className="text-red-500 ml-0.5">*</span>
                        </label>
                        <div className="relative flex items-center">
                          <span className="absolute left-2.5 text-gray-400 text-sm">$</span>
                          <input
                            required
                            type="number"
                            step="0.01"
                            min="0"
                            value={manualPositionValue}
                            onChange={e => setManualPositionValue(e.target.value)}
                            placeholder="0.00"
                            className="w-full rounded-lg border border-gray-200 py-2 pl-7 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-200"
                          />
                        </div>
                      </div>
                      {/* Optional shares */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Shares / units held <span className="font-normal text-gray-400">(optional)</span>
                        </label>
                        <input
                          type="number"
                          step="0.000000001"
                          min="0"
                          value={eqShares}
                          onChange={e => setEqShares(e.target.value)}
                          placeholder="0.000"
                          className="w-full rounded-lg border border-gray-200 py-2 pl-3 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-200"
                        />
                      </div>
                      {/* Optional cost basis */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Cost basis per share ($) <span className="font-normal text-gray-400">(optional)</span>
                        </label>
                        <p className="text-[11px] text-gray-400 mb-1">Used for unrealized gain/loss tracking</p>
                        <div className="relative flex items-center">
                          <span className="absolute left-2.5 text-gray-400 text-sm">$</span>
                          <input
                            type="number"
                            step="0.00001"
                            min="0"
                            value={eqCostBasis}
                            onChange={e => setEqCostBasis(e.target.value)}
                            placeholder="0.00000"
                            className="w-full rounded-lg border border-gray-200 py-2 pl-7 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-200"
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Cash position mode */}
                  {!isManualEntry && isCashPosition && (
                    <div className="space-y-3">
                      <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 flex items-center justify-between">
                        <p className="text-xs text-emerald-700">
                          💵 Tracked as cash — value updated manually, not by price feed
                        </p>
                        <button
                          type="button"
                          onClick={() => { setIsCashPosition(false); setCashPositionValue(''); }}
                          className="text-[11px] text-gray-400 hover:text-gray-600 ml-2 flex-shrink-0"
                        >
                          ✕ Undo
                        </button>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Cash balance ($)<span className="text-red-500 ml-0.5">*</span>
                        </label>
                        <div className="relative flex items-center">
                          <span className="absolute left-2.5 text-gray-400 text-sm">$</span>
                          <input
                            required
                            type="number"
                            step="0.01"
                            min="0"
                            value={cashPositionValue}
                            onChange={e => setCashPositionValue(e.target.value)}
                            placeholder="0.00"
                            className="w-full rounded-lg border border-gray-200 py-2 pl-7 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-200"
                          />
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">
                          Counts toward this account's total. Update manually when it changes.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Auto-price mode — ticker + shares */}
                  {!isManualEntry && !isCashPosition && (
                    <>
                      {/* Shares — allow up to 9 decimal places for crypto fractions */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Shares / units held<span className="text-red-500 ml-0.5">*</span>
                        </label>
                        <input
                          required
                          type="number"
                          step="0.000000001"
                          min="0"
                          value={eqShares}
                          onChange={e => setEqShares(e.target.value)}
                          placeholder="0.00"
                          className="w-full rounded-lg border border-gray-200 py-2 pl-3 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-200"
                        />
                      </div>

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
                          <p className="text-xs text-blue-600">💡 Enter a ticker to look up the live price. Your position value will be calculated and updated on a regular schedule.</p>
                        </div>
                      )}

                      {/* Cost basis — 5 decimal places for low-priced crypto */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Cost basis per share ($)</label>
                        <p className="text-[11px] text-gray-400 mb-1">Optional — used for unrealized gain/loss tracking</p>
                        <div className="relative flex items-center">
                          <span className="absolute left-2.5 text-gray-400 text-sm">$</span>
                          <input
                            type="number"
                            step="0.00001"
                            min="0"
                            value={eqCostBasis}
                            onChange={e => setEqCostBasis(e.target.value)}
                            placeholder="0.00000"
                            className="w-full rounded-lg border border-gray-200 py-2 pl-7 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-200"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* ── Real Estate ────────────────────────────────────────────── */}
              {category === 'real_estate' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">Property type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { id: 'primary',    label: '🏡 Primary Home',    desc: 'Where you live' },
                        { id: 'secondary',  label: '🏖 Secondary Home',  desc: 'Vacation / second home' },
                        { id: 'rental',     label: '🏘 Rental Property', desc: 'Income-generating residential' },
                        { id: 'commercial', label: '🏢 Commercial',      desc: 'Office, retail, industrial, 5+ units' },
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
                  {(reSubtype === 'primary' || reSubtype === 'secondary') && reEstValue && (
                    <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
                      <p className="text-xs text-blue-600">Estimated equity</p>
                      <p className="text-lg font-bold text-blue-700">
                        {fmt(Math.max(0, Number(reEstValue) * 0.91 - Number(reMortgage || 0)))}
                      </p>
                      <p className="text-[11px] text-blue-500 mt-0.5">91% of estimated value (net of selling costs) minus mortgage balance</p>
                    </div>
                  )}
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
                      <option value="bonds">Bonds (corporate / muni / agency)</option>
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
                      <option value="precious_metals">Precious metals (gold, silver, platinum)</option>
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
              {submitting ? <Spinner className="h-4 w-4" /> : 'Add position'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
