import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/auth';
import Spinner from '@/components/Spinner';
import PlanGateCard from '@/components/PlanGateCard';
import BenchmarkChart, { type BenchmarkPoint } from '@/components/BenchmarkChart';
import TrajectoryChart, { type TrajectorySnapshot, type TrajectoryGoal } from '@/components/TrajectoryChart';

export default function Analytics() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [benchmarkData, setBenchmarkData] = useState<BenchmarkPoint[]>([]);
  const [hasBenchmarkData, setHasBenchmarkData] = useState(false);
  const [snapshots, setSnapshots] = useState<TrajectorySnapshot[]>([]);
  const [goal, setGoal] = useState<TrajectoryGoal | null>(null);

  // Frontend plan gate — show upgrade prompt before hitting the API
  const isPremium = user?.plan === 'premium' || user?.isAdmin;

  useEffect(() => {
    if (!isPremium) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const [benchRes, snapshotRes, goalRes] = await Promise.all([
          api.get('/analytics/benchmark?months=24'),
          api.get('/networth/snapshots?limit=24'),
          api.get('/goals'),
        ]);

        setBenchmarkData(benchRes.data.data ?? []);
        setHasBenchmarkData(benchRes.data.hasData ?? false);
        setSnapshots(snapshotRes.data.snapshots ?? []);
        setGoal(goalRes.data.goal ?? null);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isPremium]);

  if (!isPremium) {
    return (
      <PlanGateCard
        requiredPlan="premium"
        featureName="Advanced Analytics"
        description="See how your portfolio stacks up against the S&P 500 and project exactly when you'll hit your wealth goals. Analytics is a Premium feature."
      />
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Analytics</h1>
          <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
            Premium
          </span>
        </div>
        <p className="text-sm text-gray-500 max-w-2xl">
          See how your total portfolio has grown vs. the S&P 500 since you joined, and project exactly when you'll hit your wealth goals.
          Requires at least 2 monthly net worth snapshots — these are captured automatically on the 1st of each month.
          Trends tracks individual metric history (income, loans, retirement balance); Analytics tracks portfolio-level performance over time.
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {/* Chart 1: Portfolio vs S&P 500 */}
      <BenchmarkChart data={benchmarkData} hasData={hasBenchmarkData} />

      {/* Chart 2: Net Worth Trajectory */}
      <TrajectoryChart snapshots={snapshots} goal={goal} />
    </div>
  );
}
