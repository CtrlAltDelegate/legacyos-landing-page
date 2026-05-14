import { useState, useRef, useEffect, FormEvent } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Flo() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/flo/chat', { messages: newMessages });
      setMessages([...newMessages, { role: 'assistant', content: res.data.response }]);
    } catch {
      setError('Flo is unavailable right now. Please try again.');
      setMessages(messages); // roll back
    } finally {
      setLoading(false);
    }
  };

  const isPaidPlan = user?.plan === 'core' || user?.plan === 'premium';

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-black/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-flo-50 border border-flo-100 flex items-center justify-center text-flo-700 text-sm font-medium">
            F
          </div>
          <div>
            <div className="text-sm font-medium text-ink">Flo</div>
            <div className="text-xs text-muted">AI capital allocator · Information only, not advice</div>
          </div>
        </div>
      </div>

      {/* Upgrade prompt for free plan */}
      {!isPaidPlan && (
        <div className="mx-6 mt-4 px-4 py-3 bg-amber-50 border border-amber-400/40 rounded-xl text-sm text-amber-700 flex items-center justify-between flex-shrink-0">
          <span>Flo chat requires Core or Premium plan.</span>
          <a href="/billing" className="text-xs font-medium underline ml-2">Upgrade →</a>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="mt-8 text-center">
            <div className="text-3xl mb-3">◎</div>
            <div className="text-sm font-medium text-ink mb-1">Ask Flo anything about your portfolio</div>
            <div className="text-xs text-muted max-w-sm mx-auto">
              Flo has full context on your assets. Try: "Where am I most exposed?" or "How does my real estate equity compare to my equities?"
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {[
                'What's my current allocation?',
                'Where should I focus first?',
                'How concentrated am I?',
                'Explain my restricted assets',
              ].map(q => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-xs px-3 py-1.5 bg-white border border-black/10 rounded-full text-muted hover:text-ink hover:border-black/20 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-flo-50 border border-flo-100 flex items-center justify-center text-flo-700 text-xs font-medium mr-2 flex-shrink-0 mt-0.5">
                F
              </div>
            )}
            <div
              className={`max-w-lg text-sm rounded-2xl px-4 py-2.5 whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-ink text-white rounded-br-sm'
                  : 'bg-white border border-black/10 text-ink rounded-bl-sm'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-full bg-flo-50 border border-flo-100 flex items-center justify-center text-flo-700 text-xs mr-2 mt-0.5">F</div>
            <div className="bg-white border border-black/10 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-muted">
              Thinking…
            </div>
          </div>
        )}

        {error && (
          <div className="text-center text-xs text-red-600">{error}</div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Compliance notice */}
      <div className="px-6 py-1.5 bg-canvas border-t border-black/5 flex-shrink-0">
        <p className="text-xs text-muted text-center">
          Flo provides financial information based on your data — not personalized investment advice.
        </p>
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="px-6 py-4 bg-white border-t border-black/10 flex-shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={!isPaidPlan || loading}
            placeholder={isPaidPlan ? 'Ask Flo about your portfolio…' : 'Upgrade to Core to chat with Flo'}
            className="flex-1 px-4 py-2 text-sm border border-black/15 rounded-xl bg-canvas focus:outline-none focus:ring-2 focus:ring-flo-600/30 focus:border-flo-600 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!isPaidPlan || loading || !input.trim()}
            className="px-4 py-2 bg-ink text-white text-sm font-medium rounded-xl hover:bg-ink/80 disabled:opacity-40 transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
