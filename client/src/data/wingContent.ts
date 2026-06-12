// Per-wing educational content — shown in the WingDetail page under "Key Concepts."
// Each wing has 2-3 articles relevant to its focus area.

export interface WingArticle {
  id: string;
  title: string;
  tagline: string;
  body: string[];
  keyTakeaways: string[];
}

export type WingId = 'growth' | 'preservation' | 'philanthropy' | 'experiences' | 'legacy' | 'operations';

export const WING_ARTICLES: Record<WingId, WingArticle[]> = {

  // ─── Growth ──────────────────────────────────────────────────────────────────
  growth: [
    {
      id: 'growth-compounding',
      title: 'The Compounding Engine: Why Time Is Your Only Unfair Advantage',
      tagline: 'Investing fundamentals',
      body: [
        'Compound growth is the process of earning returns on both your principal and your accumulated gains. At 8% annual growth, $10,000 becomes $21,589 in 10 years, $46,610 in 20 years, and $100,627 in 30 years — without adding a single dollar.',
        'The math gets even more powerful when you add regular contributions. $500/month at 8% over 30 years produces $744,000 — even though you only contributed $180,000 of your own money. The remaining $564,000 came from compounding.',
        'The single most important variable is time, not the amount you invest. Starting at 25 vs. 35 can mean the difference between retiring comfortably and retiring wealthy. This is why the Growth Wing emphasizes getting started over getting it perfect.',
      ],
      keyTakeaways: [
        'Start investing as early as possible — time is more valuable than the amount you start with',
        'Regular contributions (dollar-cost averaging) reduce the impact of market volatility',
        'Tax-advantaged accounts (401k, IRA, Roth) accelerate compounding by deferring or eliminating taxes on gains',
        'At 8% real returns, money doubles approximately every 9 years (Rule of 72)',
      ],
    },
    {
      id: 'growth-asset-classes',
      title: 'Asset Classes Explained: What You Own and Why It Matters',
      tagline: 'Portfolio construction',
      body: [
        'An asset class is a group of investments with similar characteristics, legal structures, and behaviors in the market. The major classes are equities (stocks), fixed income (bonds), real estate, cash equivalents, and alternatives (private equity, commodities, crypto).',
        'Equities represent ownership in businesses. Over long periods, they have historically produced the highest real returns (~7-10% annually), but with significant short-term volatility. They belong in every long-term growth portfolio.',
        'Real estate provides income (rent), appreciation, and a hedge against inflation. It also provides leverage: a 20% down payment controls 100% of the asset\'s appreciation. Rental properties are one of the most powerful wealth-building tools available to individuals.',
        'Diversification across asset classes — and within them — reduces the volatility of your portfolio without necessarily reducing your expected return. This is the only free lunch in investing.',
      ],
      keyTakeaways: [
        'Equities should be the core of any long-term wealth-building strategy',
        'Real estate adds income, leverage, and inflation protection to a portfolio',
        'Diversification across uncorrelated assets reduces risk without sacrificing return',
        'Your asset allocation should match your time horizon: more equities when young, more stability as you near your goal',
      ],
    },
    {
      id: 'growth-active-vs-passive',
      title: 'Active vs. Passive Investing: The Data Most Advisors Won\'t Show You',
      tagline: 'Investment strategy',
      body: [
        'Active investing means trying to outperform the market by picking individual stocks or timing entry/exit points. Passive investing means buying and holding a broad market index (like the S&P 500) and accepting the market\'s return.',
        'The data is unambiguous: over 15 years, more than 92% of actively managed large-cap funds underperform their benchmark index net of fees. The main reason is fees — an expense ratio of 1% compounds into a dramatically smaller portfolio over 30 years.',
        'Low-cost index funds (Vanguard, Fidelity, Schwab) with expense ratios under 0.10% are the starting point for most investors. Once you have a solid index foundation, you can allocate a small portion to individual stocks or other strategies you have genuine insight into.',
      ],
      keyTakeaways: [
        'Most active managers underperform index funds over long periods, especially after fees',
        'Minimize expense ratios — every 0.1% saved compounds meaningfully over decades',
        'A total market index fund is a complete, diversified portfolio in a single investment',
        'Active positions make sense only when you have a genuine information or analytical edge',
      ],
    },
  ],

  // ─── Preservation ────────────────────────────────────────────────────────────
  preservation: [
    {
      id: 'preservation-emergency-fund',
      title: 'The Emergency Fund: Why 3-6 Months Is a Floor, Not a Goal',
      tagline: 'Financial safety net',
      body: [
        'An emergency fund is liquid cash set aside to cover unexpected expenses — a job loss, medical bill, car repair, or home emergency — without going into debt or liquidating investments at the wrong time.',
        'The standard guidance is 3-6 months of expenses. But that range depends heavily on your situation: a single-income household with children and a mortgage needs 6-12 months. A dual-income household with no dependents and job security might be fine with 3. The right number is the one that would let you sleep at night during a worst-case scenario.',
        'Where you keep it matters too. High-yield savings accounts currently yield 4-5% with same-day liquidity. Money market funds at brokerages are another option. The goal is not to maximize return — it\'s to maximize availability. Never invest your emergency fund in equities.',
      ],
      keyTakeaways: [
        'Keep 3-12 months of expenses in liquid cash depending on your income stability and dependents',
        'Use a high-yield savings account (HYSA) — 4-5% return with full liquidity',
        'An emergency fund prevents you from selling investments at the worst possible time',
        'Replenish it immediately after using it — treat it as a non-negotiable bill to yourself',
      ],
    },
    {
      id: 'preservation-debt-management',
      title: 'Good Debt vs. Bad Debt: What the Wealthy Actually Borrow For',
      tagline: 'Debt strategy',
      body: [
        'Not all debt is equal. "Good debt" has a low interest rate and finances an asset that appreciates or produces income — a mortgage on a primary residence, a business loan with positive ROI, a student loan for a high-earning field. "Bad debt" is expensive and funds consumption — credit cards, personal loans for vacations, auto loans on depreciating vehicles.',
        'The math is simple: if debt costs more than your expected investment return, paying it off is the guaranteed investment. Credit card debt at 22% APR is the best guaranteed 22% return available. Most people should eliminate all high-interest debt (>7-8%) before investing in taxable accounts.',
        'The exception: tax-advantaged retirement contributions. A 401k with employer match has a guaranteed 50-100% return on the matched portion. Always contribute enough to get the full match, even while paying down debt.',
      ],
      keyTakeaways: [
        'Eliminate high-interest debt (>7-8% APR) before taxable investing — it\'s a risk-free return',
        'Always contribute enough to your 401k to capture the full employer match first',
        'Mortgage and low-rate student loan debt can be maintained while investing — the math usually favors investing',
        'Credit card balances carried month-to-month are the single most destructive financial habit',
      ],
    },
  ],

  // ─── Philanthropy ────────────────────────────────────────────────────────────
  philanthropy: [
    {
      id: 'philanthropy-giving-strategy',
      title: 'Giving With Purpose: How to Build a Giving Strategy That Lasts',
      tagline: 'Charitable giving',
      body: [
        'Thoughtful philanthropy starts with clarity on what you\'re trying to accomplish. Are you maximizing impact per dollar? Giving to causes personally meaningful to you? Building a family giving practice? Teaching children about values? Each goal calls for a different strategy.',
        'The most common tax-efficient giving vehicle is the Donor Advised Fund (DAF). You contribute assets in a high-income year to get the deduction immediately, then distribute grants to charities over time. DAFs accept appreciated securities, eliminating capital gains on the transfer while getting a deduction for the full fair market value.',
        'For larger estates, private foundations offer more control and family engagement but come with higher administrative burden and a mandatory 5% annual distribution requirement. A DAF is almost always the right first step before considering a foundation.',
      ],
      keyTakeaways: [
        'Donor Advised Funds let you decouple the timing of your tax deduction from the timing of your charitable giving',
        'Donating appreciated securities avoids capital gains tax while getting a full fair-market-value deduction',
        'Qualified Charitable Distributions (QCDs) from IRAs after age 70½ satisfy RMDs and avoid income tax',
        'A giving strategy — even a simple one — dramatically increases the impact and intentionality of your philanthropy',
      ],
    },
    {
      id: 'philanthropy-family-values',
      title: 'Teaching Money Values: How Wealthy Families Transfer More Than Wealth',
      tagline: 'Family & legacy',
      body: [
        'Research on multi-generational wealth consistently shows that the loss of wealth by the third generation (the "shirtsleeves to shirtsleeves" phenomenon) is rarely caused by bad investing. It\'s caused by a failure to transmit financial values, literacy, and work ethic alongside the money.',
        'Giving children meaningful exposure to charitable decision-making — letting them allocate a family giving budget, visit grantee organizations, or research causes — builds financial discernment, empathy, and a sense of responsibility that outlasts any single inheritance.',
        'A family mission statement — even a short one — provides a shared framework for decisions about money, time, and giving. It answers "what do we stand for?" before the harder questions arise.',
      ],
      keyTakeaways: [
        'Third-generation wealth loss is a values problem, not an investment problem',
        'Give children agency over charitable allocations to build financial judgment early',
        'A written family mission statement creates alignment before conflict arises',
        'Include children in giving conversations, not just receiving — the mindset shifts dramatically',
      ],
    },
  ],

  // ─── Experiences ─────────────────────────────────────────────────────────────
  experiences: [
    {
      id: 'experiences-intentional-spending',
      title: 'The Spending Paradox: Why More Money Doesn\'t Always Mean More Joy',
      tagline: 'Intentional living',
      body: [
        'Research in positive psychology consistently shows that beyond a certain income threshold (roughly $75k-$100k in most developed markets, adjusted for cost of living), additional money has diminishing returns on day-to-day emotional wellbeing. But it does dramatically increase life evaluations — the sense of where you are relative to where you want to be.',
        'The correlation between spending and happiness depends almost entirely on what you spend on. Experiences consistently produce more lasting happiness than possessions. Spending on others produces more joy than spending on yourself. Spending that buys time (house cleaning, meal delivery, childcare) reliably increases wellbeing. Spending on things you can get used to quickly — gadgets, clothes, cars — shows rapid hedonic adaptation.',
        'The goal of the Experiences Wing isn\'t to spend more — it\'s to spend more intentionally. That means budgeting explicitly for experiences, being present for them, and resisting the default of spending on things instead of time.',
      ],
      keyTakeaways: [
        'Experiences produce more lasting happiness than material purchases',
        'Spending that buys time is the highest-ROI category for most people with disposable income',
        'Giving to others produces more joy than spending the same amount on yourself',
        'Intentional budgeting for experiences makes them more likely to happen and more meaningful when they do',
      ],
    },
    {
      id: 'experiences-family-capital',
      title: 'Human Capital vs. Financial Capital: The Underrated Half of Family Wealth',
      tagline: 'Family wealth framework',
      body: [
        'Most families think about wealth only in financial terms. But family capital has three components: financial capital (money and assets), human capital (the skills, education, relationships, and health of each family member), and social capital (the family\'s network, reputation, and community standing).',
        'A family that invests heavily in human capital — through education, meaningful experiences, travel, health, and skill development — builds lasting wealth that can\'t be lost in a market crash. The ROI on exceptional education, mentorship access, or global experience is often higher than any financial investment.',
        'The Experiences Wing is about deliberately investing in human capital. This means creating experiences that build resilience, develop character, expand perspective, and create memories that bind the family together. It\'s one of the most underrated components of a family wealth strategy.',
      ],
      keyTakeaways: [
        'Family wealth includes human capital (skills, health, education) and social capital (relationships, network), not just money',
        'Investment in human capital often has higher long-term ROI than financial investment alone',
        'Shared family experiences build trust, communication, and values alignment that outlast any single asset',
        'Budget explicitly for experiences that develop character and expand perspective',
      ],
    },
  ],

  // ─── Legacy ───────────────────────────────────────────────────────────────────
  legacy: [
    {
      id: 'legacy-estate-basics',
      title: 'Estate Planning 101: The Four Documents Every Adult Needs',
      tagline: 'Estate essentials',
      body: [
        'Estate planning is not just for the wealthy — it\'s for anyone who has assets, dependents, or wishes about their medical care. Without it, courts and state law decide what happens to everything you own and everyone who depends on you.',
        'The four foundational documents are: (1) a will, which directs your assets and names guardians for minor children; (2) a durable power of attorney, which gives someone authority to handle your finances if you\'re incapacitated; (3) a healthcare proxy / medical power of attorney, which designates someone to make medical decisions; and (4) an advance directive / living will, which specifies your wishes for end-of-life care.',
        'These four documents can be created for $500-$2,000 with an estate planning attorney. Without them, your family faces probate court, potential guardianship disputes for your children, and the inability to access your accounts during a medical emergency. There is almost no better use of $1,000.',
      ],
      keyTakeaways: [
        'Every adult needs a will, durable POA, healthcare proxy, and advance directive',
        'Name a guardian for minor children in your will — without it, a court decides',
        'Update beneficiary designations on retirement accounts and life insurance — they override your will',
        'Review estate documents every 3-5 years or after any major life event (marriage, divorce, new children)',
      ],
    },
    {
      id: 'legacy-trusts',
      title: 'Revocable Living Trusts: When a Will Isn\'t Enough',
      tagline: 'Trust fundamentals',
      body: [
        'A revocable living trust is a legal entity that holds your assets during your lifetime and distributes them after death — without going through probate. Probate is a court-supervised process that can take 1-2 years, cost 3-8% of the estate in fees, and is entirely public record.',
        'A trust gives you more control than a will. You can specify conditions on distributions (age requirements, achievement milestones), protect assets from a beneficiary\'s creditors or divorce, and provide a seamless management structure if you become incapacitated.',
        'For most people with net worth under $1-2M and no complex family situation, a well-structured will with beneficiary designations may be sufficient. But once you own real estate in multiple states, have blended family dynamics, or cross the $1M threshold, a trust becomes the right infrastructure.',
      ],
      keyTakeaways: [
        'A living trust avoids probate — saving months, thousands in fees, and preserving privacy',
        'Trusts allow conditions on distributions (e.g., "distributed at age 30" or "for education only")',
        'A trust only protects assets that have been transferred into it — "funding the trust" is a critical step',
        'Irrevocable trusts (ILIT, SLAT, GRAT) provide additional tax benefits but sacrifice flexibility',
      ],
    },
  ],

  // ─── Operations ──────────────────────────────────────────────────────────────
  operations: [
    {
      id: 'operations-budgeting',
      title: 'Cash Flow Management: The Foundation That Makes Everything Else Possible',
      tagline: 'Budgeting & cash flow',
      body: [
        'Every financial goal — building investments, funding retirement, paying off debt, giving generously — is downstream of one thing: spending less than you earn. Cash flow management is the operational layer that makes everything else in the Six Wings possible.',
        'The most effective budgeting systems have a few things in common: they are automated (income flows into designated accounts automatically), they are simple (fewer categories means less friction), and they are aligned with your values (the budget reflects what you actually care about, not a theoretical ideal).',
        'The "pay yourself first" principle means that savings and investments are treated as fixed expenses — transferred automatically before you have a chance to spend them. This single habit has been shown to dramatically increase long-term wealth accumulation compared to saving "whatever is left over."',
      ],
      keyTakeaways: [
        'Automate savings and investments before you have a chance to spend the money',
        'Track your actual spending for 90 days before building a budget — you will be surprised',
        'Simplify to 3-5 categories: needs, savings, wants, giving, debt',
        'Annual increases in income should flow primarily to savings, not lifestyle inflation',
      ],
    },
    {
      id: 'operations-insurance',
      title: 'Insurance as a Risk Transfer Tool: What You Need and What\'s a Waste',
      tagline: 'Insurance strategy',
      body: [
        'Insurance is a tool for transferring catastrophic, unrecoverable financial risk to an insurer in exchange for a predictable premium. The key word is "catastrophic." You should insure risks you could not recover from financially — not risks you could handle with your emergency fund.',
        'Term life insurance is the most important type for most people with dependents. It provides a large death benefit at low cost during the years your family is most financially dependent on you. Whole life and universal life policies are rarely the right primary life insurance tool — they blend insurance with savings at high cost.',
        'Disability insurance is the most underinsured risk for working adults. Your ability to earn income is your most valuable financial asset. Long-term disability insurance should replace 60-70% of your gross income if you cannot work. Most employer plans are inadequate — a personal policy is worth the cost.',
        'Umbrella liability insurance ($1M-$5M) is one of the best values in insurance — typically $150-$300/year for $1M of liability coverage. Essential once you have meaningful assets to protect.',
      ],
      keyTakeaways: [
        'Insure catastrophic, unrecoverable risks — not small expenses you could self-fund',
        'Term life insurance is almost always better than whole/universal life for pure protection',
        'Disability insurance protects your income — the most valuable asset most people have',
        'Umbrella liability insurance costs $150-300/year and protects everything above your home/auto limits',
      ],
    },
  ],
};
