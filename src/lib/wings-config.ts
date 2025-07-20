import { WingConfig } from '@/types';

export const WINGS_CONFIG: WingConfig[] = [
  {
    name: 'Growth',
    slug: 'growth',
    icon: '🚀',
    color: '#22c55e',
    description: 'Build wealth through smart investing in stocks, real estate, and businesses. Progress from basic accounts to managing your own company.',
    levels: [
      {
        level: 1,
        name: 'Foundation Builder',
        description: 'Get started with basic investment accounts and emergency savings',
        milestones: [
          {
            title: 'Open High-Yield Savings Account',
            description: 'Set up a high-yield savings account with at least 1% APY',
            order: 1,
            estimatedHours: 1,
            resourceLinks: [
              { title: 'Best High-Yield Savings Accounts 2025', url: 'https://www.nerdwallet.com/best/banking/high-yield-online-savings-accounts', type: 'article' }
            ]
          },
          {
            title: 'Fund Emergency Starter ($1,000)',
            description: 'Save your first $1,000 in emergency funds',
            order: 2,
            estimatedHours: 4,
          },
          {
            title: 'Open Investment Account',
            description: 'Open a brokerage account with Fidelity, Vanguard, or similar',
            order: 3,
            estimatedHours: 2,
            resourceLinks: [
              { title: 'Fidelity Account Opening', url: 'https://www.fidelity.com', type: 'tool' }
            ]
          },
          {
            title: 'First Investment ($100)',
            description: 'Make your first investment in a broad market index fund',
            order: 4,
            estimatedHours: 2,
          },
          {
            title: 'Set Up Automatic Investing',
            description: 'Automate monthly contributions to your investment account',
            order: 5,
            estimatedHours: 1,
          }
        ]
      },
      {
        level: 2,
        name: 'Portfolio Pioneer',
        description: 'Build a diversified investment portfolio with consistent contributions',
        milestones: [
          {
            title: 'Reach $5,000 Investment Balance',
            description: 'Build your investment account to $5,000',
            order: 1,
            estimatedHours: 8,
          },
          {
            title: 'Diversify Portfolio (3+ Asset Classes)',
            description: 'Add bonds, international stocks, or real estate to your portfolio',
            order: 2,
            estimatedHours: 3,
          },
          {
            title: 'Increase Monthly Contributions to $500',
            description: 'Scale up automatic investing to $500/month',
            order: 3,
            estimatedHours: 1,
          },
          {
            title: 'Open IRA or 401(k)',
            description: 'Start tax-advantaged retirement investing',
            order: 4,
            estimatedHours: 2,
          }
        ]
      },
      {
        level: 3,
        name: 'Asset Acquirer',
        description: 'Expand into real estate and alternative investments',
        milestones: [
          {
            title: 'Research Real Estate Investment',
            description: 'Evaluate REITs, rental properties, or real estate crowdfunding',
            order: 1,
            estimatedHours: 10,
          },
          {
            title: 'Make First Real Estate Investment',
            description: 'Invest in real estate through REITs or property',
            order: 2,
            estimatedHours: 5,
          },
          {
            title: 'Reach $25,000 Total Investments',
            description: 'Build total investment portfolio to $25,000',
            order: 3,
            estimatedHours: 12,
          }
        ]
      },
      {
        level: 4,
        name: 'Business Builder',
        description: 'Start generating business income and equity',
        milestones: [
          {
            title: 'Start Side Business or Freelance',
            description: 'Generate additional income through business activities',
            order: 1,
            estimatedHours: 20,
          },
          {
            title: 'Reach $50,000 Net Worth',
            description: 'Achieve $50,000 in total net worth',
            order: 2,
            estimatedHours: 24,
          }
        ]
      },
      {
        level: 5,
        name: 'Wealth Manager',
        description: 'Manage substantial assets like a family office',
        milestones: [
          {
            title: 'Reach $100,000 Investment Portfolio',
            description: 'Build investment portfolio to six figures',
            order: 1,
            estimatedHours: 36,
          },
          {
            title: 'Own Business or Rental Property',
            description: 'Generate passive income through business or real estate ownership',
            order: 2,
            estimatedHours: 40,
          }
        ]
      }
    ]
  },
  {
    name: 'Preservation',
    slug: 'preservation',
    icon: '🛡️',
    color: '#3b82f6',
    description: 'Protect your wealth with emergency funds, insurance, and risk management strategies that grow more sophisticated over time.',
    levels: [
      {
        level: 1,
        name: 'Safety Net Starter',
        description: 'Build basic emergency fund and essential insurance',
        milestones: [
          {
            title: 'Calculate Monthly Expenses',
            description: 'Track and calculate your true monthly living expenses',
            order: 1,
            estimatedHours: 2,
          },
          {
            title: 'Build $1,000 Emergency Fund',
            description: 'Save $1,000 as a starter emergency fund',
            order: 2,
            estimatedHours: 4,
          },
          {
            title: 'Get Health Insurance',
            description: 'Ensure adequate health insurance coverage',
            order: 3,
            estimatedHours: 3,
          },
          {
            title: 'Build 1-Month Emergency Fund',
            description: 'Expand emergency fund to cover 1 month of expenses',
            order: 4,
            estimatedHours: 6,
          }
        ]
      },
      {
        level: 2,
        name: 'Risk Mitigator',
        description: 'Expand emergency fund and add life insurance',
        milestones: [
          {
            title: 'Build 3-Month Emergency Fund',
            description: 'Expand emergency fund to cover 3 months of expenses',
            order: 1,
            estimatedHours: 8,
          },
          {
            title: 'Get Term Life Insurance',
            description: 'Secure term life insurance worth 10x annual income',
            order: 2,
            estimatedHours: 4,
          },
          {
            title: 'Review and Optimize Insurance',
            description: 'Audit all insurance policies for adequate coverage',
            order: 3,
            estimatedHours: 3,
          }
        ]
      },
      {
        level: 3,
        name: 'Fortress Builder',
        description: 'Build comprehensive protection with disability insurance and larger emergency fund',
        milestones: [
          {
            title: 'Build 6-Month Emergency Fund',
            description: 'Expand emergency fund to cover 6 months of expenses',
            order: 1,
            estimatedHours: 12,
          },
          {
            title: 'Get Disability Insurance',
            description: 'Secure long-term disability insurance',
            order: 2,
            estimatedHours: 4,
          },
          {
            title: 'Create Risk Management Plan',
            description: 'Document comprehensive risk management strategy',
            order: 3,
            estimatedHours: 3,
          }
        ]
      },
      {
        level: 4,
        name: 'Wealth Protector',
        description: 'Add umbrella insurance and asset protection strategies',
        milestones: [
          {
            title: 'Get Umbrella Insurance',
            description: 'Add umbrella liability insurance policy',
            order: 1,
            estimatedHours: 2,
          },
          {
            title: 'Implement Asset Protection',
            description: 'Set up basic asset protection structures',
            order: 2,
            estimatedHours: 8,
          }
        ]
      },
      {
        level: 5,
        name: 'Legacy Protector',
        description: 'Sophisticated wealth protection for high net worth families',
        milestones: [
          {
            title: 'Advanced Asset Protection',
            description: 'Implement sophisticated asset protection strategies',
            order: 1,
            estimatedHours: 15,
          },
          {
            title: 'Multi-Generational Protection',
            description: 'Create protection strategies for future generations',
            order: 2,
            estimatedHours: 10,
          }
        ]
      }
    ]
  },
  {
    name: 'Philanthropy',
    slug: 'philanthropy',
    icon: '❤️',
    color: '#ef4444',
    description: 'Give back meaningfully through strategic charitable giving, donor advised funds, and family philanthropy traditions.',
    levels: [
      {
        level: 1,
        name: 'Giving Beginner',
        description: 'Start consistent charitable giving habits',
        milestones: [
          {
            title: 'Define Giving Values',
            description: 'Identify causes and values that matter to your family',
            order: 1,
            estimatedHours: 2,
          },
          {
            title: 'Start Monthly Giving ($25/month)',
            description: 'Begin consistent monthly charitable giving',
            order: 2,
            estimatedHours: 1,
          },
          {
            title: 'Research Charity Effectiveness',
            description: 'Learn to evaluate charitable organizations for impact',
            order: 3,
            estimatedHours: 3,
            resourceLinks: [
              { title: 'GiveWell Charity Evaluations', url: 'https://www.givewell.org', type: 'tool' }
            ]
          }
        ]
      },
      {
        level: 2,
        name: 'Strategic Giver',
        description: 'Develop strategic approach to charitable giving',
        milestones: [
          {
            title: 'Create Annual Giving Plan',
            description: 'Plan charitable giving for the year with specific goals',
            order: 1,
            estimatedHours: 3,
          },
          {
            title: 'Reach 3% Giving Rate',
            description: 'Give 3% of gross income to charitable causes',
            order: 2,
            estimatedHours: 2,
          },
          {
            title: 'Volunteer Regularly',
            description: 'Commit to regular volunteer service with chosen organization',
            order: 3,
            estimatedHours: 8,
          }
        ]
      },
      {
        level: 3,
        name: 'Impact Investor',
        description: 'Open donor advised fund and engage in impact investing',
        milestones: [
          {
            title: 'Open Donor Advised Fund',
            description: 'Set up donor advised fund for strategic giving',
            order: 1,
            estimatedHours: 3,
          },
          {
            title: 'Engage in Impact Investing',
            description: 'Make investments with positive social/environmental impact',
            order: 2,
            estimatedHours: 8,
          },
          {
            title: 'Family Philanthropy Plan',
            description: 'Create multi-generational philanthropy strategy',
            order: 3,
            estimatedHours: 5,
          }
        ]
      },
      {
        level: 4,
        name: 'Board Leader',
        description: 'Join nonprofit boards and lead charitable initiatives',
        milestones: [
          {
            title: 'Join Nonprofit Board',
            description: 'Serve on the board of a nonprofit organization',
            order: 1,
            estimatedHours: 20,
          },
          {
            title: 'Organize Giving Circle',
            description: 'Start or join a giving circle with other families',
            order: 2,
            estimatedHours: 10,
          }
        ]
      },
      {
        level: 5,
        name: 'Philanthropic Leader',
        description: 'Establish family foundation and lead major giving initiatives',
        milestones: [
          {
            title: 'Establish Family Foundation',
            description: 'Create a private family foundation',
            order: 1,
            estimatedHours: 25,
          },
          {
            title: 'Legacy Giving Program',
            description: 'Implement charitable giving program for future generations',
            order: 2,
            estimatedHours: 15,
          }
        ]
      }
    ]
  },
  {
    name: 'Experiences',
    slug: 'experiences',
    icon: '🌟',
    color: '#f59e0b',
    description: 'Create lasting family memories through intentional travel, adventures, and shared experiences that bond generations.',
    levels: [
      {
        level: 1,
        name: 'Memory Maker',
        description: 'Start intentional family experience planning',
        milestones: [
          {
            title: 'Create Family Experience Fund',
            description: 'Set up dedicated savings for family experiences',
            order: 1,
            estimatedHours: 1,
          },
          {
            title: 'Plan Monthly Family Activity',
            description: 'Establish tradition of monthly family experiences',
            order: 2,
            estimatedHours: 2,
          },
          {
            title: 'Document Family Experiences',
            description: 'Start photo/video documentation of family memories',
            order: 3,
            estimatedHours: 3,
          }
        ]
      },
      {
        level: 2,
        name: 'Adventure Planner',
        description: 'Plan and execute family trips and adventures',
        milestones: [
          {
            title: 'Take First Family Trip',
            description: 'Plan and execute a family vacation or adventure',
            order: 1,
            estimatedHours: 8,
          },
          {
            title: 'Create Annual Experience Plan',
            description: 'Plan family experiences for the entire year',
            order: 2,
            estimatedHours: 4,
          },
          {
            title: 'Try New Activity Together',
            description: 'Experience something completely new as a family',
            order: 3,
            estimatedHours: 6,
          }
        ]
      },
      {
        level: 3,
        name: 'Experience Curator',
        description: 'Create sophisticated and meaningful family experiences',
        milestones: [
          {
            title: 'Plan International Trip',
            description: 'Execute international family travel experience',
            order: 1,
            estimatedHours: 15,
          },
          {
            title: 'Create Family Traditions',
            description: 'Establish meaningful annual family traditions',
            order: 2,
            estimatedHours: 5,
          },
          {
            title: 'Educational Family Experiences',
            description: 'Plan experiences focused on learning and growth',
            order: 3,
            estimatedHours: 8,
          }
        ]
      },
      {
        level: 4,
        name: 'Legacy Experience Builder',
        description: 'Create experiences that build family legacy and values',
        milestones: [
          {
            title: 'Multigenerational Trip',
            description: 'Plan trip including multiple generations of family',
            order: 1,
            estimatedHours: 20,
          },
          {
            title: 'Service Learning Experience',
            description: 'Combine travel with volunteer service',
            order: 2,
            estimatedHours: 15,
          }
        ]
      },
      {
        level: 5,
        name: 'Heritage Curator',
        description: 'Create transformational experiences that define family legacy',
        milestones: [
          {
            title: 'Heritage Journey',
            description: 'Travel to family heritage locations',
            order: 1,
            estimatedHours: 30,
          },
          {
            title: 'Family Experience Legacy Plan',
            description: 'Create plan for passing experience traditions to next generation',
            order: 2,
            estimatedHours: 10,
          }
        ]
      }
    ]
  },
  {
    name: 'Legacy',
    slug: 'legacy',
    icon: '📜',
    color: '#8b5cf6',
    description: 'Plan for generations with estate documents, trusts, family governance, and wealth transition strategies.',
    levels: [
      {
        level: 1,
        name: 'Document Creator',
        description: 'Establish basic estate planning documents',
        milestones: [
          {
            title: 'Create Basic Will',
            description: 'Draft and execute a basic will',
            order: 1,
            estimatedHours: 4,
            resourceLinks: [
              { title: 'Trust & Will Online Estate Planning', url: 'https://trustandwill.com', type: 'tool' }
            ]
          },
          {
            title: 'Designate Beneficiaries',
            description: 'Update all account beneficiaries',
            order: 2,
            estimatedHours: 2,
          },
          {
            title: 'Create Healthcare Directives',
            description: 'Complete healthcare power of attorney and living will',
            order: 3,
            estimatedHours: 2,
          },
          {
            title: 'Organize Important Documents',
            description: 'Create system for storing important legal and financial documents',
            order: 4,
            estimatedHours: 3,
          }
        ]
      },
      {
        level: 2,
        name: 'Protection Planner',
        description: 'Add comprehensive estate planning and asset protection',
        milestones: [
          {
            title: 'Create Revocable Trust',
            description: 'Set up revocable living trust',
            order: 1,
            estimatedHours: 8,
          },
          {
            title: 'Plan Guardian Arrangements',
            description: 'Designate and arrange guardians for minor children',
            order: 2,
            estimatedHours: 4,
          },
          {
            title: 'Create Family Mission Statement',
            description: 'Document family values and mission for future generations',
            order: 3,
            estimatedHours: 5,
          }
        ]
      },
      {
        level: 3,
        name: 'Family Vision Builder',
        description: 'Develop comprehensive family governance and wealth transition plans',
        milestones: [
          {
            title: 'Create Family Constitution',
            description: 'Document family governance structure and values',
            order: 1,
            estimatedHours: 12,
          },
          {
            title: 'Wealth Transition Planning',
            description: 'Plan for transferring wealth to next generation',
            order: 2,
            estimatedHours: 10,
          },
          {
            title: 'Next Generation Preparation',
            description: 'Begin educating next generation about wealth and responsibility',
            order: 3,
            estimatedHours: 15,
          }
        ]
      },
      {
        level: 4,
        name: 'Multigenerational Architect',
        description: 'Create sophisticated trust structures and family governance',
        milestones: [
          {
            title: 'Establish Dynasty Trust',
            description: 'Create trust structure for multiple generations',
            order: 1,
            estimatedHours: 20,
          },
          {
            title: 'Family Council Formation',
            description: 'Establish formal family governance council',
            order: 2,
            estimatedHours: 15,
          }
        ]
      },
      {
        level: 5,
        name: 'Legacy Architect',
        description: 'Master-level estate planning and family office governance',
        milestones: [
          {
            title: 'Family Office Structure',
            description: 'Establish formal family office structure',
            order: 1,
            estimatedHours: 40,
          },
          {
            title: 'Perpetual Legacy Plan',
            description: 'Create plan for maintaining family wealth and values across generations',
            order: 2,
            estimatedHours: 25,
          }
        ]
      }
    ]
  },
  {
    name: 'Operations',
    slug: 'operations',
    icon: '⚙️',
    color: '#6b7280',
    description: 'Manage the machine with net worth tracking, tax optimization, legal structures, and professional advisory coordination.',
    levels: [
      {
        level: 1,
        name: 'Tracker',
        description: 'Establish basic financial tracking and organization',
        milestones: [
          {
            title: 'Set Up Net Worth Tracking',
            description: 'Create system to track net worth monthly',
            order: 1,
            estimatedHours: 3,
          },
          {
            title: 'Organize Financial Accounts',
            description: 'Consolidate and organize all financial accounts',
            order: 2,
            estimatedHours: 4,
          },
          {
            title: 'Create Monthly Budget',
            description: 'Establish and maintain monthly budgeting system',
            order: 3,
            estimatedHours: 5,
          },
          {
            title: 'Set Up Document Storage',
            description: 'Organize digital storage for financial documents',
            order: 4,
            estimatedHours: 3,
          }
        ]
      },
      {
        level: 2,
        name: 'Optimizer',
        description: 'Optimize taxes and financial processes',
        milestones: [
          {
            title: 'Implement Tax-Loss Harvesting',
            description: 'Begin tax-loss harvesting strategy',
            order: 1,
            estimatedHours: 4,
          },
          {
            title: 'Maximize Tax-Advantaged Accounts',
            description: 'Fully utilize IRA, 401(k), and HSA contributions',
            order: 2,
            estimatedHours: 3,
          },
          {
            title: 'Automate Financial Processes',
            description: 'Automate bill paying, investing, and savings',
            order: 3,
            estimatedHours: 4,
          }
        ]
      },
      {
        level: 3,
        name: 'Strategist',
        description: 'Implement sophisticated tax and business strategies',
        milestones: [
          {
            title: 'Consider Business Entity Formation',
            description: 'Evaluate LLC or corporate structure for tax benefits',
            order: 1,
            estimatedHours: 8,
          },
          {
            title: 'Implement Advanced Tax Strategies',
            description: 'Use backdoor Roth, mega backdoor Roth, or other strategies',
            order: 2,
            estimatedHours: 6,
          },
          {
            title: 'Quarterly Financial Reviews',
            description: 'Conduct quarterly comprehensive financial reviews',
            order: 3,
            estimatedHours: 8,
          }
        ]
      },
      {
        level: 4,
        name: 'Coordinator',
        description: 'Coordinate professional advisory team',
        milestones: [
          {
            title: 'Assemble Advisory Team',
            description: 'Build team of CPA, attorney, financial advisor',
            order: 1,
            estimatedHours: 12,
          },
          {
            title: 'Implement Family Office Processes',
            description: 'Create formal processes for wealth management',
            order: 2,
            estimatedHours: 15,
          }
        ]
      },
      {
        level: 5,
        name: 'Family Office Manager',
        description: 'Operate sophisticated family office operations',
        milestones: [
          {
            title: 'Multi-Entity Management',
            description: 'Manage multiple legal entities and structures',
            order: 1,
            estimatedHours: 25,
          },
          {
            title: 'Institutional-Level Operations',
            description: 'Implement institutional-level wealth management operations',
            order: 2,
            estimatedHours: 30,
          }
        ]
      }
    ]
  }
]; 