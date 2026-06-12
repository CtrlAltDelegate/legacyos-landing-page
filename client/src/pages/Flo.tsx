import { useEffect, useState, useRef, type FormEvent } from 'react';
import { Sparkles, ChevronRight, Send, X, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, API_BASE, tokenStore, getErrorMessage } from '@/api/client';
import { getAllWings, type WingSummary } from '@/api/wings';
import Spinner from '@/components/Spinner';
import PlanGateCard, { isPlanGateError } from '@/components/PlanGateCard';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface Signal {
  type: string;
  priority: 'high' | 'medium' | 'low';
  message: string;
}

interface Nudge {
  key: string;
  category: 'emergency_fund' | 'debt' | 'portfolio' | 'tax' | 'milestone';
  title: string;
  message: string;
  severity: 'info' | 'tip' | 'warn';
  learnMoreId?: string;
}

const NUDGE_STYLES: Record<string, string> = {
  warn: 'border-amber-200 bg-amber-50 text-amber-900',
  tip:  'border-blue-200 bg-blue-50 text-blue-900',
  info: 'border-emerald-200 bg-emerald-50 text-emerald-900',
};

const NUDGE_BADGE: Record<string, string> = {
  warn: 'bg-amber-100 text-amber-700',
  tip:  'bg-blue-100 text-blue-700',
  info: 'bg-emerald-100 text-emerald-700',
};

const NUDGE_LABEL: Record<string, string> = {
  warn: 'Heads up',
  tip:  'Insight',
  info: 'Milestone',
};

const SIGNAL_COLORS: Record<string, string> = {
  high:   'border-red-200 bg-red-50 text-red-800',
  medium: 'border-amber-200 bg-amber-50 text-amber-800',
  low:    'border-blue-200 bg-blue-50 text-blue-800',
};

/** Build context-aware prompts based on the user's wing levels and todos */
function buildStarterPrompts(wings: WingSummary[]): string[] {
  const prompts: string[] = [];

  const unassessed = wings.filter((w) => !w.assessed);
  const assessed   = wings.filter((w) => w.assessed);
  const lowestWing = assessed.length > 0
    ? [...assessed].sort((a, b) => a.level - b.level)[0]
    : null;
  const hasNoEmergencyFund = lowestWing?.id === 'preservation' && lowestWing.level === 0;

  // Most relevant first based on their actual situation
  if (unassessed.length > 0) {
    prompts.push(`I haven't been assessed on ${unassessed[0].name} yet — where should I start?`);
  }
  if (hasNoEmergencyFund) {
    prompts.push("How much should I have in my emergency fund, and where should I keep it?");
  }
  if (lowestWing && !hasNoEmergencyFund) {
    prompts.push(`My ${lowestWing.name} Wing is my weakest — what's the most important thing to fix?`);
  }

  // Always useful
  prompts.push("What's my net worth looking like and is my allocation on track?");
  prompts.push("What should I be focused on right now?");

  if (assessed.length > 0) {
    prompts.push("Am I making progress toward my financial goals?");
  } else {
    prompts.push("Can you explain the Six Wing Framework?");
  }

  // Return 4 prompts max
  return prompts.slice(0, 4);
}

