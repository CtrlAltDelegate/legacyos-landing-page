interface LegacyScoreDisplayProps {
  score: number;
  maxScore?: number;
  showDetails?: boolean;
}

export default function LegacyScoreDisplay({ 
  score, 
  maxScore = 100, 
  showDetails = true 
}: LegacyScoreDisplayProps) {
  const percentage = Math.min((score / maxScore) * 100, 100);
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Attention';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="text-center">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Legacy Score</h3>
          <div className={`text-5xl font-bold ${getScoreColor(score)}`}>
            {score}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            out of {maxScore}
          </div>
        </div>

        {/* Circular Progress */}
        <div className="relative w-32 h-32 mx-auto mb-4">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
            {/* Background circle */}
            <path
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="3"
            />
            {/* Progress circle */}
            <path
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${percentage}, 100`}
              className={getProgressColor(score).replace('bg-', 'text-')}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-semibold text-gray-700">
              {Math.round(percentage)}%
            </span>
          </div>
        </div>

        {showDetails && (
          <div className="space-y-3">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(score).replace('text-', 'text-')} ${getProgressColor(score).replace('bg-', 'bg-').replace('500', '100')}`}>
              {getScoreLabel(score)}
            </div>
            
            <div className="text-xs text-gray-500 space-y-1">
              <p>Your family's progress across all six wings</p>
              <p>Continue completing milestones to improve your score</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 