import { ActionItem } from '@/types';
import { Clock, AlertCircle, CheckCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionItemCardProps {
  actionItem: ActionItem;
  onComplete?: (id: string) => void;
  onEdit?: (id: string) => void;
}

export default function ActionItemCard({ actionItem, onComplete, onEdit }: ActionItemCardProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'text-red-600 bg-red-100';
      case 'MEDIUM':
        return 'text-orange-600 bg-orange-100';
      case 'LOW':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return CheckCircle;
      case 'IN_PROGRESS':
        return Circle;
      default:
        return Circle;
    }
  };

  const StatusIcon = getStatusIcon(actionItem.status);
  const isCompleted = actionItem.status === 'COMPLETED';

  return (
    <div className={cn(
      "bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow",
      isCompleted && "opacity-75"
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <button
            onClick={() => onComplete?.(actionItem.id)}
            className={cn(
              "mt-1 flex-shrink-0",
              isCompleted ? "text-green-600" : "text-gray-400 hover:text-green-600"
            )}
          >
            <StatusIcon className="w-5 h-5" />
          </button>
          
          <div className="flex-1 min-w-0">
            <h4 className={cn(
              "text-sm font-medium text-gray-900",
              isCompleted && "line-through text-gray-500"
            )}>
              {actionItem.title}
            </h4>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {actionItem.description}
            </p>
            
            <div className="flex items-center space-x-3 mt-3">
              <span className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                getPriorityColor(actionItem.priority)
              )}>
                {actionItem.priority}
              </span>
              
              {actionItem.estimatedHours && (
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="w-3 h-3 mr-1" />
                  {actionItem.estimatedHours}h
                </div>
              )}
              
              {actionItem.dueDate && (
                <div className="text-xs text-gray-500">
                  Due {new Date(actionItem.dueDate).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {onEdit && (
          <button
            onClick={() => onEdit(actionItem.id)}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
} 