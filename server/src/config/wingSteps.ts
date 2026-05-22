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
          "You can't grow what you don't invest. Open a brokerage account and start putting money to work — even $100/month compounds dramatically over time.",
        actionLabel: 'Open an account with Fidelity',
        actionUrl: 'https://www.fidelity.com/open-account/overview',
        isAffiliate: true,
      },
      {
        level: 1,
        title: 'Automate your investing',
        description:
          'Automatic contributions remove emotion from investing. Set up recurring transfers so you invest before you can spend it. Consistency beats timing every time.',
        actionLabel: 'Explore M1 Finance auto-invest',
        actionUrl: 'https://m1.com',
        isAffiliate: true,
      },
      {
        level: 2,
        title: 'Analyze your first real estate deal',
        description:
          "Real estate is how most first-generation wealth is built. Use LegacyOS to underwrite a deal — what cash flows, what doesn't, and why. Or start with fractional real estate.",
        actionLabel: 'Start with Arrived Homes',
        actionUrl: 'https://arrivedhomes.com',
        isAffiliate: true,
      },
      {
        level: 3,
        title: 'Explore a business acquisition',
        description:
          "Buying an existing business is one of the fastest paths to cash flow. Businesses often sell at 2–4x earnings — sometimes less than a single piece of real estate, with better returns.",
        actionLabel: 'Browse BizBuySell',
        actionUrl: 'https://www.bizbuysell.com',
        isAffiliate: false,
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
          "Before investing a dollar, you need 3–6 months of expenses in a high-yield savings account. This is your financial foundation — without it, one emergency can unravel everything.",
        actionLabel: 'Open a high-yield savings account',
        actionUrl: 'https://www.ally.com/bank/online-savings-account/',
        isAffiliate: true,
      },
      {
        level: 1,
        title: 'Get term life insurance',
        description:
          "If anyone depends on your income, you need life insurance. Term life is inexpensive and gives your family a runway if something happens to you. Compare quotes in minutes.",
        actionLabel: 'Compare rates on Policygenius',
        actionUrl: 'https://www.policygenius.com/life-insurance/',
        isAffiliate: true,
      },
      {
        level: 2,
        title: 'Create a will and power of attorney',
        description:
          "Without a will, courts decide what happens to your assets and your children. A basic will + POA takes 30 minutes and protects everything you've built.",
        actionLabel: 'Create your will with Trust & Will',
        actionUrl: 'https://trustandwill.com',
        isAffiliate: true,
      },
      {
        level: 3,
        title: 'Set up a revocable living trust',
        description:
          "A trust lets your estate skip probate, keeps your affairs private, and gives you more control over how and when assets transfer to the next generation.",
        actionLabel: 'Get started with Trust & Will',
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
        title: 'Set an annual giving budget',
        description:
          "Giving without a budget leads to reactive, guilt-driven donations. Set an annual target — even 1% of income — and give it intentionally to what you actually care about.",
        actionLabel: 'Plan it with Flo',
        actionUrl: '/flo',
        isInternal: true,
      },
      {
        level: 2,
        title: 'Open a donor-advised fund',
        description:
          "A DAF lets you donate appreciated assets, get the tax deduction now, and grant to charities over time. It's how sophisticated donors give — and it's free to open.",
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
        title: 'Plan one intentional family experience',
        description:
          "Pick one experience — a trip, a workshop, an adventure — and commit to it. Intentional experiences become the stories your family tells for generations.",
        actionLabel: 'Get ideas from Flo',
        actionUrl: '/flo',
        isInternal: true,
      },
      {
        level: 2,
        title: 'Create a family traditions calendar',
        description:
          "Traditions create identity and belonging. Document the traditions your family already has and add one new one intentionally this year.",
        actionLabel: 'Build it with Flo',
        actionUrl: '/flo',
        isInternal: true,
      },
      {
        level: 3,
        title: 'Plan a multi-generational experience',
        description:
          "Bring multiple generations together intentionally — a family reunion, a trip with grandparents, or a learning experience that bridges generations and builds family culture.",
        actionLabel: 'Plan it with Flo',
        actionUrl: '/flo',
        isInternal: true,
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
        title: 'Have your first family wealth conversation',
        description:
          "Most families never talk about money — and pay for it across generations. Have one honest conversation about your financial goals, values, and plans. Flo can help you prepare.",
        actionLabel: 'Prepare with Flo',
        actionUrl: '/flo',
        isInternal: true,
      },
      {
        level: 3,
        title: 'Create a succession plan',
        description:
          "Who gets what, when, and why? Document your wishes for each major asset and who should carry on each wing of your family office.",
        actionLabel: 'Build your succession plan',
        actionUrl: '/flo',
        isInternal: true,
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
        title: 'Set up a monthly financial review',
        description:
          "The families who win financially review their numbers regularly. Block one hour per month for a financial review. Flo will have the data ready when you show up.",
        actionLabel: 'Plan it with Flo',
        actionUrl: '/flo',
        isInternal: true,
      },
      {
        level: 3,
        title: "Build your family's financial SOPs",
        description:
          "Document your financial processes so they run even without you: how you invest, how you review, what happens if you're incapacitated. This is how real family offices operate.",
        actionLabel: 'Build with Flo',
        actionUrl: '/flo',
        isInternal: true,
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
