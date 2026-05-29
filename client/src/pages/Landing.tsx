import { Link, useSearchParams } from 'react-router-dom';
import { Gem, Sparkles, Shield, TrendingUp, Heart, Star, BookOpen, Settings2, ArrowRight, CheckCircle2 } from 'lucide-react';

const WINGS = [
  { emoji: '📈', name: 'Growth',        color: 'bg-green-50 border-green-200',  icon: TrendingUp, iconColor: 'text-green-600',  desc: 'Build and grow your investment portfolio across equities, real estate, and business equity.' },
  { emoji: '🛡️', name: 'Preservation',  color: 'bg-blue-50 border-blue-200',    icon: Shield,     iconColor: 'text-blue-600',    desc: 'Protect what you have with life insurance, emergency funds, wills, and trusts.' },
  { emoji: '❤️', name: 'Philanthropy',  color: 'bg-rose-50 border-rose-200',    icon: Heart,      iconColor: 'text-rose-600',    desc: 'Give intentionally with a giving philosophy and tax-efficient vehicles.' },
  { emoji: '🌟', name: 'Experiences',   color: 'bg-amber-50 border-amber-200',  icon: Star,       iconColor: 'text-amber-600',   desc: 'Invest in family travel, traditions, and intentional learning experiences.' },
  { emoji: '📜', name: 'Legacy',         color: 'bg-violet-50 border-violet-200',icon: BookOpen,  iconColor: 'text-violet-600',  desc: 'Document your values, mission, and plan for generational wealth transfer.' },
  { emoji: '⚙️', name: 'Operations',    color: 'bg-teal-50 border-teal-200',    icon: Settings2,  iconColor: 'text-teal-600',    desc: 'Keep your finances organized with regular reviews and document management.' },
];

const FEATURES = [
  { icon: '🤖', title: 'Flo — Your AI Financial Companion', desc: 'Ask Flo anything about your portfolio. She reads your live data, knows your goals, and gives personalized guidance — not generic advice.' },
  { icon: '📊', title: 'Real-Time Net Worth Tracking', desc: 'Connect your assets and liabilities. Watch your net worth update live as prices change.' },
  { icon: '📋', title: 'Auto-Generated Action Plan', desc: 'Answer a few questions about your family and Flo builds a personalized to-do list — prioritized by what matters most.' },
  { icon: '📄', title: 'Document Intelligence', desc: 'Upload your mortgage statements, brokerage reports, and insurance policies. Flo extracts the data automatically.' },
];

const PRICING = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    desc: 'Get started and explore.',
    features: ['Net worth tracking', 'Six Wing assessment', 'Flo (5 messages/month)', 'Basic action items'],
    cta: 'Get started free',
    href: '/register',
    highlight: false,
  },
  {
    name: 'Core',
    price: '$19',
    period: '/month',
    desc: 'For serious family wealth builders.',
    features: ['Everything in Free', 'Unlimited Flo conversations', 'Document upload & AI extraction', 'Full family profile & action plan', 'Weekly digest from Flo'],
    cta: 'Start Core',
    href: '/register',
    highlight: true,
  },
  {
    name: 'Premium',
    price: '$49',
    period: '/month',
    desc: 'For families managing significant wealth.',
    features: ['Everything in Core', 'Spouse / partner access', 'Priority support', 'Custom affiliate link overrides', 'Early access to new features'],
    cta: 'Start Premium',
    href: '/register',
    highlight: false,
  },
];

