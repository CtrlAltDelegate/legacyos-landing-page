import { useState } from 'react';
import { Link } from 'react-router-dom';
import { completeTodo, dismissTodo, type TodoItem } from '@/api/todos';

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORY: Record<string, { label: string; emoji: string; bg: string; text: string }> = {
  document: { label: 'Document',   emoji: '📄', bg: 'bg-blue-50',   text: 'text-blue-700' },
  action:   { label: 'Action',     emoji: '⚡', bg: 'bg-amber-50',  text: 'text-amber-700' },
  review:   { label: 'Review',     emoji: '🔍', bg: 'bg-violet-50', text: 'text-violet-700' },
};

const WING_EMOJI: Record<string, string> = {
  growth: '📈', preservation: '🛡️', philanthropy: '❤️',
  experiences: '🌟', legacy: '📜', operations: '⚙️',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  todos: TodoItem[];
  onTodoComplete: (id: string) => void;
  onTodoDismiss: (id: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TodoList({ todos, onTodoComplete, onTodoDismiss }: Props) {
  const [completing, setCompleting] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function handleComplete(id: string) {
    setCompleting(id);
    try {
      await completeTodo(id);
      onTodoComplete(id);
    } finally {
      setCompleting(null);
    }
  }

  async function handleDismiss(id: string) {
    setDismissing(id);
    try {
      await dismissTodo(id);
      onTodoDismiss(id);
    } finally {
      setDismissing(null);
    }
  }

  if (!todos.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Action Items
          </h2>
        </div>
        <div className="text-center py-6">
          <div className="text-3xl mb-2">✅</div>
          <p className="text-sm font-semibold text-gray-600">All caught up!</p>
          <p className="text-xs text-gray-400 mt-1">
            Complete your family profile to generate personalized action items.
          </p>
        </div>
      </div>
    );
  }

  // Separate by category for ordering: action → document → review
  const sorted = [...todos].sort((a, b) => a.priority - b.priority);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Action Items
          </h2>
          <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">
            {todos.length}
          </span>
        </div>
      </div>

      {/* Todo items */}
      <div className="space-y-2">
        {sorted.map((todo) => {
          const cat = CATEGORY[todo.category] ?? CATEGORY.action;
          const isExpanded = expanded === todo.id;
          const isCompleting = completing === todo.id;
          const isDismissing = dismissing === todo.id;

          return (
            <div
              key={todo.id}
              className={`rounded-xl border border-gray-100 bg-gray-50 transition-all ${
                isExpanded ? 'shadow-sm' : ''
              }`}
            >
              {/* Main row */}
              <div
                className="flex items-start gap-3 px-4 py-3 cursor-pointer"
                onClick={() => setExpanded(isExpanded ? null : todo.id)}
              >
                {/* Complete checkbox */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleComplete(todo.id); }}
                  disabled={isCompleting}
                  className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-gray-300 hover:border-green-400 hover:bg-green-50 transition flex items-center justify-center"
                >
                  {isCompleting && (
                    <div className="h-2.5 w-2.5 rounded-full bg-green-400 animate-pulse" />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-800 leading-snug">
                      {todo.title}
                    </p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cat.bg} ${cat.text}`}>
                      {cat.emoji} {cat.label}
                    </span>
                    {todo.relatedWing && (
                      <span className="shrink-0 text-[10px] text-gray-400">
                        {WING_EMOJI[todo.relatedWing]} {todo.relatedWing}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expand chevron */}
                <span className={`text-gray-300 text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                  ▾
                </span>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                  {todo.description && (
                    <p className="text-xs text-gray-500 leading-relaxed">{todo.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {/* Action link */}
                    {todo.actionUrl && (
                      todo.isInternal ? (
                        <Link
                          to={todo.actionUrl}
                          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {todo.category === 'document' ? 'Upload document →' : 'Take action →'}
                        </Link>
                      ) : (
                        <a
                          href={todo.actionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Get started ↗
                        </a>
                      )
                    )}

                    {/* Mark done */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleComplete(todo.id); }}
                      disabled={isCompleting}
                      className="rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 transition disabled:opacity-50"
                    >
                      ✓ Mark complete
                    </button>

                    {/* Dismiss */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDismiss(todo.id); }}
                      disabled={isDismissing}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
