// ─── Six Wing Framework — static config ───────────────────────────────────────
// Wings are designed to carry a family from zero to family-office-ready (~$25M NW).
// Each wing has 8 assessment questions → 6 levels (0–5) → 6 action steps.
// Level 5 ("Expert") includes ongoing maintenance content and a "what's next" signal
// pointing toward fractional family office territory.

export type WingId =
  | 'growth'
  | 'preservation'
  | 'philanthropy'
  | 'experiences'
  | 'legacy'
  | 'operations';

export const LEVEL_LABELS = [
  'Foundation',   // 0
  'Building',     // 1
  'Developing',   // 2
  'Established',  // 3
  'Advanced',     // 4
  'Expert',       // 5
] as const;

export const MAX_WING_LEVEL = 5;

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
  actionType?: 'write'; // 'write' = inline textarea instead of a link button
  placeholder?: string; // hint text for the textarea
}

export interface WingConfig {
  id: WingId;
  name: string;
  emoji: string;
  tagline: string;
  philosophy: string;
  color: string; // tailwind color token (used in className)
  beyondExpert: string; // shown at level 5 — what a family office does differently
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
    beyondExpert:
      'At $25M+ net worth, a fractional family office manages your investment policy statement, coordinates alternative allocations across private equity, venture, real assets, and hedge funds, handles co-investment opportunities, and runs quarterly investment committee meetings. Your advisor relationship shifts from retail to institutional. The next step is finding a multi-family office with a $10M+ minimum who can give you CIO-level investment governance.',
    questions: [
      { id: 'has_brokerage',           text: 'Do you have a taxable brokerage or investment account?' },
      { id: 'invests_regularly',        text: 'Do you invest consistently on a regular schedule (at least monthly)?' },
      { id: 'maxes_tax_advantaged',     text: 'Do you maximize tax-advantaged accounts each year (401k, IRA, or HSA)?' },
      { id: 'has_real_estate',          text: 'Do you own rental or investment real estate?' },
      { id: 'has_business_equity',      text: 'Do you have equity or ownership in a private business?' },
      { id: 'has_alternatives',         text: 'Do you invest in alternative assets (private equity, venture, farmland, or commodities)?' },
      { id: 'tax_efficient',            text: 'Do you actively use tax-efficient investing strategies (tax-loss harvesting, asset location, or Roth conversions)?' },
      { id: 'has_ips',                  text: 'Do you have a written investment policy statement or formal investment strategy?' },
    ],
    steps: [
      {
        level: 0,
        title: 'Open a brokerage account and start dollar-cost averaging',
        description:
          "You can't build wealth without putting money to work. The single most powerful thing a new investor can do is start a regular automatic investment — even $200/month in a low-cost index fund compounds dramatically over 20 years. Fidelity has no minimums, no account fees, and best-in-class index funds (FZROX) with zero expense ratios. If you want a hands-off approach, Betterment builds and rebalances a diversified portfolio for you automatically — you just set your contribution and forget it.\n\nTarget: $500+ invested within your first 30 days. Automatic monthly contribution set up.",
        actionLabel: 'Open a Fidelity account',
        actionUrl: 'https://www.fidelity.com/open-account/overview',
        isAffiliate: true,
      },
      {
        level: 1,
        title: 'Maximize every tax-advantaged account available to you',
        description:
          "Before investing a dollar in a taxable account, max out the accounts that give you a tax advantage. The order matters:\n\n1. 401(k) up to the employer match (free money — always get this first)\n2. HSA if you have an HDHP — triple tax advantage: deductible going in, tax-free growth, tax-free withdrawal for medical\n3. Roth IRA ($7,000/yr limit, $8,000 if 50+) — tax-free forever after\n4. Back to 401(k) up to the $23,500 annual limit\n5. Mega backdoor Roth if your 401(k) allows after-tax contributions\n\nFidelity handles all of these in one place. If you're self-employed, an SEP-IRA or Solo 401(k) can shelter up to $69,000/year.\n\nTarget: Fully maxing at least two tax-advantaged accounts per year.",
        actionLabel: 'Set up a Fidelity IRA',
        actionUrl: 'https://www.fidelity.com/retirement-ira/overview',
        isAffiliate: true,
      },
      {
        level: 2,
        title: 'Add income-producing real estate to your portfolio',
        description:
          "Real estate is how most first-generation wealth is built. The key advantages: leverage (a 20% down payment controls 100% of the appreciation), rental income, depreciation tax shield, and inflation protection. You have two paths:\n\nPath A — Direct ownership: Buy a rental property. Single-family homes in growing markets, or a small multifamily (2-4 units) where you can house-hack. Run the numbers: target a 6-8%+ cap rate. Resources: BiggerPockets for education, Roofstock for turnkey rentals.\n\nPath B — Passive investing: Fundrise lets you invest in real estate portfolios starting at $10. Historically 8-12% annualized returns. No property management, no tenants. Good for building real estate exposure before you're ready to manage properties directly.\n\nTarget: Real estate representing 15-25% of your total portfolio.",
        actionLabel: 'Start with Fundrise',
        actionUrl: 'https://fundrise.com',
        isAffiliate: true,
      },
      {
        level: 3,
        title: 'Implement a tax-efficient investing strategy',
        description:
          "At this stage, how you invest matters as much as what you invest in. Tax drag silently destroys wealth — a 1% annual tax cost compounds into a dramatically smaller portfolio over 30 years.\n\nKey strategies to implement now:\n\nTax-loss harvesting: Sell positions at a loss to offset gains, then immediately reinvest in a similar (not identical) fund. Wealthfront and Betterment automate this. Can save 0.5-1.5% annually.\n\nAsset location: Put tax-inefficient assets (REITs, high-yield bonds) in tax-advantaged accounts. Keep tax-efficient assets (index funds, growth stocks) in taxable accounts.\n\nRoth conversion ladder: If you have a year with lower income, convert traditional IRA funds to Roth at a lower rate. Powerful for those between jobs or in early semi-retirement.\n\nI-Bonds: Up to $10,000/year in inflation-protected savings, tax-deferred, state-tax-free. Always worth the annual allocation.\n\nTarget: Tax drag below 0.5% annually. Working with a CPA who understands your investment strategy.",
        actionLabel: 'Explore Wealthfront for TLH',
        actionUrl: 'https://www.wealthfront.com',
        isAffiliate: true,
      },
      {
        level: 4,
        title: 'Build an alternatives sleeve in your portfolio',
        description:
          "Once your core portfolio is established, alternatives provide returns uncorrelated to the stock market — critical for protecting and growing wealth beyond $1M.\n\nAlternatives to consider:\n\nFarmland (AcreTrader, FarmTogether): 7-13% historical returns, low correlation to equities, inflation hedge. Accredited investors only. 3-7 year hold periods.\n\nPrivate equity/venture (Republic, Fundrise Venture, AngelList): Higher return potential (20%+ IRR on top funds), but illiquid and high-risk. Limit to 10-15% of portfolio. Start with funds, not individual deals.\n\nHedge funds / liquid alternatives: At $3-5M NW, you may qualify for fund-of-funds that provide exposure to hedging strategies. Minimum investments typically $500K-$1M.\n\nCommodities and gold: 5-10% allocation provides inflation protection and portfolio hedge. GLD (gold ETF) or a commodities index fund is sufficient.\n\nTarget: 15-25% of portfolio in alternatives, diversified across 3-4 strategies.",
        actionLabel: 'Explore farmland on AcreTrader',
        actionUrl: 'https://acretrader.com',
        isAffiliate: true,
      },
      {
        level: 5,
        title: 'Write your Investment Policy Statement and engage a UHNW-capable advisor',
        description:
          "At Expert level, your investment decisions need governance infrastructure — not just intuition. An Investment Policy Statement (IPS) is the document that governs your entire portfolio: your target allocation, rebalancing rules, criteria for adding/removing managers, ethical constraints, and liquidity requirements. It prevents emotional decisions during market dislocations.\n\nYour IPS should cover:\n- Target asset allocation by class (equities, fixed income, real estate, alternatives, cash)\n- Rebalancing triggers (e.g., ±5% drift from target)\n- Return objectives and risk parameters\n- Liquidity requirements (how much you need accessible within 30 / 90 / 365 days)\n- ESG or values-based constraints if applicable\n- Manager selection criteria\n\nAt this level, you should also be working with a fee-only fiduciary RIA who specializes in HNW portfolios. Zoe Financial and NAPFA can match you with advisors who work with $1M-$25M clients. The right advisor adds 1.5-3% net-of-fee annual value through tax planning, behavioral coaching, and coordination.\n\nOngoing: Annual IPS review. Rebalance quarterly. Investment committee meeting with advisor twice a year.",
        actionLabel: 'Find a fiduciary advisor via Zoe',
        actionUrl: 'https://www.zoe.financial',
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
    beyondExpert:
      'At $25M+, preservation becomes an institutional discipline. A family office coordinates a dedicated risk management officer or committee, works with insurance specialists to design custom coverage for art, aircraft, and collectibles, deploys advanced asset protection structures (Wyoming Domestic Asset Protection Trusts, SLATs, ILITs, and offshore strategies where appropriate), and holds annual legal reviews with estate planning attorneys. The goal shifts from "protecting the family" to "protecting the dynasty."',
    questions: [
      { id: 'has_emergency_fund',     text: 'Do you have at least 3 months of living expenses in a high-yield savings account?' },
      { id: 'has_life_insurance',     text: 'Do you have term life insurance with adequate coverage for your dependents?' },
      { id: 'has_will',               text: 'Do you have a will with a named executor and guardian for minor children?' },
      { id: 'has_poa',                text: 'Do you have a durable power of attorney?' },
      { id: 'has_healthcare_docs',    text: 'Do you have a healthcare proxy and advance directive in place?' },
      { id: 'has_trust',              text: 'Do you have a revocable living trust that controls how your assets transfer?' },
      { id: 'has_umbrella',           text: 'Do you have umbrella liability insurance of at least $1M?' },
      { id: 'annual_insurance_review',text: 'Do you conduct an annual insurance review with an independent broker or advisor?' },
    ],
    steps: [
      {
        level: 0,
        title: 'Build a fully-funded emergency reserve',
        description:
          "Your emergency fund is the foundation everything else is built on. Without it, one unexpected event — job loss, medical bill, car repair — forces you to sell investments at the worst time or take on high-interest debt. Either destroys wealth.\n\nTarget: 3 months of essential expenses minimum. 6 months if you're a single-income household, self-employed, or in a volatile industry. 12 months if you have significant illiquid assets (real estate, private equity) that can't be easily accessed.\n\nWhere to keep it: A high-yield savings account (HYSA) earning 4-5% APY. Capital One 360 Performance Savings, Marcus by Goldman Sachs, and SoFi are consistently top-rated. Never keep your emergency fund in a market-linked account — the whole point is that it doesn't go down when you need it most.\n\nTarget: Emergency fund fully funded. Automatic monthly replenishment if ever used.",
        actionLabel: 'Open a Capital One 360 HYSA',
        actionUrl: 'https://www.capitalone.com/bank/savings-accounts/online-high-yield-savings/',
        isAffiliate: true,
      },
      {
        level: 1,
        title: 'Get term life insurance and protect your identity',
        description:
          "If anyone depends on your income, you need life insurance. The only question is how much and what type.\n\nTerm life: Buy 10-12x your annual income in term coverage. A 30-year policy locked in while you're young and healthy costs as little as $30-50/month. Never buy whole life or universal life as your primary coverage — the investment component dramatically underperforms compared to buying term and investing the difference. Policygenius compares quotes from every major carrier in minutes.\n\nIdentity protection: A data breach can destroy years of credit-building and take months to unwind. Aura monitors your SSN, credit, dark web, and financial accounts with real-time alerts and $1M in identity theft insurance.\n\nDisability insurance: This is the most underinsured risk for working adults. Your ability to earn income is your largest financial asset — insure it. Long-term disability should replace 60-70% of gross income. Check your employer policy first; if inadequate, buy an individual policy through your broker.\n\nTarget: Term life policy in force. Disability insurance covering 60%+ of income.",
        actionLabel: 'Compare rates on Policygenius',
        actionUrl: 'https://www.policygenius.com/life-insurance/',
        isAffiliate: true,
      },
      {
        level: 2,
        title: 'Create your core estate documents',
        description:
          "Without these documents, courts decide what happens to your assets, your children, and your medical care. Four documents every adult needs — ideally before you have a spouse, children, or significant assets:\n\n1. Will / Last Testament: Directs your assets, names your executor (the person who handles your estate), and — critically — names a guardian for your minor children. Without this, a court appoints one.\n\n2. Durable Power of Attorney: Authorizes a trusted person to manage your finances if you're incapacitated. Without it, your family may need a court-ordered conservatorship — expensive and slow.\n\n3. Healthcare Proxy / Medical POA: Designates who makes medical decisions on your behalf if you can't.\n\n4. Advance Directive / Living Will: Specifies your wishes for end-of-life care, life support, and organ donation.\n\nTrust & Will creates all four online in about an hour. For $150-$500 you can have a complete, legally valid document set. LegalZoom is a solid alternative with optional attorney review. Either is dramatically better than having nothing.\n\nTarget: All four documents signed, witnessed, and stored accessibly. Executor and guardian named.",
        actionLabel: 'Create your documents with Trust & Will',
        actionUrl: 'https://trustandwill.com',
        isAffiliate: true,
      },
      {
        level: 3,
        title: 'Set up a revocable living trust',
        description:
          "Once you have meaningful assets — real estate, investment accounts, a business — a will alone is no longer enough. A revocable living trust is the upgrade.\n\nWhy a trust matters:\n- Avoids probate: Assets in a trust pass to your heirs immediately, privately, without a court process that can take 1-2 years and cost 3-8% of the estate in fees.\n- Privacy: Wills become public record. Trusts don't.\n- Incapacity protection: If you become incapacitated, your successor trustee manages your assets without court involvement.\n- Control: You can set conditions on distributions — age requirements, education milestones, \"must maintain employment.\"\n- Multi-state property: If you own real estate in multiple states, a trust avoids ancillary probate in each state.\n\nCritical: A trust only controls what's inside it. \"Funding\" the trust — transferring your accounts and properties into the trust's name — is the step most people miss. Trust & Will walks you through this.\n\nAt $1M+ NW or with real estate in multiple states, a trust is no longer optional.\n\nTarget: Trust created and fully funded. All major accounts and real estate retitled.",
        actionLabel: 'Build your trust with Trust & Will',
        actionUrl: 'https://trustandwill.com',
        isAffiliate: true,
      },
      {
        level: 4,
        title: 'Add umbrella liability insurance and run an annual coverage audit',
        description:
          "As your assets grow, your liability exposure grows with them. A single lawsuit — a car accident, a slip-and-fall at your rental property, a social host liability claim — can wipe out years of wealth-building without the right coverage.\n\nUmbrella insurance: A $1M umbrella policy costs $150-$300/year and sits above your home and auto liability limits. At $2M+ NW, carry at least $2-3M in umbrella coverage. At $5M+, carry $5M+. It's one of the best dollar-for-dollar values in personal finance.\n\nAnnual coverage audit: Review your entire insurance portfolio every year — or more often after major life changes:\n- Life insurance: Is the coverage amount still appropriate? Are beneficiaries updated?\n- Disability: Does it still cover your current income?\n- Home/auto: Are policy limits keeping pace with rising replacement costs?\n- Business insurance: If you own a business, do you have adequate E&O, D&O, or key-man coverage?\n\nWork with an independent broker (not a captive agent) who can shop multiple carriers. Policygenius can help with this.\n\nTarget: Umbrella policy in force ($1M+ per $1M in NW). Annual coverage review scheduled.",
        actionLabel: 'Get an umbrella quote on Policygenius',
        actionUrl: 'https://www.policygenius.com/umbrella-insurance/',
        isAffiliate: true,
      },
      {
        level: 5,
        title: 'Implement advanced asset protection and irrevocable trust strategies',
        description:
          "At Expert level, basic preservation infrastructure is complete. The next layer involves legal structures designed to protect concentrated wealth from creditors, reduce estate taxes, and ensure assets reach the right people in the right amounts.\n\nKey advanced strategies:\n\nWyoming/Nevada LLC or Series LLC: Shield rental properties and business assets from personal liability. Charging order protection in Wyoming and Nevada is among the strongest in the US. $500-$1,000 to set up, nominal annual fees.\n\nIrrevocable Life Insurance Trust (ILIT): Removes life insurance death benefit from your taxable estate. At $12M+ estate value, death benefits without an ILIT can trigger estate taxes. An ILIT holds the policy, keeps the benefit estate-tax-free, and can be structured to fund estate taxes for heirs.\n\nSpousal Lifetime Access Trust (SLAT): Irrevocable trust funded with your lifetime exemption ($13.61M in 2024) now, before potential law changes. Removes assets from your estate while your spouse retains indirect access.\n\nDomestic Asset Protection Trust (DAPT): In states like Nevada, South Dakota, and Delaware, you can be a beneficiary of your own irrevocable trust while shielding assets from creditors. Requires specific setup and seasoning period.\n\nWork with an estate planning attorney (not an online tool) for all irrevocable structures.\n\nOngoing: Annual review with estate attorney. Coordinate with your CPA on gift tax reporting (Form 709). Trust administration review.",
        actionLabel: 'Find an estate planning attorney via ACTEC',
        actionUrl: 'https://www.actec.org/resource-center/find-a-fellow/',
        isAffiliate: false,
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
    beyondExpert:
      'At $25M+, a fractional family office establishes and manages a private foundation or large donor-advised fund, coordinates grant-making strategy with professional program officers, handles IRS compliance (Form 990-PF), structures impact investments alongside philanthropic giving, engages the next generation in a formal giving committee, and develops a legacy philanthropy plan that outlasts the founding generation. The goal becomes a permanent institutional presence in the causes your family cares about.',
    questions: [
      { id: 'gives_regularly',          text: 'Do you give regularly to causes or organizations you care about?' },
      { id: 'has_giving_philosophy',    text: 'Do you have a defined giving philosophy or annual giving budget?' },
      { id: 'donates_appreciated',      text: 'Have you donated appreciated securities, real estate, or other non-cash assets to charity?' },
      { id: 'has_daf',                  text: 'Do you have a donor-advised fund (DAF)?' },
      { id: 'family_giving',            text: 'Have you involved your children or family in giving decisions?' },
      { id: 'tracks_impact',            text: 'Do you track the impact of your giving — not just the donation amount, but the outcomes?' },
      { id: 'advanced_vehicles',        text: 'Do you use advanced giving vehicles (Qualified Charitable Distributions, charitable remainder trusts, or CLATs)?' },
      { id: 'has_giving_policy',        text: 'Have you written a family giving policy statement that documents your philanthropic values and criteria?' },
    ],
    steps: [
      {
        level: 0,
        title: 'Define what your family stands for',
        description:
          "Giving without intention is giving without impact. Before you write a single check, answer these three questions:\n\n1. What problem do I care most about solving? (education, hunger, environment, housing, arts, healthcare, community)\n2. Where do I want to see the change? (local community, national, global)\n3. How do I want to give? (direct service, funding organizations, time and skills, or capital)\n\nThis takes 30 minutes and changes everything. Flo can guide you through it interactively — ask it to help you write your \"family giving philosophy\" in one paragraph. Once written, revisit and refine it annually.",
        actionLabel: 'Write your giving philosophy',
        actionUrl: '/flo',
        isInternal: true,
        actionType: 'write',
        placeholder: 'Our family cares most about [cause — education, housing, environment...]. We want to see change [locally / nationally / globally]. We believe the most impactful way to give is [direct funding / hands-on service / capital]...',
      },
      {
        level: 1,
        title: 'Make giving a consistent habit, not a reaction',
        description:
          "Most people give reactively — when they see a news story, when someone asks them, or at the end of the year when they think about taxes. That approach produces giving that's inconsistent and unaligned with your values.\n\nThe fix: treat giving like a subscription. Decide your annual giving amount upfront, break it into monthly contributions, and automate it. Even $100/month — $1,200/year — when given intentionally to 2-3 organizations you deeply believe in creates more impact than the same amount scattered across dozens of asks.\n\nDaffy is the best tool for this: $3/month gives you a donor-advised fund with automatic contributions, a goal tracker, and access to 1.5 million nonprofits. Contribute monthly, grant whenever you're ready. Fidelity Charitable works for larger amounts with no monthly fee.\n\nTarget: Annual giving goal set. Monthly automatic contribution running.",
        actionLabel: 'Start giving with Daffy',
        actionUrl: 'https://www.daffy.org',
        isAffiliate: true,
      },
      {
        level: 2,
        title: 'Open a Donor-Advised Fund and donate appreciated assets',
        description:
          "A Donor-Advised Fund is the most tax-efficient giving vehicle available to most families — and one of the most underused.\n\nHow it works: You contribute cash or appreciated assets to your DAF, get an immediate tax deduction for the full fair market value, then grant to any 501(c)(3) charity over time at your own pace. You control the timing of the deduction and the timing of the gift — they don't have to be the same year.\n\nThe power of giving appreciated securities: If you donate $10,000 of stock that you bought for $3,000, you avoid paying capital gains tax on the $7,000 gain AND deduct the full $10,000. Compare that to selling the stock (paying $1,050-$2,380 in capital gains taxes) and donating the cash proceeds. The DAF approach is worth 10-24% more.\n\nFidelity Charitable: No annual fees, $5,000 minimum to open, access to every 501(c)(3) in the country. Schwab Charitable and Vanguard Charitable are solid alternatives.\n\nTarget: DAF open. First contribution of appreciated securities made.",
        actionLabel: 'Open a Fidelity Charitable DAF',
        actionUrl: 'https://www.fidelitycharitable.org/giving-account/what-is-a-giving-account.html',
        isAffiliate: true,
      },
      {
        level: 3,
        title: 'Build a giving strategy focused on impact',
        description:
          "Writing checks is easy. Knowing whether those checks are making a difference is hard — but it's what separates intentional philanthropy from feel-good spending.\n\nBuilding a giving strategy involves three things:\n\n1. Cause focus: Narrow your giving to 2-4 areas where you'll develop real expertise and relationships. Generalists spread their impact thin. Specialists drive change.\n\n2. Due diligence: Research the organizations you fund. Charity Navigator and GiveWell rate nonprofits on financial health, transparency, and impact. GiveWell specializes in \"effective altruism\" — identifying the causes where a dollar does the most good.\n\n3. Family involvement: Give children a meaningful role. Let them research organizations, present to the family, and vote on annual grants. A family giving budget that kids help allocate builds financial discernment, empathy, and connection to your values that no inheritance can replicate.\n\nTarget: Annual giving strategy written. 2-4 focus areas identified. Family involved in grant decisions.",
        actionLabel: 'Research organizations on GiveWell',
        actionUrl: 'https://www.givewell.org',
        isAffiliate: false,
      },
      {
        level: 4,
        title: 'Leverage advanced charitable giving vehicles',
        description:
          "At this level, standard DAF contributions are just the beginning. Advanced giving structures can create significantly larger tax benefits and more flexible giving architectures.\n\nQualified Charitable Distributions (QCDs): If you're 70½ or older and have an IRA, you can transfer up to $105,000/year directly to charity — it counts toward your Required Minimum Distribution and doesn't appear in your gross income. Unlike a deduction, which requires itemizing, a QCD reduces your AGI — which also lowers Medicare premiums, SS taxation, and other income-based thresholds.\n\nCharitable Remainder Trust (CRT): You contribute appreciated assets to a CRT. The trust pays you income for life (or a term of years), and the remainder goes to your chosen charity. Deduction upfront, income stream now, charitable legacy later.\n\nCharitable Lead Annuity Trust (CLAT): The reverse of a CRT. The charity gets income for a term of years, then the remainder passes to heirs — often with reduced gift/estate tax because of the charitable deduction.\n\nAll of these require an estate planning attorney to set up. Work with someone who specializes in charitable planning.\n\nTarget: At least one advanced vehicle in use. CPA aware of reporting requirements.",
        actionLabel: 'Consult an attorney via ACTEC',
        actionUrl: 'https://www.actec.org/resource-center/find-a-fellow/',
        isAffiliate: false,
      },
      {
        level: 5,
        title: 'Write your family giving policy statement and build a legacy philanthropy plan',
        description:
          "Expert philanthropists don't just give — they build a giving infrastructure that outlasts them.\n\nFamily Giving Policy Statement: A formal document (2-5 pages) that articulates your family's giving values, the causes you prioritize, the criteria for funding organizations, how giving decisions are made (who has a vote, what thresholds require consensus), and what you explicitly don't fund. This document guides your DAF grants, governs your family foundation if you establish one, and ensures continuity when future generations inherit giving responsibility.\n\nPrivate Foundation vs. Large DAF: At $5M+ in giving assets, a private foundation offers more control, staffing capacity, and the ability to fund individuals (scholarships, emergency grants). The tradeoff: administrative burden (Form 990-PF, 5% annual distribution requirement, excise taxes). Most families are better served by a large DAF until giving assets exceed $10-15M.\n\nMulti-generational legacy: Define explicitly how and when the next generation takes over giving decisions. Create a family philanthropy council. Document the origin story of your giving — why these causes, from when, with what results.\n\nFlo can help you draft this document interactively.\n\nOngoing: Annual giving review. Update giving policy every 3 years.",
        actionLabel: 'Write your giving policy statement',
        actionUrl: '/flo',
        isInternal: true,
        actionType: 'write',
        placeholder: 'Our family giving policy:\n\nCauses we prioritize: ...\nGeographic focus: ...\nHow we evaluate organizations: ...\nAnnual giving goal: $...\nHow giving decisions are made: ...\nWhat we explicitly do not fund: ...',
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
    beyondExpert:
      'At $25M+, a family office manages an "experience budget" as a formal line item — private travel coordination, curator-led educational trips, access to exclusive learning communities (Aspen Institute, YPO, Tiger 21), family retreat planning, and the family council meeting agenda. The goal is to ensure family wealth buys not just things, but an extraordinary quality of life and an educated next generation capable of managing what they inherit.',
    questions: [
      { id: 'has_experience_budget',  text: 'Do you intentionally budget for family experiences (travel, adventures, learning)?' },
      { id: 'has_traditions',         text: 'Do you have established family traditions you actively maintain?' },
      { id: 'teaching_kids_money',    text: 'Do you teach your children about money through hands-on tools (Greenlight, allowances, or investing accounts)?' },
      { id: 'uses_travel_rewards',    text: 'Do you use travel rewards strategically to fund family experiences?' },
      { id: 'multi_gen_trips',        text: 'Have you taken at least one intentional multi-generational family trip?' },
      { id: 'human_capital',          text: 'Do you actively invest in family members\' education, mentorship, or skills beyond standard schooling?' },
      { id: 'family_council',         text: 'Do you have a regular family meeting or family council structure?' },
      { id: 'documented_stories',     text: 'Have you documented your family\'s stories, history, and values in written or recorded form?' },
    ],
    steps: [
      {
        level: 0,
        title: 'Set a family experience budget and make it non-negotiable',
        description:
          "Most families spend on experiences reactively — a vacation when there's time, an activity when the kids ask. The families who build the richest lives treat experiences as a line item in the budget, not an afterthought.\n\nThe framework: Decide annually how much your family will invest in experiences. Start with 5-10% of your take-home income dedicated to intentional experiences. Break it into three buckets:\n\n1. Weekly/monthly micro-experiences ($50-$300): museum visits, outdoor adventures, cooking a new cuisine, day trips. These are the high-frequency, low-cost touches that build family culture.\n2. Annual major experiences ($1,000-$10,000): a summer trip, a family learning adventure, a milestone celebration. One per year minimum.\n3. Multi-year bucket list experiences ($10,000+): a trip abroad, an immersive learning program, a family reunion trip. Plan these 1-2 years in advance.\n\nTarget: Annual experience budget set and funded. First experience planned.",
        actionLabel: 'Set your experience budget',
        actionUrl: '/flo',
        isInternal: true,
        actionType: 'write',
        placeholder: 'Our annual experience budget: $...\n\nMonthly micro-experiences ($50–$300): ...\nAnnual major experience: ...\nBucket list experience (multi-year): ...\n\nFirst experience we are planning: ...',
      },
      {
        level: 1,
        title: 'Start teaching your children about money, early and hands-on',
        description:
          "Financial literacy is a skill that's built over years, not taught in a single conversation. The families that produce financially literate heirs start young and make it hands-on.\n\nAges 5-10: Allowances with purpose. Three jars: spend, save, give. Greenlight gives kids a debit card with parental controls, savings goals, and a giving fund — they learn by doing, not watching. The app lets you automate chores, set spending limits by category, and approve transactions in real time.\n\nAges 10-16: Introduce investing. Fidelity's Youth Account lets kids (with parental oversight) open a real brokerage account. Let them invest in one company they know and love, track it for a year, and learn that real money goes up and down.\n\nAges 16+: Financial responsibility. Give them meaningful financial decisions — a car fund they contribute to, a clothing budget they manage, a savings goal with a matching incentive. Make them feel the consequence of real financial choices before those consequences are catastrophic.\n\nTarget: Every child in the household has a financial tool appropriate to their age.",
        actionLabel: 'Get Greenlight for your kids',
        actionUrl: 'https://greenlight.com',
        isAffiliate: true,
      },
      {
        level: 2,
        title: 'Build a travel rewards strategy that funds your family experiences',
        description:
          "Travel rewards, optimized, can realistically fund $5,000-$20,000 in travel per year on everyday spending — without paying full retail for flights and hotels.\n\nThe foundation stack:\n- Chase Sapphire Preferred: 3x dining, 2x travel. Points transfer to United, Hyatt, Southwest, and 11 other partners. The best everyday card for most families.\n- Chase Ink Business (if you have a business): 5x on office supplies, 3x on shipping and advertising. Stack with personal cards.\n- American Express Gold: 4x on groceries and dining, valuable Membership Rewards points.\n\nThe key skill: transfer points to airline and hotel partners. Flying business class on points transfers can yield 3-10 cents per point vs. 1 cent if you redeem for cash. A $15,000 business class flight can cost 60,000 points + $50 in fees.\n\nTarget: At least one rewards card optimized. First points redemption for a meaningful family experience.",
        actionLabel: 'Apply for Chase Sapphire Preferred',
        actionUrl: 'https://creditcards.chase.com/rewards-credit-cards/sapphire/preferred',
        isAffiliate: true,
      },
      {
        level: 3,
        title: 'Plan your first intentional multi-generational experience',
        description:
          "A shared experience across generations — grandparents, parents, and children under one roof — is one of the highest-ROI investments a family can make. The memories, the relationships, and the family identity formed in those spaces outlast any financial inheritance.\n\nWhat makes a multi-gen experience intentional vs. just a vacation:\n1. A defined purpose: celebrating a milestone, learning together, reconnecting after distance\n2. Structured time: one family dinner where everyone shares a story, one activity that includes all ages\n3. Intentional conversations: \"What's the most important thing you've learned?\" \"What do you want for our family?\"\n\nLogistics: VRBO and Marriott Homes & Villas specialize in large-home rentals with enough space for extended families. For international trips, Remote Year and similar curators handle logistics. Budget $3,000-$15,000 for a 5-7 day domestic multi-gen trip; $10,000-$40,000 for international.\n\nTarget: One multi-generational trip planned for the next 12 months.",
        actionLabel: 'Find a family home on VRBO',
        actionUrl: 'https://www.vrbo.com',
        isAffiliate: true,
      },
      {
        level: 4,
        title: 'Invest intentionally in your family\'s human capital',
        description:
          "Human capital — the skills, knowledge, relationships, and health of every family member — is the most valuable and durable form of wealth. Markets crash. Property values fall. Human capital compounds regardless.\n\nFor your children:\n529 College Savings Plan: Front-load contributions early. A $150,000 lump sum at birth grows to $400,000+ by college at 6% — entirely tax-free if used for education.\nPrivate mentorship and tutoring: Access to exceptional teachers, coaches, and mentors has outsized impact. Budget for specialized instruction in areas where your child shows exceptional interest or talent.\nGap year or meaningful internship: Real-world experiences before or during college produce more career ROI than GPA points.\n\nFor yourself:\nMasterclass, YPO, Aspen Institute, and peer groups: Invest in rooms with people who challenge you intellectually and professionally. The best investment ideas, business partnerships, and life-changing perspectives come from these networks.\n\nFor the family as a unit:\nAnnual \"learning trip\": a family trip centered on education — historical sites, a different culture, a language immersion, a conservation project. These become the defining memories of childhood.\n\nTarget: 529 funded for each child. One family learning trip per year.",
        actionLabel: 'Open a 529 on Fidelity',
        actionUrl: 'https://www.fidelity.com/529-plans/overview',
        isAffiliate: true,
      },
      {
        level: 5,
        title: 'Establish a family council and document your family\'s legacy story',
        description:
          "Expert families don't just have experiences — they build the institutional infrastructure to sustain a rich family culture across generations. Two practices set them apart:\n\nFamily Council: A regular, structured gathering (quarterly or annual) where the family makes decisions together about shared resources, values, and legacy. Agenda items might include: reviewing the family mission statement, discussing charitable giving, planning the annual experience, introducing the next generation to financial concepts, and hearing updates on family investments. Even with young children, a simplified family meeting once a year builds the muscle for the governance conversations that matter later.\n\nFamily Legacy Document: An oral and written record of your family's story — how wealth was built, the values that drove it, the sacrifices made, the lessons learned. Tools: StoryCorp (recorded interviews), Storyworth (guided weekly prompts), or a professionally facilitated family memoir. The families that successfully transfer wealth across generations share one trait: the heirs understand *why* the wealth was built and what they're supposed to do with it.\n\nFlo can guide you through both: ask it to facilitate a family council agenda, or to help you write the first chapter of your family's financial story.\n\nOngoing: Family council at least annually. Legacy document updated every 5 years.",
        actionLabel: 'Document your family story',
        actionUrl: '/flo',
        isInternal: true,
        actionType: 'write',
        placeholder: 'Our family\'s story began when...\n\nThe values that define us are...\n\nWhat we want future generations to understand about how we built this...\n\nThe sacrifices made and lessons learned...',
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
    beyondExpert:
      'At $25M+, a fractional family office builds comprehensive legacy infrastructure: a professional trustee relationship for dynasty trusts, a family constitution governing decision-making and values, a next-generation education program in financial literacy and stewardship, formal succession planning for business interests, and a generational wealth transfer strategy that minimizes estate taxes while maximizing the heirs\' ability to manage what they receive. The goal is not just passing assets — it\'s passing the wisdom and governance capacity to manage them.',
    questions: [
      { id: 'has_mission',               text: 'Have you documented your family values or mission statement?' },
      { id: 'has_family_conversations',  text: 'Have you had intentional conversations with your family about financial values and goals?' },
      { id: 'has_estate_docs',           text: 'Do you have your core estate documents in place (will, POA, healthcare proxy, and advance directive)?' },
      { id: 'has_digital_estate',        text: 'Have you organized your digital estate (accounts, passwords, crypto, and digital assets)?' },
      { id: 'has_trust',                 text: 'Do you have a living trust that controls how your assets transfer to heirs?' },
      { id: 'family_meetings',           text: 'Do you conduct regular family meetings that include discussions of finances and values?' },
      { id: 'documented_history',        text: 'Have you documented your family\'s financial origin story and wealth-building history?' },
      { id: 'has_succession_plan',       text: 'Do you have a formal succession plan for your business interests or family wealth?' },
    ],
    steps: [
      {
        level: 0,
        title: 'Write your family mission statement',
        description:
          "Every great institution has a mission. Your family is an institution. A family mission statement — one paragraph — answers three questions:\n\n1. Who are we? (identity: what values define your family)\n2. What are we building? (purpose: what do you want to create together)\n3. How do we behave? (principles: how do you make decisions)\n\nExamples:\n\"We are a family that builds wealth through integrity and hard work, protects what we've built through prudent stewardship, and uses our resources to create opportunities for those who don't have them.\"\n\n\"We believe every generation should be better prepared than the last. We invest in education, we build businesses, we give generously, and we never mistake wealth for character.\"\n\nThis doesn't have to be perfect. It just has to be written down. Flo can guide you through the questions interactively.\n\nTarget: First draft of family mission statement written. Shared with family.",
        actionLabel: 'Write your family mission statement',
        actionUrl: '/flo',
        isInternal: true,
        actionType: 'write',
        placeholder: 'We are a family that...\n\nWe believe...\n\nWe are building...\n\n(Tip: answer the three questions — Who are we? What are we building? How do we behave?)',
      },
      {
        level: 1,
        title: 'Name and document your core family values',
        description:
          "Values are the operating system that runs beneath every financial decision. They determine how you earn, spend, save, give, and eventually pass on wealth. Most families have implicit values they've never made explicit — which means they can't intentionally pass them to the next generation.\n\nStart by naming 5-7 core values that describe your family at its best. Not aspirational platitudes — actual values that show up in your behavior. \"We show up when it's hard.\" \"We never ask someone to do something we wouldn't do ourselves.\" \"We live below our means.\"\n\nFor each value, write:\n- A one-sentence definition\n- One example of when this value guided a family decision\n- How you want this value to show up in your children's lives\n\nOnce written, post these somewhere visible in your home. Reference them in hard conversations. Let them guide financial decisions — where you invest, what you fund, who you partner with.\n\nFlo can facilitate this exercise interactively.\n\nTarget: 5-7 core values named and defined in writing.",
        actionLabel: 'Document your family values',
        actionUrl: '/flo',
        isInternal: true,
        actionType: 'write',
        placeholder: 'Our core values:\n\n1. [Value] — What it means: ... Example of when this guided a decision: ...\n2. [Value] — ...\n3. [Value] — ...\n4. [Value] — ...\n5. [Value] — ...',
      },
      {
        level: 2,
        title: 'Organize your digital estate and secure your critical documents',
        description:
          "Most families have no record of where their critical accounts, policies, passwords, and wishes actually live. When something happens — an emergency, an incapacity, a death — this gap creates chaos at the worst possible time.\n\nWhat to organize:\n\nDigital accounts: A complete list of every financial account, subscription, social media account, email account, and digital asset — with usernames, passwords (or a password manager reference), and who should have access.\n\nCrypto and digital assets: If you hold cryptocurrency, NFTs, or other digital assets, document the wallets, keys, and recovery phrases. A crypto estate with undocumented keys is permanently inaccessible to heirs.\n\nPhysical documents: Will, trust, insurance policies, tax returns, investment statements, property deeds. Know where they are. Keep a copy in a fireproof safe. Give your executor and/or attorney the location.\n\nEverplans creates a secure digital vault specifically for estate information — organized for your heirs and accessible to the people you designate. 1Password's Emergency Kit is the best solution for password management with estate planning in mind.\n\nTarget: Complete digital estate inventory. All critical documents accessible to executor/trustee.",
        actionLabel: 'Set up your Everplans vault',
        actionUrl: 'https://www.everplans.com',
        isAffiliate: true,
      },
      {
        level: 3,
        title: 'Create a family financial education curriculum and meeting cadence',
        description:
          "The number-one reason generational wealth fails by the third generation isn't investment performance — it's the failure to transmit the knowledge and values needed to manage it. Your heirs don't need to be handed money; they need to be trained to handle it.\n\nFor your children (age-appropriate financial education):\n- Elementary: Money is a tool. Earn it, spend it intentionally, save for goals, give some away.\n- Middle school: Investing basics. What's a stock? Why do companies grow? Why does compound interest matter?\n- High school: Real responsibility. A teen checking account, a part-time job, a meaningful savings goal. Reading The Millionaire Next Door or Rich Dad Poor Dad.\n- College: Portfolio overview. Show them what the family owns. Explain the strategy. Let them shadow advisor meetings.\n\nFamily meetings: Even one family meeting per year — reviewing net worth growth, discussing the giving budget, sharing one financial lesson learned — builds the engagement and literacy that makes wealthy heirs stewards rather than consumers.\n\nTarget: Age-appropriate financial education in place for each child. Annual family financial meeting scheduled.",
        actionLabel: 'Write your family meeting plan',
        actionUrl: '/flo',
        isInternal: true,
        actionType: 'write',
        placeholder: 'Our family financial meeting — [date/frequency]\n\nAgenda:\n1. Net worth review — where we are vs. last year\n2. Giving update — what we funded and impact\n3. One financial lesson each person shares\n4. Goals for next year\n\nWho attends: ...\nWhen we meet: ...',
      },
      {
        level: 4,
        title: 'Build a succession plan for your business and major assets',
        description:
          "If you own a business, commercial real estate, or a significant concentration in any single asset, you need a succession plan. Without one, the default is usually forced liquidation at the worst time — a fire sale that destroys decades of value-building.\n\nBusiness succession paths:\n1. Family succession: Identify, train, and transition leadership to a family member. This takes 5-10 years to do properly. The #1 mistake is waiting too long to name an heir apparent.\n2. Management buyout: Key employees purchase the business using seller financing, SBA loans, or private equity. Often the best outcome when the family doesn't want to operate.\n3. Third-party sale: Sell to a strategic buyer or private equity. Prepare the business 3-5 years in advance: clean financials, documented processes, reduced owner dependency, strong management team.\n4. ESOP (Employee Stock Ownership Plan): Sell to employees with significant tax advantages. Best for businesses with 30+ employees and $5M+ in revenue.\n\nAll of these require a business attorney, a business valuation professional (a \"business appraiser\"), and ideally an M&A advisor.\n\nFor non-business asset succession: Ensure your trust properly accounts for each major asset class and your specific wishes for each.\n\nTarget: Succession timeline and preferred path documented. Key advisors engaged.",
        actionLabel: 'Document your succession plan',
        actionUrl: '/flo',
        isInternal: true,
        actionType: 'write',
        placeholder: 'Succession plan for [business / asset]:\n\nPreferred path: [family succession / management buyout / sale / ESOP]\nTimeline: ...\nNamed successor or buyer profile: ...\nKey milestones to reach: ...\nAdvisors engaged: ...',
      },
      {
        level: 5,
        title: 'Build a complete legacy package for the next generation',
        description:
          "At Expert level, your family's legacy infrastructure should be a complete, documented, and living system — not a collection of documents that only your attorney knows about.\n\nA complete legacy package includes:\n\n1. Family mission statement and values document (revisited annually)\n2. Letter of instruction: A plain-English guide for your executor and heirs — where everything is, what you want done with it, and why. Not a legal document, but the most important communication you'll ever write.\n3. Estate plan package: Will, trust(s), POA, healthcare proxy, advance directive — signed, witnessed, and accessible.\n4. Financial inventory: A complete picture of every asset, account, debt, and insurance policy — with account numbers, institutions, and beneficiary designations.\n5. Business succession plan: Documented path for every business interest.\n6. Family financial narrative: The story of how the family's wealth was built — the decisions, the sacrifices, the philosophy. This is the document that prevents heirs from thinking wealth appeared out of thin air.\n7. Values-based inheritance plan: Not just who gets what, but with what guidelines and with what expectations about stewardship.\n\nFlo can help you write each piece of this interactively. The process takes months — but it's the most important financial work you'll ever do.\n\nOngoing: Annual review and update of all documents. Family meeting to discuss any changes.",
        actionLabel: 'Build your legacy package',
        actionUrl: '/flo',
        isInternal: true,
        actionType: 'write',
        placeholder: 'Legacy package status:\n\n1. Family mission statement: [done / in progress / not started]\n2. Letter of instruction: ...\n3. Estate plan (will, trust, POA, advance directive): ...\n4. Financial inventory: ...\n5. Business succession plan: ...\n6. Family financial narrative: ...\n7. Values-based inheritance plan: ...\n\nNotes:',
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
    beyondExpert:
      'At $25M+, a fractional family office runs your family\'s operations with institutional discipline: a dedicated CFO function, consolidated reporting across all accounts, a professional bill-pay and cash management system, quarterly financial statements, an annual audit or review, tax return coordination across multiple entities (trusts, LLCs, partnerships), coordination of your full advisory team (investment advisor, CPA, estate attorney, insurance broker, banker), and staff management. The family operates like a small institution — because at that scale, it is one.',
    questions: [
      { id: 'finances_organized',     text: 'Do you have your net worth and finances tracked and visible in one place?' },
      { id: 'documents_organized',    text: 'Do you have your key financial documents organized and accessible?' },
      { id: 'regular_reviews',        text: 'Do you conduct regular financial reviews (at least quarterly)?' },
      { id: 'has_fiduciary_advisor',  text: 'Do you work with a fee-only fiduciary financial advisor?' },
      { id: 'has_cpa',                text: 'Do you have a CPA or tax professional who understands your full financial picture?' },
      { id: 'has_bookkeeper',         text: 'Do you have a bookkeeper or accounting system for your business income?' },
      { id: 'annual_nw_review',       text: 'Do you conduct an annual net worth review comparing year over year?' },
      { id: 'annual_team_meeting',    text: 'Do you hold an annual coordination meeting with your full advisory team (advisor, CPA, attorney)?' },
    ],
    steps: [
      {
        level: 0,
        title: 'Set up your family command center',
        description:
          "You've taken the first step by being here — you have a place to run your family office. Now make it useful from day one.\n\nThis week's goal: Get your financial life visible. Add every asset you own to LegacyOS — your primary home, your investment accounts, your retirement accounts, your vehicles, anything of meaningful value. It doesn't need to be perfect. A rough net worth number is infinitely better than no number.\n\nWhy this matters: You can't manage what you can't see. Most families have no idea what their actual net worth is at any given moment — which means they can't track progress, can't set meaningful goals, and can't have an honest conversation with an advisor.\n\nTarget: All major assets logged. Net worth visible on your dashboard. First month-over-month comparison available in 30 days.",
        actionLabel: 'Add your first asset',
        actionUrl: '/assets',
        isInternal: true,
      },
      {
        level: 1,
        title: 'Organize your key financial documents',
        description:
          "The second pillar of operations is document organization. Every financial document that matters should be in one place, accessible, and indexed — not spread across drawers, email folders, and your attorney's office.\n\nDocuments to gather and upload:\n- Tax returns (last 3-5 years)\n- Investment account statements\n- Retirement account statements\n- Insurance policies (life, home, auto, umbrella, disability)\n- Will and estate documents\n- Property deeds and mortgage documents\n- Business formation documents (LLC operating agreement, S-Corp election)\n- Last known net worth statement\n\nLegacyOS's document section stores, parses, and extracts key data from your financial documents — so uploading a bank statement or tax return automatically updates your net worth and financial picture.\n\nTarget: All critical documents uploaded or referenced. Nothing critical exists only in one drawer or one email folder.",
        actionLabel: 'Upload your first document',
        actionUrl: '/documents',
        isInternal: true,
      },
      {
        level: 2,
        title: 'Aggregate all accounts and establish a quarterly review cadence',
        description:
          "At this level, you need a comprehensive financial dashboard — not just LegacyOS (which tracks net worth, documents, and trends) but also a day-to-day cash flow and account aggregation tool.\n\nMonarch Money: The best all-in-one financial aggregator. Connects every bank, brokerage, credit card, and loan. Shows net worth over time, monthly cash flow, spending by category, and custom reports. $14.99/month. Pairs perfectly with LegacyOS — use Monarch for day-to-day visibility, LegacyOS for document management, wing tracking, and Flo.\n\nQuarterly review cadence (schedule this now):\nQ1 (January): Annual tax planning meeting with CPA. Review previous year. Identify estimated payments.\nQ2 (April): Mid-year check. Is your savings rate on track? Any major changes needed?\nQ3 (July): Review investment performance. Rebalance if needed. Assess upcoming major expenses.\nQ4 (October): Year-end tax moves (TLH, Roth conversions, charitable giving). Insurance renewal review.\n\nTarget: All accounts aggregated in Monarch. Quarterly review dates on the calendar for the next 12 months.",
        actionLabel: 'Try Monarch Money',
        actionUrl: 'https://www.monarchmoney.com',
        isAffiliate: true,
      },
      {
        level: 3,
        title: 'Build your professional advisory team',
        description:
          "At a certain level of complexity, DIY financial management becomes the most expensive approach — not because advisors are cheap, but because the mistakes of going it alone are expensive.\n\nThe core advisory team every established family needs:\n\n1. Fee-only fiduciary financial advisor: A Registered Investment Advisor (RIA) who is legally required to act in your interest — not earn commissions. They manage your investment portfolio, provide financial planning, and coordinate your overall strategy. Look for NAPFA members or use Zoe Financial to get matched. Typical cost: 0.75-1.25% of AUM, or $3,000-$10,000/year for flat-fee planners.\n\n2. CPA with HNW experience: Not just a tax preparer — a strategic tax advisor who understands your investment strategy, business structure, estate plan, and giving goals. Looks for opportunities proactively, not just files returns. Ask your advisor for referrals.\n\n3. Estate planning attorney: At minimum, reviews your estate documents every 3-5 years. Increasingly important as your estate grows and tax law changes.\n\nTarget: Fee-only advisor engaged. CPA with HNW experience in place. Estate attorney relationship established.",
        actionLabel: 'Find a fiduciary advisor via Zoe',
        actionUrl: 'https://www.zoe.financial',
        isAffiliate: true,
      },
      {
        level: 4,
        title: 'Build business and entity infrastructure',
        description:
          "If you have business income, a side business, rental properties, or any income source beyond a W-2, you need proper entity structure and accounting infrastructure — both to protect assets and to minimize taxes.\n\nEntity structure:\n- LLC (Single-member): Basic liability protection. Pass-through taxation by default. Easy to maintain.\n- S-Corporation election: If your net self-employment income exceeds ~$50,000/year, electing S-Corp can save $5,000-$15,000 in self-employment taxes annually by splitting income between salary and distributions.\n- Wyoming LLC or Series LLC: For rental property owners, provides stronger charging order protection and allows multiple properties under one umbrella.\n\nAccounting infrastructure:\n- Bookkeeping software (QuickBooks Online or Xero): Separate business and personal finances. Essential for accurate P&L and clean tax preparation.\n- Outsourced bookkeeping (Xendoo, Bench, Pilot): If you're spending more than 5-10 hours/month on financial paperwork, outsource it. At $299-$599/month, the ROI is almost immediate.\n- Business bank account: Never comingle business and personal funds. Separate account, separate credit card.\n\nTarget: Appropriate entity structure in place. Clean books with a dedicated bookkeeper or software system.",
        actionLabel: 'Outsource your books to Xendoo',
        actionUrl: 'https://www.xendoo.com',
        isAffiliate: true,
      },
      {
        level: 5,
        title: 'Run your family like a CFO and coordinate your full advisory team',
        description:
          "At Expert level, your operations infrastructure is complete. The shift is from building the machine to running it with institutional discipline.\n\nThe Family CFO role means:\n\nAnnual Family Financial Plan: Each January, produce a one-page plan: net worth target, savings rate goal, major planned expenses, investment focus, giving goal, and one Wing milestone for the year. Share it with your advisor.\n\nConsolidated quarterly report: One document with every account balance, asset value, and portfolio performance — compared to the prior quarter and prior year. LegacyOS's export feature covers much of this. Your advisor should supplement with portfolio analytics.\n\nAdvisory team coordination meeting (annually): Bring your financial advisor, CPA, and estate attorney together — even on a 60-minute video call — to coordinate strategy. Decisions made in silos (an investment strategy your CPA doesn't know about, an estate plan change your advisor didn't model) create gaps. One aligned meeting per year prevents most of them.\n\nBenchmark against your peer group: At this level, tools like Addepar or Orion (via your advisor) provide institutional-quality reporting. Understand how your returns compare to relevant benchmarks and to what a family of your size should expect.\n\nOngoing: Quarterly family financial review. Annual advisory team meeting. Annual CFO letter to yourself reviewing decisions and next year's focus.",
        actionLabel: 'Export your report from LegacyOS',
        actionUrl: '/export',
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

/**
 * Calculate level (0–5) from 8 yes/no assessment answers.
 * Thresholds: 0→0, 1-2→1, 3-4→2, 5-6→3, 7→4, 8→5
 */
export function calculateLevel(answers: Record<string, boolean>): number {
  const yesCount = Object.values(answers).filter(Boolean).length;
  if (yesCount === 0) return 0;
  if (yesCount <= 2) return 1;
  if (yesCount <= 4) return 2;
  if (yesCount <= 6) return 3;
  if (yesCount <= 7) return 4;
  return 5;
}
