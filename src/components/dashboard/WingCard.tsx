import { Wing, WingProgress } from '@/types';
import { cn } from '@/lib/utils';

interface WingCardProps {
  wing: Wing;
  progress: WingProgress;
  onClick?: () => void;
}

export default function WingCard({ wing, progress, onClick }: WingCardProps) {
  const progressPercentage = Math.min((progress.progressPoints / 100) * 100, 100);
  
  return (
    <div 
      className={cn(
        "bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer",
        onClick && "hover:border-purple-300"
      )}
      onClick={onClick}
    >
      {/* Wing Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg"
            style={{ backgroundColor: wing.color }}
          >
            {wing.icon}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{wing.name}</h3>
            <p className="text-sm text-gray-500">Level {progress.currentLevel}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">{progress.progressPoints}</div>
          <div className="text-xs text-gray-500">points</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="h-2 rounded-full transition-all duration-300"
            style={{ 
              width: `${progressPercentage}%`,
              backgroundColor: wing.color 
            }}
          />
        </div>
      </div>

      {/* Milestones */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-700">Recent Milestones</div>
        {progress.completedMilestones.slice(-2).map((milestone, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
            <span className="text-sm text-gray-600 line-clamp-1">{milestone}</span>
          </div>
        ))}
        {progress.completedMilestones.length === 0 && (
          <div className="text-sm text-gray-400 italic">No milestones completed yet</div>
        )}
      </div>
    </div>
  );
} 