export default function Landing() {
  const [searchParams] = useSearchParams();
  const ref = searchParams.get('ref');
  const registerHref = ref ? `/register?ref=${ref}` : '/register';

  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Gem className="h-5 w-5 text-brand-600" />
            <span className="text-lg font-bold tracking-tight">LegacyOS</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Sign in
            </Link>
            <Link to={registerHref} className="btn-primary text-sm px-4 py-2">
              Get started free
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-950 to-brand-800 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #7289ff 0%, transparent 60%), radial-gradient(circle at 70% 20%, #4f63f7 0%, transparent 50%)' }}
        />
        <div className="relative max-w-4xl mx-auto px-6 py-24 sm:py-32 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5 mb-6">
            <Sparkles className="h-3.5 w-3.5 text-brand-300" />
            <span className="text-sm text-brand-200 font-medium">Powered by Claude AI</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-tight mb-6">
            The private wealth OS<br />
            <span className="text-brand-300">for family legacies</span>
          </h1>
          <p className="text-lg sm:text-xl text-brand-200 leading-relaxed max-w-2xl mx-auto mb-10">
            LegacyOS tracks your net worth, assesses your Six Wings of family wealth, and gives you Flo — an AI financial companion who actually knows your situation.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to={registerHref} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-brand-700 px-7 py-3.5 text-base font-bold hover:bg-brand-50 transition-colors shadow-lg">
              Start for free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 text-white px-7 py-3.5 text-base font-semibold hover:bg-white/10 transition-colors">
              Sign in
            </Link>
          </div>

          <p className="mt-5 text-sm text-brand-300">Free to start · No credit card required</p>
        </div>
      </section>

      {/* ── Six Wings ─────────────────────────────────────────────────────── */}
      <section className="py-20 bg-surface-1">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-sm font-bold uppercase tracking-widest text-brand-600 mb-3">The Framework</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">The Six Wing Framework</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Most financial tools track money. LegacyOS tracks wealth — across every dimension that matters for a family.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {WINGS.map((wing) => {
              const Icon = wing.icon;
              return (
                <div key={wing.name} className={`rounded-xl border p-5 ${wing.color} hover:shadow-md transition-shadow`}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{wing.emoji}</span>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{wing.name}</h3>
                      <Icon className={`h-3.5 w-3.5 ${wing.iconColor} mt-0.5`} />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{wing.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-sm font-bold uppercase tracking-widest text-brand-600 mb-3">What's inside</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Everything in one place</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-gray-100 bg-gray-50 p-6 hover:border-brand-200 hover:bg-brand-50 transition-colors">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Flo highlight ─────────────────────────────────────────────────── */}
      <section className="py-20 bg-brand-950 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-brand-600 mb-6 mx-auto">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-5">
            Meet Flo, your AI financial companion
          </h2>
          <p className="text-lg text-brand-200 leading-relaxed max-w-2xl mx-auto mb-8">
            Flo reads your live portfolio, knows your wing levels, your family profile, and your goals. Ask her anything — from "what's my net worth?" to "do I need a trust?" — and she'll give you a real answer, not a generic one.
          </p>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-lg mx-auto text-left space-y-4">
            <div className="flex justify-end">
              <div className="bg-brand-600 rounded-xl rounded-tr-sm px-4 py-3 max-w-[80%]">
                <p className="text-sm text-white">Do I have enough life insurance for my family?</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-7 w-7 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="bg-white/10 border border-white/10 rounded-xl rounded-tl-sm px-4 py-3 max-w-[80%]">
                <p className="text-sm text-brand-100">Based on your profile — married, 2 kids, primary earner — a common rule of thumb is 10-12x your annual income. With your current income range, you'd want $1.2–1.5M in coverage. Do you know how much your current policy covers?</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-sm font-bold uppercase tracking-widest text-brand-600 mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Simple, transparent pricing</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {PRICING.map((plan) => (
              <div key={plan.name} className={`rounded-2xl p-6 flex flex-col ${
                plan.highlight
                  ? 'bg-brand-600 text-white shadow-xl ring-2 ring-brand-500'
                  : 'border border-gray-200 bg-white'
              }`}>
                <div className="mb-5">
                  <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${plan.highlight ? 'text-brand-200' : 'text-gray-400'}`}>{plan.name}</p>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-3xl font-bold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.price}</span>
                    <span className={`text-sm ${plan.highlight ? 'text-brand-200' : 'text-gray-400'}`}>{plan.period}</span>
                  </div>
                  <p className={`text-sm mt-1 ${plan.highlight ? 'text-brand-200' : 'text-gray-500'}`}>{plan.desc}</p>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle2 className={`h-4 w-4 flex-shrink-0 mt-0.5 ${plan.highlight ? 'text-brand-200' : 'text-green-500'}`} />
                      <span className={`text-sm ${plan.highlight ? 'text-brand-100' : 'text-gray-600'}`}>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to={registerHref}
                  className={`w-full py-2.5 text-center rounded-xl text-sm font-bold transition-colors ${
                    plan.highlight
                      ? 'bg-white text-brand-700 hover:bg-brand-50'
                      : 'border border-brand-200 text-brand-600 hover:bg-brand-50'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-surface-1">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Start building your family's legacy today
          </h2>
          <p className="text-lg text-gray-500 mb-8">
            Free to start. No credit card required. Your first assessment takes 3 minutes.
          </p>
          <Link to={registerHref} className="btn-primary text-base px-8 py-3.5 gap-2">
            Get started free
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-10 bg-white">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Gem className="h-4 w-4 text-brand-600" />
            <span className="text-sm font-bold text-gray-900">LegacyOS</span>
          </div>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} LegacyOS. All rights reserved. Not investment advice.</p>
          <div className="flex gap-5 text-xs text-gray-400">
            <Link to="/login" className="hover:text-gray-700">Sign in</Link>
            <Link to={registerHref} className="hover:text-gray-700">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
