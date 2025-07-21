import { TrendingUp, TrendingDown, DollarSign, Target, Users, CheckCircle } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number | string;
  change?: number;
  format?: 'currency' | 'percentage' | 'number' | 'days';
  trend?: 'up' | 'down';
  subtitle?: string;
}

export default function StatsCard({ 
  title, 
  value, 
  change, 
  format = 'number', 
  trend, 
  subtitle 
}: StatsCardProps) {
  const formatValue = (value: number | string, format: string) => {
    if (typeof value === 'string') return value;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
      case 'percentage':
        return `${value}%`;
      case 'days':
        return `${value} days`;
      case 'number':
      default:
        return value.toLocaleString();
    }
  };

  const getIcon = (title: string) => {
    if (title.includes('Net Worth')) return DollarSign;
    if (title.includes('Savings')) return TrendingUp;
    if (title.includes('Goals')) return Target;
    if (title.includes('Review')) return CheckCircle;
    return Target;
  };

  const getColors = (title: string) => {
    if (title.includes('Net Worth')) return { text: 'text-green-600', bg: 'bg-green-100' };
    if (title.includes('Savings')) return { text: 'text-blue-600', bg: 'bg-blue-100' };
    if (title.includes('Goals')) return { text: 'text-purple-600', bg: 'bg-purple-100' };
    if (title.includes('Review')) return { text: 'text-orange-600', bg: 'bg-orange-100' };
    return { text: 'text-gray-600', bg: 'bg-gray-100' };
  };

  const Icon = getIcon(title);
  const colors = getColors(title);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatValue(value, format)}
          </p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
          {change !== undefined && (
            <div className={`flex items-center mt-1 text-sm ${
              trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {trend === 'up' && <TrendingUp className="w-3 h-3 mr-1" />}
              {trend === 'down' && <TrendingDown className="w-3 h-3 mr-1" />}
              {change > 0 ? '+' : ''}{change}%
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${colors.bg}`}>
          <Icon className={`w-6 h-6 ${colors.text}`} />
        </div>
      </div>
    </div>
  );
} 