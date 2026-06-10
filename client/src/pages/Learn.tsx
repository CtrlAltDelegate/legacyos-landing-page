import { useEffect, useState, useRef } from 'react';
import { ChevronDown, GraduationCap, Sparkles } from 'lucide-react';
import { api } from '@/api/client';
import Spinner from '@/components/Spinner';
import {
  WEALTH_ARTICLES,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  type WealthArticle,
  type WealthPersonalData,
} from '@/data/wealthContent';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPersonalData(
  networth: Record<string, unknown> | null,
  metricsData: Record<string, unknown> | null,
  profileData: Record<string, unknown> | null,
): WealthPersonalData {
  const nw = (networth as {
    netWorth?: number;
    totalAssets?: number;
    totalLiabilities?: number;
    breakdown?: { otherValue?: number; equityValue?: number };
  }) ?? {};

  const summary = (metricsData as { summary?: Record<string, { latestValue: number }> })?.summary ?? {};

  const profile = (profileData as {
    answers?: Record<string, unknown>;
    completedAt?: string | null;
  }) ?? {};
  const answers = profile.answers as Record<string, unknown> | undefined;

  return {
    netWorth:          nw.netWorth         ?? 0,
    cashValue:         nw.breakdown?.otherValue  ?? 0,
    equityValue:       nw.breakdown?.equityValue ?? 0,
    totalAssets:       nw.totalAssets      ?? 0,
    totalLiabilities:  nw.totalLiabilities ?? 0,
    grossIncome:       summary['gross_income']?.latestValue  ?? null,
    creditCardBalance: summary['credit_card_balance']?.latestValue ?? null,
    effectiveTaxRate:  summary['effective_tax_rate']?.latestValue  ?? null,
    isSelfEmployed:
      answers?.is_self_employed === true ||
      answers?.is_self_employed === 'true',
  };
}

// ─── Article card ─────────────────────────────────────────────────────────────

function ArticleCard({
  article,
  personalData,
  defaultOpen,
}: {
  article: WealthArticle;
  personalData: WealthPersonalData | null;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (defaultOpen && cardRef.current) {
      setTimeout(() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [defaultOpen]);

  const callout = personalData && article.personalize ? article.personalize(personalData) : null;

  return (
    <div ref={cardRef} className="rounded-xl border border-gray-100 bg-white overflow-hidden" id={article.id}>
      {/* Header — always visible */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-500">
              {article.tagline}
            </span>
          </div>
          <h3 className="text-base font-bold text-gray-900 leading-snug">{article.title}</h3>
        </div>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Body — collapsible */}
      {open && (
        <div className="px-5 pb-5 border-t border-gray-50 space-y-4">
          {/* Personalized callout */}
          {callout && (
            <div className="flex items-start gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 mt-4">
              <Sparkles className="h-4 w-4 text-brand-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-brand-800 leading-relaxed">{callout}</p>
            </div>
          )}

          {/* Body paragraphs */}
          <div className="pt-4 space-y-3">
            {article.body.map((para, i) => (
              <p key={i} className="text-sm text-gray-700 leading-relaxed">{para}</p>
            ))}
          </div>

          {/* Key takeaways */}
          <div className="rounded-lg bg-gray-50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Key Takeaways</p>
            <ul className="space-y-1.5">
              {article.keyTakeaways.map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Learn() {
  const [activeCategory, setActiveCategory] = useState<WealthArticle['category'] | 'all'>('all');
  const [personalData, setPersonalData] = useState<WealthPersonalData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  // Detect anchor hash for deep-linking from Flo nudges
  const [targetId] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return hash || null;
  });

  useEffect(() => {
    const [networthP, metricsP, profileP] = [
      api.get('/networth/current').catch(() => null),
      api.get('/metrics').catch(() => null),
      api.get('/profile/family').catch(() => null),
    ];

    Promise.all([networthP, metricsP, profileP])
      .then(([nwRes, metRes, profRes]) => {
        setPersonalData(
          buildPersonalData(
            nwRes?.data ?? null,
            metRes?.data ?? null,
            profRes?.data ?? null,
          ),
        );
      })
      .finally(() => setDataLoading(false));
  }, []);

  // Auto-open the article targeted by the hash, and switch category if needed
  useEffect(() => {
    if (targetId) {
      const article = WEALTH_ARTICLES.find((a) => a.id === targetId);
      if (article) setActiveCategory(article.category);
    }
  }, [targetId]);

  const visibleArticles =
    activeCategory === 'all'
      ? WEALTH_ARTICLES
      : WEALTH_ARTICLES.filter((a) => a.category === activeCategory);

  const categoriesInView =
    activeCategory === 'all'
      ? CATEGORY_ORDER
      : [activeCategory];

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 flex-shrink-0">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Wealth Hub</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Financial frameworks, plain English. Personalized callouts based on your data.
          </p>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-[12px] text-amber-800 leading-relaxed">
          <span className="font-bold">Educational content only.</span> Nothing in the Wealth Hub constitutes personalized investment or tax advice. Every situation is different — consult a licensed financial advisor or CPA before making major financial decisions.
        </p>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1.5">
        {(['all', ...CATEGORY_ORDER] as Array<'all' | WealthArticle['category']>).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              activeCategory === cat
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat === 'all' ? 'All Topics' : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Articles grouped by category */}
      {categoriesInView.map((cat) => {
        const articles = visibleArticles.filter((a) => a.category === cat);
        if (articles.length === 0) return null;
        return (
          <div key={cat} className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">
              {CATEGORY_LABELS[cat]}
            </h2>
            {dataLoading && !personalData ? (
              <div className="space-y-3">
                {articles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    personalData={null}
                    defaultOpen={article.id === targetId}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {articles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    personalData={personalData}
                    defaultOpen={article.id === targetId}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Footer disclaimer */}
      <p className="text-[11px] text-gray-400 text-center pb-4">
        LegacyOS is not a registered investment advisor, broker-dealer, financial planner, or tax advisor. Wealth Hub content is for educational purposes only. Always consult qualified professionals for advice specific to your situation.
      </p>

    </div>
  );
}
