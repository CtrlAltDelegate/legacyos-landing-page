// ─── Wealth Hub — static educational content ──────────────────────────────────
// Personalize functions receive user data and return a callout string or null.

export interface WealthPersonalData {
  netWorth: number;
  cashValue: number;
  equityValue: number;
  totalAssets: number;
  totalLiabilities: number;
  grossIncome: number | null;
  creditCardBalance: number | null;
  effectiveTaxRate: number | null;
  isSelfEmployed: boolean;
}

export interface WealthArticle {
  id: string;
  category: 'foundations' | 'wealth_building' | 'tax_strategy';
  categoryLabel: string;
  title: string;
  tagline: string;
  body: string[];
  keyTakeaways: string[];
  personalize?: (data: WealthPersonalData) => string | null;
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export const WEALTH_ARTICLES: WealthArticle[] = [

  // ── Foundations ─────────────────────────────────────────────────────────────

  {
    id: 'emergency_fund',
    category: 'foundations',
    categoryLabel: 'Foundations',
    title: 'The Emergency Fund',
    tagline: 'Your financial seatbelt',
    body: [
      'An emergency fund is a cash reserve covering 3-6 months of living expenses, held in a high-yield savings account (HYSA) — not invested in the stock market. Its purpose is not to grow; it is to ensure that a job loss, medical bill, or major car repair does not force you to sell investments at the worst possible time or take on high-interest debt.',
      'The 3-month floor applies if you have stable W-2 income, no dependents, and low monthly fixed expenses. The 6-month ceiling applies if you are self-employed, have dependents, work in a volatile industry, or carry high fixed expenses. Some people feel more comfortable at 9-12 months — that is a personal risk tolerance decision, not a financial optimization.',
      'Once your emergency fund is funded, redirect additional savings up the investment priority ladder. Many people stall at this step — keeping too much cash "just in case." Excess cash beyond 12 months of expenses is a quiet drag on long-term wealth building. High-yield savings accounts currently pay 4-5% APY, but a diversified investment portfolio has historically returned 7-10% annually.',
    ],
    keyTakeaways: [
      'Target 3-6 months of living expenses (not gross income)',
      'Keep it in a high-yield savings account (HYSA) — currently 4-5% APY',
      'Not in stocks, CDs, or a standard checking account',
      'Once funded, redirect surplus savings to tax-advantaged investments',
    ],
    personalize: (data) => {
      if (data.cashValue > 0 && data.grossIncome) {
        const monthsGross = data.cashValue / (data.grossIncome / 12);
        if (monthsGross < 3) {
          return `Your current liquid cash (${fmt(data.cashValue)}) covers roughly ${monthsGross.toFixed(1)} months of gross income — below the 3-month minimum. Building this buffer is typically the highest-priority financial move before investing more.`;
        }
        if (monthsGross >= 3 && monthsGross <= 7) {
          return `Your liquid cash (${fmt(data.cashValue)}) covers approximately ${monthsGross.toFixed(1)} months of gross income — within the recommended 3-6 month range.`;
        }
      }
      return null;
    },
  },

  {
    id: 'priority_ladder',
    category: 'foundations',
    categoryLabel: 'Foundations',
    title: 'The Investment Priority Ladder',
    tagline: 'Where to put the next dollar',
    body: [
      'Every dollar you save has multiple possible destinations, and the order matters enormously for after-tax returns. The investment priority ladder gives a systematic framework for deciding where each new dollar goes — maximizing tax advantages before investing in taxable accounts.',
      'The optimal order: (1) 401k contributions to capture the full employer match — this is an immediate 50-100% return, no investment can beat it; (2) Pay off high-interest debt above 7% APR; (3) Max your HSA if you are on a high-deductible health plan ($4,300 individual / $8,550 family in 2025 — it is triple tax-advantaged); (4) Max a Roth or Traditional IRA ($7,000 / $8,000 if 50+); (5) Max your 401k ($23,500 in 2025); (6) Taxable brokerage account.',
      'The logic behind this order is straightforward: tax-advantaged accounts effectively save you your marginal tax rate on every dollar contributed. In the 22% bracket, maxing a Roth IRA is worth 22% more than holding the same investments in a taxable account — entirely from tax avoidance, with no additional risk.',
    ],
    keyTakeaways: [
      'Always capture the full employer 401k match first — it is free money',
      'HSA is triple tax-advantaged: pre-tax in, tax-free growth, tax-free out (for medical)',
      'After tax-advantaged maximums, a taxable brokerage account is the next step',
      'The order shifts if you carry high-interest debt (>7% APR) — pay that off first',
    ],
    personalize: (data) => {
      if (data.grossIncome && data.grossIncome > 80_000) {
        return `At your income level, you likely have meaningful room to increase tax-advantaged contributions. Every additional dollar in a traditional 401k reduces your taxable income — at $${(data.grossIncome).toLocaleString()} gross, that is real savings at your marginal rate.`;
      }
      return null;
    },
  },

  {
    id: 'dca',
    category: 'foundations',
    categoryLabel: 'Foundations',
    title: 'Dollar-Cost Averaging',
    tagline: 'Time in market beats timing the market',
    body: [
      'Dollar-cost averaging (DCA) means investing a fixed amount at regular intervals regardless of market conditions. Your monthly 401k contribution is the classic example. When prices are high, you buy fewer shares; when prices are low, you buy more. Over time, your average cost per share is lower than the average share price during the period.',
      'The evidence for DCA over lump-sum investing is mixed — lump-sum investing outperforms DCA roughly two-thirds of the time historically because markets trend upward. However, DCA is psychologically powerful: it removes the paralyzing question of "is now the right time?" and keeps you consistently invested.',
      'The most important insight here is behavioral, not mechanical. An investor who put $10,000 into a total-market index fund on the single worst day of every year for 20 years still dramatically outperformed an investor who waited for the "right time" and missed years of growth. The discipline to stay invested matters far more than perfect timing.',
    ],
    keyTakeaways: [
      'Automate contributions so you never have to decide to invest',
      'Time in market > timing the market — missing the 10 best days in a decade cuts returns in half',
      'DCA protects against the psychological trap of waiting for "the perfect moment"',
      'Reinvest dividends automatically to compound effectively',
    ],
    personalize: () => null,
  },

  {
    id: 'four_percent_rule',
    category: 'foundations',
    categoryLabel: 'Foundations',
    title: 'The 4% Rule and Your FIRE Number',
    tagline: 'What your retirement target actually is',
    body: [
      'The 4% rule comes from the Trinity Study (1998), which backtested different stock/bond portfolios through 30-year retirement periods — including the Great Depression and 1970s stagflation. The finding: a portfolio with 50-75% equities could sustain 4% annual withdrawals (adjusted for inflation) across nearly all historical periods with over 95% success.',
      'Your FIRE number is simply your annual spending multiplied by 25. If you spend $60,000 per year, you need approximately $1.5 million. This is the mathematical inverse of 4%: $1.5M × 4% = $60,000/year. A well-diversified portfolio has historically grown at 7-10% annually — comfortably above the 4% withdrawal rate — which is why this rule holds.',
      'Caveats matter: the 4% rule was designed for 30-year retirements. Early retirees targeting 40+ year horizons often use 3-3.5% to account for sequence-of-returns risk (large losses early in retirement are the primary threat). Social Security, pension income, or rental income reduces the portfolio withdrawal required, effectively lowering your FIRE number.',
    ],
    keyTakeaways: [
      'FIRE number = annual expenses × 25',
      'Works because diversified portfolios historically grow faster than 4%/year',
      'Early retirement (40+ year horizon) → target 3-3.5% to be safer',
      'Social Security and other income sources reduce your required portfolio size',
    ],
    personalize: (data) => {
      if (data.netWorth > 100_000) {
        const annualWithdrawal = data.netWorth * 0.04;
        const monthlyWithdrawal = annualWithdrawal / 12;
        return `At your current net worth of ${fmt(data.netWorth)}, the 4% rule would support approximately ${fmt(annualWithdrawal)}/year (${fmt(monthlyWithdrawal)}/month) in retirement withdrawals indefinitely.`;
      }
      return null;
    },
  },

  // ── Wealth Building ──────────────────────────────────────────────────────────

  {
    id: 'asset_allocation',
    category: 'wealth_building',
    categoryLabel: 'Wealth Building',
    title: 'Asset Allocation Frameworks',
    tagline: 'The only free lunch in investing',
    body: [
      'Asset allocation — how you divide your portfolio between stocks, bonds, real estate, cash, and other asset classes — is the primary driver of both long-term returns and portfolio volatility. Research consistently shows that asset allocation explains roughly 90% of portfolio performance variation over time, far more than individual security selection.',
      'A common rule of thumb: hold (110 minus your age)% in stocks, with the remainder in bonds. A 35-year-old would be 75% stocks, 25% bonds. This is a blunt instrument — your actual risk tolerance, income stability, time horizon, and existing real estate holdings all matter. Vanguard\'s target-date retirement funds use a similar glide path, automatically shifting from aggressive to conservative as the target date approaches.',
      'For most people in wealth-building mode, the greatest risk is not short-term volatility — it is not being invested at all. Stocks\' historical ~10% annual return (7% after inflation) is only captured by investors who stay invested through downturns. The primary role of bonds or cash in a younger investor\'s portfolio is to reduce the emotional pressure to sell during market crashes.',
    ],
    keyTakeaways: [
      'Asset allocation drives ~90% of portfolio return variation — more than stock picking',
      'Rule of thumb: (110 - your age)% in stocks',
      'The best allocation is one you will stick with through a 40% market drop',
      'Rebalance when any class drifts more than 5% from your target',
    ],
    personalize: (data) => {
      if (data.totalAssets > 50_000 && data.equityValue > 0) {
        const equityPct = ((data.equityValue / data.totalAssets) * 100).toFixed(0);
        return `Your current portfolio is approximately ${equityPct}% in equities. Your LegacyOS portfolio targets are set in the Goals section — Flo can flag drift alerts when your actual allocation diverges from your targets.`;
      }
      return null;
    },
  },

  {
    id: 'three_fund',
    category: 'wealth_building',
    categoryLabel: 'Wealth Building',
    title: 'The Three-Fund Portfolio',
    tagline: 'Simple, diversified, and consistently difficult to beat',
    body: [
      'The three-fund portfolio, popularized by John Bogle and the Bogleheads community, consists of three broad index funds: (1) US total stock market, (2) international total stock market, and (3) US bond market. At Vanguard: VTI + VXUS + BND. At Fidelity: FSKAX + FZILX + FXNAX. At Schwab: SCHB + SCHF + SCHZ.',
      'This simple structure provides ownership of thousands of companies across dozens of countries at minimal expense — typically 0.03-0.05% annually. A 2021 S&P Dow Jones SPIVA report found that over 20 years, 94% of large-cap active fund managers underperformed the S&P 500 index. The three-fund portfolio captures essentially the entire global market at almost no cost.',
      'Critics argue this approach is "too simple" or misses factor premiums like small-cap value. These critiques have some merit, but the evidence for factor investing is mixed and it increases complexity and cost. Most investors — even sophisticated ones — are better served by a simple, low-cost strategy they will hold consistently than a complex one they will second-guess during downturns.',
    ],
    keyTakeaways: [
      'Three funds cover the entire global stock market plus investment-grade bonds',
      'Expense ratio difference of 0.05% vs 1.0% compounds to a ~25% difference over 30 years',
      'International allocation reduces US-specific concentration risk',
      'You can approximate this in any 401k using the closest available index funds',
    ],
    personalize: () => null,
  },

  {
    id: 'debt_payoff',
    category: 'wealth_building',
    categoryLabel: 'Wealth Building',
    title: 'Debt Payoff: Avalanche vs. Snowball',
    tagline: 'Two paths out of debt — pick the one you will finish',
    body: [
      'The debt avalanche method: list all debts by interest rate, highest first. Make minimum payments on all accounts, then direct every extra dollar to the highest-rate debt. Once that is paid off, roll that payment amount to the next highest rate. This method minimizes the total interest paid and is mathematically optimal.',
      'The debt snowball method: list all debts by balance, smallest first. Make minimum payments on all, direct extra dollars to the smallest balance regardless of interest rate. This generates quick wins and psychological momentum. Harvard Business School research (2012) found that people using the snowball method were more likely to become debt-free — the behavioral advantage can outweigh the mathematical disadvantage.',
      'For high-interest debt above 7% APR — particularly credit cards at 20-25% APR — both methods dramatically beat minimum payments. The difference between avalanche and snowball is usually smaller than the behavioral gap between following through and giving up. If you have debt under 5-6% (many mortgages and federal student loans), the math often favors investing the extra money rather than accelerating payoff, especially in tax-advantaged accounts.',
    ],
    keyTakeaways: [
      'Avalanche: mathematically optimal, minimizes total interest paid',
      'Snowball: psychologically powerful, higher real-world completion rates',
      'Both vastly beat minimum payments on high-interest debt',
      'For debt under 5-6%, investing often beats aggressive paydown',
    ],
    personalize: (data) => {
      if (data.creditCardBalance && data.creditCardBalance > 0) {
        return `You have ${fmt(data.creditCardBalance)} tracked in credit card balances. At a typical 22% APR, this costs approximately ${fmt(data.creditCardBalance * 0.22)} in annual interest — more than most investments return. This is typically the highest-priority debt to eliminate before investing additional capital.`;
      }
      return null;
    },
  },

  {
    id: 'rebalancing',
    category: 'wealth_building',
    categoryLabel: 'Wealth Building',
    title: 'Portfolio Rebalancing',
    tagline: 'The discipline of selling high and buying low — systematically',
    body: [
      'Rebalancing means periodically selling overweight asset classes and buying underweight ones to return to your target allocation. If your target is 80% stocks and a bull market pushes you to 88%, you would sell some stocks and buy bonds to return to 80/20. It is the systematic implementation of "sell high, buy low."',
      'There are two main approaches: calendar rebalancing (once or twice per year on a fixed schedule) and threshold rebalancing (whenever any asset class drifts more than 5% from target). Research suggests threshold rebalancing slightly outperforms calendar rebalancing, but either approach is far better than never rebalancing at all.',
      'Tax implications matter significantly in taxable accounts: selling appreciated stocks to rebalance triggers capital gains taxes. In tax-advantaged accounts (401k, IRA), you can rebalance freely with no tax consequences. In taxable accounts, prefer rebalancing through new contributions (directing new money to underweight assets) rather than selling. Tax-loss harvesting opportunities during market downturns can also help offset gains.',
    ],
    keyTakeaways: [
      'Rebalancing systematically enforces "sell high, buy low"',
      'Threshold method (±5% drift): generally outperforms calendar rebalancing',
      'Rebalance freely in tax-advantaged accounts — no capital gains implications',
      'In taxable accounts, rebalance via new contributions to avoid triggering gains',
    ],
    personalize: () => null,
  },

  // ── Tax Strategy ─────────────────────────────────────────────────────────────

  {
    id: 'roth_vs_traditional',
    category: 'tax_strategy',
    categoryLabel: 'Tax Strategy',
    title: 'Roth vs. Traditional: Which Tax Break?',
    tagline: 'Pay taxes now or pay taxes later — the decision matters',
    body: [
      'Traditional 401k/IRA: contributions reduce your taxable income today. You pay income taxes on withdrawals in retirement at your then-current rate. This is best if your current marginal tax rate is higher than your expected tax rate in retirement — typically true for high earners in peak earning years who expect lower income in retirement.',
      'Roth 401k/IRA: contributions are made with after-tax dollars. Growth and qualified withdrawals are completely tax-free. This is best if your current tax rate is lower than your expected retirement tax rate — typical for early-career workers, those in temporarily low-income years, or those expecting tax rates to increase in the future.',
      'The practical guidance: strongly prefer Roth if you are in the 12% bracket or below; strongly prefer Traditional if you are in 32%+; either can make sense in the 22-24% range. Many financial planners recommend diversifying between Roth and traditional accounts to hedge against future tax rate uncertainty. Roth conversions during low-income years (between jobs, early retirement) are one of the highest-value tax moves available.',
    ],
    keyTakeaways: [
      'Traditional: reduce taxes now, pay taxes in retirement',
      'Roth: pay taxes now, tax-free growth and withdrawals forever',
      'Roth conversions during low-income years (under 22% bracket) are high-value moves',
      'Diversifying across Roth and traditional balances hedges against uncertain future tax rates',
    ],
    personalize: (data) => {
      if (data.effectiveTaxRate && data.effectiveTaxRate > 0) {
        const bracket = data.effectiveTaxRate > 28
          ? 'Traditional contributions likely make more sense — your effective rate suggests a higher bracket.'
          : data.effectiveTaxRate < 18
            ? 'Roth contributions are likely advantageous — your effective rate suggests a lower bracket where paying taxes now makes sense.'
            : 'You are in the middle range where a mix of Roth and Traditional often makes sense for flexibility.';
        return `Your effective tax rate from confirmed documents is ${data.effectiveTaxRate.toFixed(1)}%. ${bracket}`;
      }
      return null;
    },
  },

  {
    id: 'hsa',
    category: 'tax_strategy',
    categoryLabel: 'Tax Strategy',
    title: 'HSA: The Triple Tax Advantage',
    tagline: 'The most tax-efficient account most people underuse',
    body: [
      'The Health Savings Account (HSA) is available if you are enrolled in a High-Deductible Health Plan (HDHP). It is the only account in the US tax code with three simultaneous tax advantages: contributions are pre-tax (or tax-deductible if made outside payroll), growth is tax-free, and withdrawals for qualified medical expenses are also tax-free. No IRA, 401k, or any other account offers all three.',
      'The optimal HSA investment strategy: contribute the annual maximum ($4,300 individual / $8,550 family in 2025), invest the entire balance in low-cost index funds — exactly like a retirement account — and pay current medical expenses out-of-pocket if you can afford to. Save all medical receipts. There is no time limit on reimbursement: you can claim a receipt from 10 years ago against your current HSA balance, tax-free.',
      'After age 65, you can withdraw HSA funds for any purpose without penalty — you only pay ordinary income tax, making it functionally equivalent to a traditional IRA for non-medical expenses. But for medical expenses, withdrawals remain tax-free at any age. This makes the HSA arguably the best retirement account available for those who qualify.',
    ],
    keyTakeaways: [
      'Triple tax advantage: pre-tax in, tax-free growth, tax-free out for medical',
      'Invest your HSA balance — do not leave it in cash',
      'Save all medical receipts — there is no deadline to reimburse yourself',
      'After 65, works like a traditional IRA for non-medical expenses',
    ],
    personalize: () => null,
  },

  {
    id: 'quarterly_taxes',
    category: 'tax_strategy',
    categoryLabel: 'Tax Strategy',
    title: 'Estimated Quarterly Taxes',
    tagline: 'Avoiding the penalty for waiting until April',
    body: [
      'If you receive income not subject to employer withholding — self-employment income, freelance income, rental income, significant investment dividends or capital gains — the IRS requires you to pay taxes quarterly rather than annually. Failing to pay enough throughout the year results in an underpayment penalty, even if you pay the full amount in April.',
      'Safe harbor rules let you avoid penalties without perfectly estimating your tax liability: pay either (1) 100% of last year\'s total tax bill (110% if your prior-year AGI exceeded $150,000), or (2) 90% of your current year\'s actual liability. Most people use method 1 — it is predictable and eliminates uncertainty. If your income varies significantly from year to year, method 2 may allow lower quarterly payments.',
      '2025 payment schedule: April 15 (Q1: January-March income), June 16 (Q2: April-May income), September 15 (Q3: June-August income), January 15, 2026 (Q4: September-December income). Pay via IRS Direct Pay (free) or EFTPS. Self-employed individuals also pay self-employment tax (15.3% on net earnings up to $176,100) in addition to income tax.',
    ],
    keyTakeaways: [
      'Required if you will owe more than $1,000 in tax not covered by withholding',
      'Safe harbor: pay 100% of prior year\'s tax (110% if prior-year AGI > $150k)',
      '2025 due dates: April 15, June 16, September 15, January 15',
      'Set aside 25-30% of self-employment or freelance income throughout the year',
    ],
    personalize: (data) => {
      if (data.isSelfEmployed && data.effectiveTaxRate) {
        const setAsideRate = Math.max(data.effectiveTaxRate + 5, 28).toFixed(0);
        return `As a self-employed individual, you should set aside approximately ${setAsideRate}% of net self-employment income to cover both income tax (${data.effectiveTaxRate.toFixed(0)}% effective rate from your return) and self-employment tax (~15.3%).`;
      }
      if (data.isSelfEmployed) {
        return `As a self-employed individual, quarterly estimated payments are required. A common rule of thumb is to set aside 25-30% of net self-employment income for taxes.`;
      }
      return null;
    },
  },

  {
    id: 'tax_loss_harvesting',
    category: 'tax_strategy',
    categoryLabel: 'Tax Strategy',
    title: 'Tax-Loss Harvesting',
    tagline: 'Turning paper losses into real tax savings',
    body: [
      'Tax-loss harvesting means deliberately selling an investment that has declined in value to realize a capital loss, which you then use to offset capital gains elsewhere in your portfolio (or up to $3,000 of ordinary income per year if you have no gains to offset). You immediately reinvest the proceeds in a similar — but not identical — security to maintain your market exposure.',
      'The wash-sale rule is the critical constraint: the IRS disallows the loss deduction if you buy the "same or substantially identical" security within 30 days before or after the sale. Selling Vanguard\'s VTI and immediately buying Schwab\'s SCHB is generally considered acceptable since they track different indexes. Selling VTI and rebuying VTI within 30 days violates the rule. Any unused capital losses carry forward indefinitely.',
      'The benefit of tax-loss harvesting is the time value of tax deferral — you are not eliminating taxes, just postponing them until you eventually sell the replacement security. The deferral benefit is most valuable for high-income investors in high-tax states. For investors in lower brackets, or those planning to hold forever or donate appreciated shares, the benefit is smaller. Many robo-advisors (Betterment, Wealthfront) automate this harvesting daily.',
    ],
    keyTakeaways: [
      'Offsets capital gains and up to $3,000/year of ordinary income',
      'Wash-sale rule: do not rebuy the same security within 30 days before or after the sale',
      'Unused losses carry forward indefinitely — they do not expire',
      'Most valuable for high earners in high-tax states with significant taxable accounts',
    ],
    personalize: (data) => {
      if (data.netWorth > 250_000 && data.effectiveTaxRate && data.effectiveTaxRate > 22) {
        return `With your effective tax rate of ${data.effectiveTaxRate.toFixed(1)}% and net worth of ${fmt(data.netWorth)}, you likely have a meaningful taxable investment account. Tax-loss harvesting and strategic asset location (holding tax-inefficient assets in tax-advantaged accounts) could meaningfully improve your after-tax returns.`;
      }
      return null;
    },
  },
];

export const CATEGORY_ORDER: WealthArticle['category'][] = [
  'foundations',
  'wealth_building',
  'tax_strategy',
];

export const CATEGORY_LABELS: Record<WealthArticle['category'], string> = {
  foundations:    'Foundations',
  wealth_building: 'Wealth Building',
  tax_strategy:   'Tax Strategy',
};