export default function Flo() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [wings, setWings] = useState<WingSummary[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState('');
  const [planGate, setPlanGate] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Load conversation; signals are optional — don't fail the whole page if they 404
    api.get('/flo/conversation')
      .then((convRes) => {
        setMessages(convRes.data.messages ?? []);
      })
      .catch((err) => {
        const gate = isPlanGateError(err);
        if (gate) { setPlanGate(gate.requiredPlan); }
        else { setError(getErrorMessage(err)); }
      })
      .finally(() => setLoading(false));

    api.post('/flo/priority', {})
      .then((sigRes) => setSignals(sigRes.data.signals ?? []))
      .catch(() => { /* non-critical */ });

    api.get('/nudges')
      .then((res) => setNudges(res.data.nudges ?? []))
      .catch(() => { /* non-critical */ });

    getAllWings()
      .then(setWings)
      .catch(() => { /* non-critical */ });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || sending) return;
    setError('');
    setSending(true);
    setStreamingContent('');
    setInput('');

    const optimistic: Message = { role: 'user', content: text.trim(), timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const response = await fetch(`${API_BASE}/flo/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenStore.getAccess()}`,
        },
        body: JSON.stringify({ message: text.trim() }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string; requiredPlan?: string };
        if (response.status === 403 && body.requiredPlan) {
          setPlanGate(body.requiredPlan);
          setMessages((prev) => prev.filter((m) => m !== optimistic));
          return;
        }
        throw new Error(body.error ?? `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const json = line.slice(6).trim();
            if (!json) continue;

            const event = JSON.parse(json) as
              | { type: 'chunk'; text: string }
              | { type: 'done'; messages: Message[] }
              | { type: 'error'; message: string };

            if (event.type === 'chunk') {
              setStreamingContent((prev) => prev + event.text);
            } else if (event.type === 'done') {
              setMessages(event.messages);
              setStreamingContent('');
            } else if (event.type === 'error') {
              throw new Error(event.message);
            }
          }
        }
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m !== optimistic));
      setStreamingContent('');
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await send(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  async function handleClear() {
    if (!confirm('Clear conversation history?')) return;
    await api.delete('/flo/conversation');
    setMessages([]);
  }

  async function dismissNudge(key: string) {
    setNudges((prev) => prev.filter((n) => n.key !== key));
    try {
      await api.post(`/nudges/${key}/dismiss`);
    } catch {
      // best-effort — local state already updated
    }
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Spinner className="h-8 w-8 text-brand-600" /></div>;
  }

  if (planGate) {
    return (
      <PlanGateCard
        requiredPlan={planGate}
        featureName="Flo AI"
        description="Upgrade to Core to unlock Flo — your AI financial companion. She reads your live portfolio, tracks your wing progress, and gives personalized guidance based on your actual financial picture."
      />
    );
  }

  return (
    <div className="flex h-full flex-col">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-8 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Flo</h1>
            <p className="text-xs text-gray-400 leading-tight">Your AI financial companion — powered by your live portfolio</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={handleClear} className="text-xs text-gray-400 hover:text-gray-600 transition">
            Clear chat
          </button>
        )}
      </div>

      {/* ── Error banner ────────────────────────────────────────────────────── */}
      {error && (
        <div className="mx-6 mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="flex-1 text-sm text-amber-800">
            Flo is having trouble connecting. Check your API configuration and try again.
          </p>
          <button onClick={() => setError('')} className="flex-shrink-0 text-amber-500 hover:text-amber-700 transition">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Nudge banners ───────────────────────────────────────────────────── */}
      {nudges.length > 0 && (
        <div className="border-b border-gray-100 bg-white px-6 py-3 space-y-2">
          {nudges.map((n) => (
            <div
              key={n.key}
              className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${NUDGE_STYLES[n.severity]}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${NUDGE_BADGE[n.severity]}`}>
                    {NUDGE_LABEL[n.severity]}
                  </span>
                  <span className="font-semibold text-[13px]">{n.title}</span>
                </div>
                <p className="text-[13px] leading-relaxed opacity-90">{n.message}</p>
                {n.learnMoreId && (
                  <button
                    onClick={() => navigate(`/learn#${n.learnMoreId}`)}
                    className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium underline underline-offset-2 opacity-70 hover:opacity-100 transition"
                  >
                    <BookOpen className="h-3 w-3" />
                    Learn more in Wealth Hub
                  </button>
                )}
              </div>
              <button
                onClick={() => dismissNudge(n.key)}
                className="flex-shrink-0 mt-0.5 opacity-50 hover:opacity-100 transition"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Messages ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-surface-1 px-8 py-6 space-y-4">

        {/* Priority signals — shown when no messages yet */}
        {messages.length === 0 && signals.length > 0 && (
          <div className="space-y-2 mb-6">
            <p className="section-label">On your radar</p>
            {signals.map((s, i) => (
              <div key={i} className={`rounded-lg border px-4 py-3 text-sm ${SIGNAL_COLORS[s.priority]}`}>
                {s.message}
              </div>
            ))}
          </div>
        )}

        {/* Starter prompts */}
        {messages.length === 0 && (
          <div>
            <p className="mb-3 section-label">Ask Flo</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {buildStarterPrompts(wings).map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-left text-sm font-medium text-gray-700 shadow-sm hover:border-brand-300 hover:border-l-2 hover:border-l-brand-500 hover:bg-brand-50 hover:text-brand-700 hover:shadow-md transition-all duration-150 group"
                >
                  <span>{p}</span>
                  <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-brand-400 flex-shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state when no messages and no prompts needed */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Sparkles className="h-12 w-12 text-brand-200" />
            <p className="text-sm text-gray-400">Ask Flo anything about your portfolio</p>
          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="mr-2 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-600">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
            )}
            <div
              className={`max-w-[75%] px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-brand-600 text-white rounded-xl rounded-tr-sm shadow-sm'
                  : 'bg-white border border-gray-100 text-gray-800 rounded-xl rounded-tl-sm shadow-sm'
              }`}
            >
              {msg.content.split('\n').map((line, j) => (
                <span key={j}>{line}{j < msg.content.split('\n').length - 1 && <br />}</span>
              ))}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="mr-2 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-600">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="max-w-[75%] rounded-xl rounded-tl-sm bg-white border border-gray-100 px-4 py-3 text-sm leading-relaxed text-gray-800 shadow-sm">
              {streamingContent ? (
                <>
                  {streamingContent.split('\n').map((line, j, arr) => (
                    <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
                  ))}
                  <span className="inline-block w-1.5 h-3.5 bg-brand-400 animate-pulse ml-0.5 align-middle" />
                </>
              ) : (
                <Spinner className="h-4 w-4 text-brand-400" />
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ───────────────────────────────────────────────────────────── */}
      <div className="border-t border-gray-100 bg-white px-8 py-4 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <div className="flex-1 rounded-lg border border-gray-200 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500 focus-within:ring-offset-1 transition-all">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Flo anything about your finances…"
              className="block w-full rounded-lg bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none resize-none"
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="btn-primary flex-shrink-0 h-11 w-11 p-0 justify-center rounded-xl"
          >
            {sending ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
        <p className="mt-2 text-center text-xs text-gray-400">
          Flo provides financial information, not personalized investment advice.
        </p>
      </div>
    </div>
  );
}
