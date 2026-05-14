import { useEffect, useState, useRef, type FormEvent } from 'react';
import { api, getErrorMessage } from '@/api/client';
import Spinner from '@/components/Spinner';

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

const SIGNAL_COLORS: Record<string, string> = {
  high:   'border-red-200 bg-red-50 text-red-800',
  medium: 'border-amber-200 bg-amber-50 text-amber-800',
  low:    'border-blue-200 bg-blue-50 text-blue-800',
};

const STARTER_PROMPTS = [
  "What's my net worth looking like?",
  "Am I on track for my financial goals?",
  "Explain my allocation drift.",
  "What should I be focused on right now?",
];

export default function Flo() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    Promise.all([
      api.get('/flo/conversation'),
      api.get('/flo/signals'),
    ])
      .then(([convRes, sigRes]) => {
        setMessages(convRes.data.messages ?? []);
        setSignals(sigRes.data.signals ?? []);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || sending) return;
    setError('');
    setSending(true);
    setInput('');

    // Optimistically add user message
    const optimistic: Message = { role: 'user', content: text.trim(), timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const { data } = await api.post('/flo/chat', { message: text.trim() });
      setMessages(data.messages);
    } catch (err) {
      setError(getErrorMessage(err));
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m !== optimistic));
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

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Spinner className="h-8 w-8" /></div>;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-8 py-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Flo</h1>
          <p className="text-xs text-gray-400">Your AI financial companion — powered by your live portfolio</p>
        </div>
        {messages.length > 0 && (
          <button onClick={handleClear} className="text-xs text-gray-400 hover:text-gray-600 transition">
            Clear chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
        {/* Priority signals — shown when no messages yet */}
        {messages.length === 0 && signals.length > 0 && (
          <div className="space-y-2 mb-6">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">On your radar</p>
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
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">Ask Flo</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-700 hover:border-brand-300 hover:bg-brand-50 transition"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="mr-2 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm text-brand-700 font-bold">
                F
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-brand-600 text-white rounded-br-sm'
                  : 'bg-white ring-1 ring-gray-200 text-gray-800 rounded-bl-sm'
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
            <div className="mr-2 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm text-brand-700 font-bold">
              F
            </div>
            <div className="rounded-2xl rounded-bl-sm bg-white px-4 py-3 ring-1 ring-gray-200">
              <Spinner className="h-4 w-4" />
            </div>
          </div>
        )}

        {error && (
          <p className="text-center text-sm text-red-600">{error}</p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white px-8 py-4">
        <p className="mb-2 text-center text-xs text-gray-400">
          Flo provides financial information, not personalized investment advice.
        </p>
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Flo anything about your finances…"
            className="input flex-1 resize-none"
            style={{ minHeight: '42px', maxHeight: '120px' }}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="btn-primary flex-shrink-0"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
