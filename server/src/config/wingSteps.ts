// ─── Six Wing Framework — static config ───────────────────────────────────────
// Affiliate URLs are placeholders. Swap in real affiliate links when partnerships
// are established. Mark isAffiliate: true so the frontend renders a disclosure.

export type WingId =
  | 'growth'
  | 'preservation'
  | 'philanthropy'
  | 'experiences'
  | 'legacy'
  | 'operations';

export const LEVEL_LABELS = ['Foundation', 'Building', 'Established', 'Advanced'] as const;

export interface WingQuestion {
  id: string;
  text: string;
}

export interface WingStep {
  level: number; // this step helps the user move FROM this level to the next
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
  isInternal?: boolean; // true = React Router link, false = external (open new tab)
  isAffiliate?: boolean;
}

export interface WingConfig {
  id: WingId;
  name: string;
  emoji: string;
  tagline: string;
  philosophy: string;
  color: string; // tailwind color token (used in className)
  questions: WingQuestion[];
  steps: WingStep[];
}

export const WINGS: Record<WingId, WingConfig> = {
  // ─── 1. Growth ──────────────────────────────────────────────────────────────
  growth: {
    id: 'growth',
    name: 'Growth',
    emoji: '📈',
    tagline: 'Build income, assets, and opportunity',
    philosophy: 'Growth creates optionality. This is the engine of the family office.',
    color: 'emerald',
    questions: [
      { id: 'has_brokerage',      text: 'Do you have a brokerage or investment account?' },
      { id: 'invests_regularly',  text: 'Do you invest money on a regular basis (at least monthly)?' },
      { id: 'has_real_estate',    text: 'Do you own any rental or investment real estate?' },
      { id: 'has_business_equity',text: 'Do you have equity or ownership in a private business?' },
    ],
    steps: [
      {
        level: 0,
        title: 'Open a brokerage account',
        description:
          "You can't grow what you don't invest. Open a brokerage account and start putting money to work — even $100/month compounds dramatically over time. Fidelity has no minimums, no account fees, and top-tier research tools. Prefer a hands-off approach? Betterment automatically builds and rebalances a diversified portfolio for you — no decisions required.",
        actionLabel: 'Open an account with Fidelity',
        actionUrl: 'https://www.fidelity.com/open-account/overview',
        isAffiliate: true,
      },
      {
        level: 1,
        title: 'Automate short-term cash with T-Bills',
        description:
          "Any cash sitting idle should be earning. A T-Bill ladder earns 4–5%+ with full government backing. Fidelity lets you automate rolling short-term treasuries so your cash is always working.",
        actionLabel: 'Set up a T-Bill ladder on Fidelity',
        actionUrl: 'https://www.fidelity.com/fixed-income-bonds/overview',
        isAffiliate: true,
      },
      {
        level: 2,
        title: 'Start investing in real estate',
        description:
          "Real estate is how most first-generation wealth is built — but you don't need to buy a property to start. Fundrise lets you invest in real estate portfolios starting at $10, with historically strong returns.",
        actionLabel: 'Start with Fundrise',
        actionUrl: 'https://fundrise.com',
        isAffiliate: true,
      },
      {
        level: 3,
        title: 'Add farmland and alternative assets to your portfolio',
        description:
          "Farmland is one of the most uncorrelated, inflation-resistant asset classes available — and it's now accessible to individual investors. AcreTrader gives accredited investors access to institutional-quality farmland deals. Also worth exploring: Republic for startup and private equity investing, and Empower (free) to track your full portfolio in one place.",
        actionLabel: 'Explore AcreTrader',
        actionUrl: 'https://acretrader.com',
        isAffiliate: true,
      },
    ],
  },

  // ─── 2. Preservation ────────────────────────────────────────────────────────
  preservation: {
    id: 'preservation',
    name: 'Preservation',
    emoji: '🛡️',
    tagline: 'Protect what you have built from catastrophic risk',
    philosophy: 'Wealth that is not protected is temporary.',
    color: 'blue',
    questions: [
      { id: 'has_emergency_fund', text: 'Do you have at least 3 months of living expenses in an accessible savings account?' },
      { id: 'has_life_insurance', text: 'Do you have life insurance coverage?' },
      { id: 'has_will',           text: 'Do you have a will or basic estate documents in place?' },
      { id: 'has_trust',         text: 'Do you have a living trust or advanced estate plan?' },
    ],
    steps: [
      {
        level: 0,
        title: 'Build your emergency fund',
        description:
          "Before investing a dollar, you need 3–6 months of expenses in a high-yield savings account. This is your financial foundation — without it, one emergency can unravel everything. Capital One 360 Performance Savings earns a strong APY with no fees.",
        actionLabel: 'Open a Capital One HYSA',
        actionUrl: 'https://www.capitalone.com/bank/savings-accounts/online-high-yield-savings/',
        isAffiliate: true,
      },
      {
        level: 1,
        title: 'Get life insurance and protect your identity',
        description:
          "If anyone depends on your income, you need life insurance. Term life is inexpensive and gives your family a runway if something happens to you. Policygenius compares quotes from top carriers in minutes. Also worth pairing: Aura monitors your identity, credit, and SSN across the dark web — because protecting assets means protecting access to them too.",
        actionLabel: 'Compare rates on Policygenius',
        actionUrl: 'https://www.policygenius.com/life-insurance/',
        isAffiliate: true,
      },
      {
        level: 2,
        title: 'Create a will and power of attorney',
        description:
          "Without a will, courts decide what happens to your assets and your children. Trust & Will lets you create a legally valid will and POA online in under an hour — no attorney required. LegalZoom is a solid alternative if you'd prefer a platform with optional attorney review on demand.",
        actionLabel: 'Create your will with Trust & Will',
        actionUrl: 'https://trustandwill.com',
        isAffiliate: true,
      },
      {
        level: 3,
        title: 'Set up a revocable living trust',
        description:
          "A trust lets your estate skip probate, keeps your affairs private, and gives you more control over how and when assets transfer to the next generation. Trust & Will's trust package walks you through the entire process.",
        actionLabel: 'Build your trust with Trust & Will',
        actionUrl: 'https://trustandwill.com',
        isAffiliate: true,
      },
    ],
  },

  // ─── 3. Philanthropy ────────────────────────────────────────────────────────
  philanthropy: {
    id: 'philanthropy',
    name: 'Philanthropy',
    emoji: '❤️',
    tagline: 'Direct your resources toward meaningful impact',
    philosophy: 'Wealth should extend beyond the family itself.',
    color: 'rose',
    questions: [
      { id: 'gives_regularly',       text: 'Do you give regularly to causes or organizations you care about?' },
      { id: 'has_giving_philosophy', text: 'Do you have a defined giving philosophy or annual giving budget?' },
      { id: 'has_daf',              text: 'Do you have a donor-advised fund or other charitable vehicle?' },
    ],
    steps: [
      {
        level: 0,
        title: 'Define your giving philosophy',
        description:
          "Intentional giving starts with knowing what you stand for. Write one sentence: what causes matter most to your family, and why? Flo can help you articulate it.",
        actionLabel: 'Write it with Flo',
        actionUrl: '/flo',
        isInternal: true,
      },
      {
        level: 1,
        title: 'Start giving intentionally with Daffy',
        description:
          "Daffy is a donor-advised fund built for everyday givers. For $3/month, you can set an annual giving goal, contribute automatically, and donate to any of 1.5 million charities — all with a tax deduction. It's the easiest way to make giving a habit, not a reaction.",
        actionLabel: 'Start giving with Daffy',
        actionUrl: 'https://www.daffy.org',
        isAffiliate: true,
      },
      {
        level: 2,
        title: 'Open a donor-advised fund',
        description:
          "A DAF lets you donate cash or appreciated assets, get the tax deduction immediately, and grant to any charity over time. Fidelity Charitable has no annual fees and accepts as little as $50 to get started.",
        actionLabel: 'Open a DAF with Fidelity Charitable',
        actionUrl: 'https://www.fidelitycharitable.org/giving-account/what-is-a-giving-account.html',
        isAffiliate: true,
      },
      {
        level: 3,
        title: 'Create a family giving policy statement',
        description:
          "Document your giving values, the criteria for what you fund, and how future generations should continue your family's philanthropic legacy.",
        actionLabel: 'Build it with Flo',
        actionUrl: '/flo',
        isInternal: true,
      },
    ],
  },

  // ─── 4. Experiences ─────────────────────────────────────────────────────────
  experiences: {
    id: 'experiences',
    name: 'Experiences',
    emoji: '🌟',
    tagline: 'Design a rich, intentional family life',
    philosophy: 'Wealth should improve lived experience, not only account balances.',
    color: 'amber',
    questions: [
      { id: 'has_experience_budget', text: 'Do you intentionally budget for family experiences (travel, adventures, learning)?' },
      { id: 'has_traditions',        text: 'Do you have established family traditions you actively maintain?' },
      { id: 'plans_learning',        text: 'Do you plan intentional learning or growth experiences for your family?' },
    ],
    steps: [
      {
        level: 0,
        title: 'Set a family experience budget',
        description:
          "Money spent on experiences creates lasting memories and family identity. Decide intentionally: how much will your family invest in experiences this year? Even $2,000/year changes everything.",
        actionLabel: 'Plan it with Flo',
        actionUrl: '/flo',
        isInternal: true,
      },
      {
        level: 1,
        title: 'Start teaching your kids about money',
        description:
          "Financial literacy is an experience in itself. Greenlight gives kids a debit card with parental controls, savings goals, and a built-in allowance system — so they learn by doing, not by watching.",
        actionLabel: 'Get Greenlight for your kids',
        actionUrl: 'https://greenlight.com',
        isAffiliate: true,
      },
      {
        level: 2,
        title: 'Fund experiences with travel rewards',
        description:
          "The best experiences don't have to cost what they're worth. The Chase Sapphire Preferred earns 3x points on dining and 2x on travel — meaning your everyday spending funds your family's next trip. Points transfer to 14 airlines and hotel chains.",
        actionLabel: 'Apply for Chase Sapphire Preferred',
        actionUrl: 'https://creditcards.chase.com/rewards-credit-cards/sapphire/preferred',
        isAffiliate: true,
      },
      {
        level: 3,
        title: 'Book your first multi-generational trip',
        description:
          "A shared trip across generations is one of the highest-ROI things a family can do. VRBO specializes in whole-home rentals with enough room for grandparents, siblings, and kids — all under one roof.",
        actionLabel: 'Find a family home on VRBO',
        actionUrl: 'https://www.vrbo.com',
        isAffiliate: true,
      },
    ],
  },

  // ─── 5. Legacy ──────────────────────────────────────────────────────────────
  legacy: {
    id: 'legacy',
    name: 'Legacy',
    emoji: '📜',
    tagline: 'Preserve wisdom and continuity across generations',
    philosophy: 'Every family leaves a legacy — intentionally or unintentionally.',
    color: 'violet',
    questions: [
      { id: 'has_mission',              text: 'Have you documented your family values or mission statement?' },
      { id: 'has_family_conversations', text: 'Have you had intentional conversations with your family about financial values and goals?' },
      { id: 'has_succession_plan',      text: 'Do you have a plan for transferring your knowledge, values, and assets to the next generation?' },
    ],
    steps: [
      {
        level: 0,
        title: 'Write your family mission statement',
        description:
          "One paragraph that defines who you are, what you stand for, and what you're building together. It takes 20 minutes and anchors every financial decision you'll ever make.",
        actionLabel: 'Write it with Flo',
        actionUrl: '/flo',
        isInternal: true,
      },
      {
        level: 1,
        title: 'Document your core values',
        description:
          "What values do you want to pass to your children? Write them down. Name them. Explain why they matter. This is the foundation of your family's operating philosophy.",
        actionLabel: 'Start with Flo',
        actionUrl: '/flo',
        isInternal: true,
      },
      {
        level: 2,
        title: 'Organize your digital estate',
        description:
          "Most families have no record of where their accounts, policies, passwords, and wishes actually live. Everplans creates a secure, organized digital vault your loved ones can access if something happens to you — without a lawyer.",
        actionLabel: 'Set up your Everplans vault',
        actionUrl: 'https://www.everplans.com',
        isAffiliate: true,
      },
      {
        level: 3,
        title: 'Secure and pass on your digital legacy',
        description:
          "Your digital life — accounts, crypto wallets, investment logins, business assets — needs to be accessible to the right people at the right time. 1Password's Emergency Kit and family plan lets you securely store and share credentials as part of your succession plan.",
        actionLabel: 'Set up 1Password for your family',
        actionUrl: 'https://1password.com/families',
        isAffiliate: true,
      },
    ],
  },

  // ─── 6. Operations ──────────────────────────────────────────────────────────
  operations: {
    id: 'operations',
    name: 'Operations',
    emoji: '⚙️',
    tagline: 'Coordinate and organize your entire family system',
    philosophy: 'Complexity without systems creates chaos.',
    color: 'slate',
    questions: [
      { id: 'finances_organized',  text: 'Do you have your finances organized and tracked in one place?' },
      { id: 'documents_organized', text: 'Do you have your key financial documents (will, insurance, tax returns) organized and accessible?' },
      { id: 'regular_reviews',     text: 'Do you conduct regular financial reviews (monthly or quarterly)?' },
    ],
    steps: [
      {
        level: 0,
        title: "You're here — your command center is live",
        description:
          "You've taken the first step: you have a place to run your family office. Now make it useful — add your first asset so your net worth is visible and trackable.",
        actionLabel: 'Add your first asset',
        actionUrl: '/assets',
        isInternal: true,
      },
      {
        level: 1,
        title: 'Upload your key financial documents',
        description:
          "Get your will, insurance policies, tax returns, and brokerage statements into LegacyOS so everything is organized and accessible when you need it.",
        actionLabel: 'Go to Documents',
        actionUrl: '/documents',
        isInternal: true,
      },
      {
        level: 2,
        title: 'Connect all your accounts in one dashboard',
        description:
          "You can't manage what you can't see. Monarch Money aggregates every bank, brokerage, credit card, and loan into a single dashboard — with cash flow tracking, net worth graphs, and custom reports. Need tighter control over your spending first? YNAB (You Need A Budget) pairs perfectly: use YNAB to give every dollar a job, Monarch to see the full picture.",
        actionLabel: 'Try Monarch Money',
        actionUrl: 'https://www.monarchmoney.com',
        isAffiliate: true,
      },
      {
        level: 3,
        title: 'Outsource your bookkeeping and find a fiduciary advisor',
        description:
          "If you have an LLC or S-Corp, your finances need real infrastructure. Xendoo handles outsourced bookkeeping, tax prep, and S-Corp payroll — so you run the business, not the paperwork. At this level, it's also time to work with a real financial advisor. Zoe Financial matches you with fee-only, fiduciary advisors who are legally required to act in your interest — not earn commissions.",
        actionLabel: 'Get started with Xendoo',
        actionUrl: 'https://www.xendoo.com',
        isAffiliate: true,
      },
    ],
  },
};

export const WING_ORDER: WingId[] = [
  'growth',
  'preservation',
  'philanthropy',
  'experiences',
  'legacy',
  'operations',
];

/** Calculate level from yes/no assessment answers. */
export function calculateLevel(answers: Record<string, boolean>): number {
  const yesCount = Object.values(answers).filter(Boolean).length;
  return Math.min(3, yesCount);
}
