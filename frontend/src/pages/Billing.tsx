import { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const tiers = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    features: [
      'Manual asset entry (all 4 types)',
      'Restricted assets tracking',
      'Net worth dashboard',
      'Equity ticker lookup',
      'Smart valuation prompts',
    ],
    excluded: ['Flo chat', 'Document parsing'],
    anchor: 'Builds habit and data. No advisory risk.',
    cta: 'Current plan',
    priceId: null,
  },
  {
    id: 'core',
    name: 'Core',
    price: '$349',
    cadence: '/yr · or $39/mo',
    features: [
      'Everything in Free',
      'Flo chat + capital allocation Q&A',
      'Document ingestion (PDF parsing)',
      'Scenario modeling',
      'Goal-gap analysis',
      'Retirement account tax discounting',
      'Net worth history (monthly snapshots)',
      'Allocation drift alerts',
    ],
    excluded: [],
    anchor: '$3,500/yr advisor fee = 10× LegacyOS Core',
    cta: 'Upgrade to Core',
    priceId: import.meta.env.VITE_STRIPE_PRICE_CORE,
    featured: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$899',
    cadence: '/yr · or $99/mo',
    features: [
      'Everything in Core',
      'Tax position tracking + alerts',
      'Estate planning modules',
      'Family governance tools',
      'Generational transfer planning',
      'PDF family summary export',
      'Priority Flo response time',
    ],
    excluded: [],
    anchor: 'Add Advisor tier at $1,800+/yr after PMF.',
    cta: 'Upgrade to Premium',
    priceId: import.meta.env.VITE_STRIPE_PRICE_PREMIUM,
  },
];

export default function Billing() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (priceId: string | undefined, tierId: string) => {
    if (!priceId) return;
    setLoading(tierId);
    try {
      const res = await api.post('/billing/create-checkout', { price_id: priceId });
      window.location.href = res.data.url;
    } catch (err) {
      console.error(err);
      alert('Could not start checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-medium text-ink">Plan & billing</h1>
        <p className="text-sm text-muted mt-0.5">
          Current plan: <span className="font-medium text-ink capitalize">{user?.plan || 'free'}</span>
        </p>
      </div>

      {/* Insight */}
      <div className="mb-6 px-4 py-3 bg-sage-50 border-l-4 border-sage-600 rounded-r-xl text-sm text-sage-700">
        <strong className="font-medium">Pricing context:</strong> A typical financial advisor charges 1% AUM —
        on $500K that's $5,000/yr. LegacyOS Core is $349/yr and covers everything the advisor doesn't:
        governance, generational planning, and your full asset picture.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers.map(tier => {
          const isCurrent = user?.plan === tier.id;
          const isDowngrade = (user?.plan === 'premium' && tier.id === 'core') ||
                              (user?.plan !== 'free' && tier.id === 'free');

          return (
            <div
              key={tier.id}
              className={`bg-white rounded-xl p-5 flex flex-col ${
                tier.featured
                  ? 'border-2 border-flo-100 shadow-sm'
                  : 'border border-black/10'
              }`}
            >
              {tier.featured && (
                <div className="text-xs font-medium text-flo-700 mb-2">Most popular</div>
              )}
              <div className="text-sm font-medium text-ink">{tier.name}</div>
              <div className="mt-2 mb-1">
                <span className="text-2xl font-medium text-ink">{tier.price}</span>
              </div>
              <div className="text-xs text-muted mb-4">{tier.cadence}</div>

              <div className="border-t border-black/5 pt-4 flex-1 space-y-2">
                {tier.features.map(f => (
                  <div key={f} className="flex items-start gap-2 text-xs text-muted">
                    <span className="text-sage-600 mt-0.5">✓</span>
                    <span>{f}</span>
                  </div>
                ))}
                {tier.excluded.map(f => (
                  <div key={f} className="flex items-start gap-2 text-xs text-muted/50">
                    <span className="mt-0.5">✗</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-xs text-sage-700 italic">{tier.anchor}</div>

              <button
                onClick={() => !isCurrent && !isDowngrade && handleUpgrade(tier.priceId ?? undefined, tier.id)}
                disabled={isCurrent || isDowngrade || loading === tier.id}
                className={`mt-4 w-full py-2 text-sm font-medium rounded-lg transition-colors ${
                  isCurrent
                    ? 'bg-black/5 text-muted cursor-default'
                    : isDowngrade
                    ? 'bg-black/5 text-muted/50 cursor-not-allowed'
                    : tier.featured
                    ? 'bg-flo-700 text-white hover:bg-flo-600'
                    : 'bg-ink text-white hover:bg-ink/80'
                } disabled:opacity-50`}
              >
                {isCurrent ? 'Current plan' : loading === tier.id ? 'Redirecting…' : tier.cta}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted text-center mt-6">
        No data monetization. Ever. Your financial data is yours.
      </p>
    </div>
  );
}
