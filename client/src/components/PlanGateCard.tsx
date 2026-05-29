import { useState } from 'react';
import { Sparkles, Lock } from 'lucide-react';
import { api, getErrorMessage } from '@/api/client';
import Spinner from '@/components/Spinner';

interface Props {
  requiredPlan?: string;
  featureName: string;
  description: string;
}

/**
 * Shown when a user on the free plan tries to access a Core+ feature.
 * Triggers a Stripe Checkout session and redirects them to upgrade.
 */
export default function PlanGateCard({ requiredPlan = 'core', featureName, description }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleUpgrade() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/billing/checkout', { plan: requiredPlan });
      window.location.href = data.url;
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  }

  const planLabel = requiredPlan === 'premium' ? 'Premium' : 'Core';

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-16 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 border border-brand-100">
        <Lock className="h-6 w-6 text-brand-500" />
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-2">
        {featureName} is a {planLabel} feature
      </h2>
      <p className="text-sm text-gray-500 max-w-sm leading-relaxed mb-8">
        {description}
      </p>

      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="btn-primary px-6 py-3 text-sm gap-2"
      >
        {loading ? (
          <Spinner className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {loading ? 'Redirecting…' : `Upgrade to ${planLabel}`}
      </button>

      {error && (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      )}

      <p className="mt-4 text-xs text-gray-400">
        Secure checkout powered by Stripe · Cancel anytime
      </p>
    </div>
  );
}

// ─── Helper to detect plan-gate errors from the API ──────────────────────────

export function isPlanGateError(err: unknown): { requiredPlan: string } | null {
  if (
    err &&
    typeof err === 'object' &&
    'response' in err &&
    (err as { response?: { data?: { code?: string; requiredPlan?: string } } }).response?.data?.code === 'PLAN_REQUIRED'
  ) {
    const plan = (err as { response: { data: { requiredPlan?: string } } }).response.data.requiredPlan ?? 'core';
    return { requiredPlan: plan };
  }
  return null;
}
