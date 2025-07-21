import { DashboardStats } from '@/types';
import { TrendingUp, TrendingDown, DollarSign, Target, Users, CheckCircle } from 'lucide-react';

interface StatsCardProps {
  stats: DashboardStats;
}

export default function StatsCard({ stats }: StatsCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const statItems = [
    {
      title: 'Legacy Score',
      value: stats.legacyScore,
      suffix: '/100',
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Net Worth',
      value: formatCurrency(stats.netWorth),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Savings Rate',
      value: stats.savingsRate,
      suffix: '%',
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Active Tasks',
      value: stats.totalActionItems,
      icon: CheckCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statItems.map((item, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{item.title}</p>
              <p className="text-2xl font-bold text-gray-900">
                {item.value}
                {item.suffix && <span className="text-lg text-gray-500">{item.suffix}</span>}
              </p>
            </div>
            <div className={`p-3 rounded-full ${item.bgColor}`}>
              <item.icon className={`w-6 h-6 ${item.color}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 