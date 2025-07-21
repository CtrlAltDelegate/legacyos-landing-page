import React, { useState } from 'react';
import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';
import Head from 'next/head';
import DashboardLayout from '@/components/layout/DashboardLayout';
import WingCard from '@/components/dashboard/WingCard';
import StatsCard from '@/components/dashboard/StatsCard';
import ActionItemCard from '@/components/dashboard/ActionItemCard';
import LegacyScoreDisplay from '@/components/dashboard/LegacyScoreDisplay';
import { DashboardStats, WingProgress, ActionItem } from '@/types';

interface DashboardPageProps {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    familyName?: string;
  };
  stats: DashboardStats;
  wingProgress: WingProgress[];
  actionItems: ActionItem[];
}

export default function DashboardPage() {
  const [selectedWing, setSelectedWing] = useState<string | null>(null);
  
  // Mock data for development - TODO: Replace with real data from API
  const user = {
    id: '1',
    firstName: 'Demo',
    lastName: 'User',
    familyName: 'Demo Family'
  };
  
  const stats = {
    legacyScore: 73,
    netWorth: 47332,
    netWorthChange: 12.5,
    savingsRate: 34,
    savingsRateChange: 5.2,
    totalActionItems: 5,
    completedThisMonth: 3,
    familyMembers: 4,
    activeGoals: 12,
    completionRate: 75,
    nextReviewDays: 14
  };
  
  const wingProgress: any[] = [];
  const actionItems: any[] = [];

  return (
    <>
      <Head>
        <title>Dashboard - LegacyOS</title>
        <meta name="description" content="Your family office dashboard" />
      </Head>

      <DashboardLayout>
        {/* Header */}
        <div className="bg-white border-b border-neutral-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-neutral-800">
              Welcome back, {user.firstName}!
            </h1>
            <p className="text-neutral-600">Here's your family's wealth building progress</p>
          </div>
          
          <LegacyScoreDisplay score={73} />
        </div>

        {/* Main Content */}
        <div className="p-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Net Worth"
              value={stats.netWorth}
              change={stats.netWorthChange}
              format="currency"
              trend="up"
            />
            <StatsCard
              title="Savings Rate"
              value={stats.savingsRate}
              change={stats.savingsRateChange}
              format="percentage"
              trend="up"
            />
            <StatsCard
              title="Active Goals"
              value={stats.activeGoals}
              subtitle={`${stats.completionRate}% completion rate`}
              format="number"
            />
            <StatsCard
              title="Next Review"
              value={stats.nextReviewDays}
              subtitle="Q4 2025"
              format="days"
            />
          </div>

          {/* Wing Progress Section */}
          <div className="bg-white rounded-2xl shadow-soft p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-neutral-800">SIXWING Progress</h2>
              <button className="text-primary-500 hover:text-primary-600 font-semibold">
                View All Wings →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {wingProgress.map((progress) => (
                <WingCard
                  key={progress.id}
                  wing={progress.wing}
                  progress={progress}
                  onClick={() => setSelectedWing(progress.wingId)}
                />
              ))}
            </div>
          </div>

          {/* Action Items & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Priority Actions */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-soft p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-neutral-800">Priority Actions This Week</h2>
                <button className="text-primary-500 hover:text-primary-600 font-semibold">
                  View All →
                </button>
              </div>

              <div className="space-y-4">
                {actionItems.slice(0, 4).map((item) => (
                  <ActionItemCard key={item.id} actionItem={item} />
                ))}
              </div>
            </div>

            {/* Quick Actions Widget */}
            <div className="bg-gradient-to-br from-primary-500 to-secondary-500 text-white rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-3">Quick Actions</h3>
              <p className="text-primary-100 mb-6">
                Fast-track your progress with these one-click integrations and tools
              </p>
              
              <div className="space-y-3">
                <QuickActionButton icon="💰" text="Open Fidelity Account" />
                <QuickActionButton icon="📄" text="Complete Trust & Will" />
                <QuickActionButton icon="🏦" text="Set Up Auto-Transfer" />
                <QuickActionButton icon="📊" text="Generate Report" />
                <QuickActionButton icon="👨‍👩‍👧‍👦" text="Invite Spouse" />
                <QuickActionButton icon="📅" text="Schedule Review" />
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}

function QuickActionButton({ icon, text }: { icon: string; text: string }) {
  return (
    <button className="w-full bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2">
      <span>{icon}</span>
      <span>{text}</span>
    </button>
  );
}

// Temporarily disabled to allow app startup without database
// TODO: Re-enable after database is set up
/*
export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);
  
  if (!session) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  // Fetch user data and dashboard stats
  // This would normally come from your API
  const mockData = {
    user: {
      id: session.user.id,
      firstName: 'John',
      lastName: 'Johnson',
      familyName: 'The Johnson Family',
    },
    stats: {
      netWorth: 47332,
      netWorthChange: 14.8,
      savingsRate: 34,
      savingsRateChange: 6,
      activeGoals: 5,
      completionRate: 83,
      nextReviewDays: 45,
    },
    wingProgress: [
      {
        id: '1',
        userId: session.user.id,
        wingId: 'growth',
        wing: {
          id: 'growth',
          name: 'Growth',
          slug: 'growth',
          icon: '🚀',
          color: '#22c55e',
          description: 'Build wealth through smart investing',
          order: 1,
          levels: [],
        },
        currentLevel: 2,
        progressPoints: 65,
        completedMilestones: ['milestone1', 'milestone2'],
        lastActivity: new Date(),
        updatedAt: new Date(),
      },
      // Add other wings...
    ],
    actionItems: [
      {
        id: '1',
        userId: session.user.id,
        title: 'Build Emergency Fund',
        description: 'Your Preservation wing is lagging behind. Increase automatic savings to reach your 3-month expense goal faster.',
        priority: 'HIGH' as const,
        status: 'PENDING' as const,
        estimatedHours: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Add other action items...
    ],
  };

  return {
    props: mockData,
  };
};
*/ 