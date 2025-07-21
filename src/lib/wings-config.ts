import { WingConfig } from '@/types';

export const WINGS_CONFIG: WingConfig[] = [
  {
    name: 'Growth',
    slug: 'growth',
    icon: '🚀',
    color: '#22c55e',
    description: 'Build wealth through smart investing in stocks, real estate, and businesses.',
    levels: [
      {
        level: 1,
        name: 'Foundation Builder',
        description: 'Get started with basic investment accounts and emergency savings',
        milestones: [
          'Open High-Yield Savings Account',
          'Fund Emergency Starter ($1,000)',
          'Open Investment Account',
          'First Investment ($100)',
          'Set Up Automatic Investing'
        ]
      },
      {
        level: 2,
        name: 'Growth Accelerator',
        description: 'Build emergency fund and increase investment contributions',
        milestones: [
          'Build 3-Month Emergency Fund',
          'Reach $5,000 Total Investments',
          'Open Roth IRA',
          'Increase Savings Rate to 15%',
          'Learn Basic Investment Strategy'
        ]
      },
      {
        level: 3,
        name: 'Wealth Builder',
        description: 'Diversify investments and optimize tax strategies',
        milestones: [
          'Reach $25,000 Total Investments',
          'Diversify Asset Allocation',
          'Maximize 401(k) Match',
          'Open Taxable Investment Account',
          'Implement Tax-Loss Harvesting'
        ]
      },
      {
        level: 4,
        name: 'Investment Strategist',
        description: 'Advanced investing and business opportunities',
        milestones: [
          'Reach $100,000 Net Worth',
          'Start Side Business',
          'Consider Real Estate Investment',
          'Optimize Investment Tax Strategy',
          'Build Multiple Income Streams'
        ]
      },
      {
        level: 5,
        name: 'Wealth Multiplier',
        description: 'Scale wealth through business and advanced investments',
        milestones: [
          'Reach $500,000 Net Worth',
          'Scale Business Operations',
          'Advanced Investment Strategies',
          'Consider Angel Investing',
          'Build Passive Income Streams'
        ]
      }
    ]
  },
  {
    name: 'Preservation',
    slug: 'preservation',
    icon: '🛡️',
    color: '#3b82f6',
    description: 'Protect your wealth through insurance, legal structures, and risk management.',
    levels: [
      {
        level: 1,
        name: 'Basic Protection',
        description: 'Essential insurance and emergency preparedness',
        milestones: [
          'Calculate Monthly Expenses',
          'Get Health Insurance',
          'Create Basic Budget',
          'Open Emergency Fund Account',
          'Review Existing Insurance'
        ]
      },
      {
        level: 2,
        name: 'Risk Manager',
        description: 'Comprehensive insurance and emergency planning',
        milestones: [
          'Build 6-Month Emergency Fund',
          'Get Life Insurance',
          'Get Disability Insurance',
          'Create Home Security Plan',
          'Document Important Information'
        ]
      },
      {
        level: 3,
        name: 'Asset Protector',
        description: 'Advanced asset protection and liability coverage',
        milestones: [
          'Optimize Insurance Coverage',
          'Consider Umbrella Policy',
          'Create Asset Protection Plan',
          'Set Up Legal Business Structure',
          'Review Property Protection'
        ]
      },
      {
        level: 4,
        name: 'Risk Strategist',
        description: 'Sophisticated protection and tax strategies',
        milestones: [
          'Implement Asset Protection Trusts',
          'Optimize Tax Protection Strategies',
          'Create Succession Planning',
          'Advanced Insurance Strategies',
          'International Asset Protection'
        ]
      },
      {
        level: 5,
        name: 'Wealth Guardian',
        description: 'Institutional-level asset protection and risk management',
        milestones: [
          'Multi-Jurisdictional Planning',
          'Family Office Risk Management',
          'Advanced Trust Structures',
          'Cybersecurity Implementation',
          'Legacy Protection Planning'
        ]
      }
    ]
  },
  {
    name: 'Philanthropy',
    slug: 'philanthropy',
    icon: '💝',
    color: '#ec4899',
    description: 'Create positive impact through strategic giving and social responsibility.',
    levels: [
      {
        level: 1,
        name: 'Giving Starter',
        description: 'Begin your philanthropic journey with purposeful giving',
        milestones: [
          'Define Giving Values',
          'Start Monthly Giving ($25/month)',
          'Research Local Charities',
          'Create Giving Budget',
          'Make First Donation'
        ]
      },
      {
        level: 2,
        name: 'Strategic Giver',
        description: 'Develop systematic approach to charitable giving',
        milestones: [
          'Increase Giving to 3% Income',
          'Choose 3 Core Charities',
          'Track Donation Impact',
          'Learn About Tax Benefits',
          'Volunteer Time Monthly'
        ]
      },
      {
        level: 3,
        name: 'Impact Creator',
        description: 'Maximize impact through strategic philanthropy',
        milestones: [
          'Open Donor Advised Fund',
          'Engage in Impact Investing',
          'Join Charity Board',
          'Organize Fundraising Event',
          'Mentor Others in Giving'
        ]
      },
      {
        level: 4,
        name: 'Change Agent',
        description: 'Lead systematic change and social innovation',
        milestones: [
          'Start Private Foundation',
          'Fund Social Enterprise',
          'Lead Policy Advocacy',
          'Create Giving Circle',
          'Measure Social ROI'
        ]
      },
      {
        level: 5,
        name: 'Philanthropic Leader',
        description: 'Transform communities through visionary giving',
        milestones: [
          'Multi-Generational Giving Plan',
          'International Philanthropy',
          'Systemic Change Initiatives',
          'Thought Leadership',
          'Legacy Giving Strategy'
        ]
      }
    ]
  },
  {
    name: 'Experiences',
    slug: 'experiences',
    icon: '🌟',
    color: '#f59e0b',
    description: 'Create meaningful experiences and lasting memories with family and friends.',
    levels: [
      {
        level: 1,
        name: 'Memory Maker',
        description: 'Start creating intentional family experiences',
        milestones: [
          'Create Family Experience Fund',
          'Plan Monthly Family Activity',
          'Take First Family Trip',
          'Start Family Traditions',
          'Document Special Moments'
        ]
      },
      {
        level: 2,
        name: 'Adventure Planner',
        description: 'Expand experiences and create lasting memories',
        milestones: [
          'Plan Quarterly Adventures',
          'Try New Activity Together',
          'Create Experience Bucket List',
          'Plan Extended Vacation',
          'Invest in Shared Hobbies'
        ]
      },
      {
        level: 3,
        name: 'Experience Designer',
        description: 'Design unique and meaningful family experiences',
        milestones: [
          'Plan Annual Family Retreat',
          'Create Learning Experiences',
          'Plan International Trip',
          'Design Coming-of-Age Experiences',
          'Build Experience Community'
        ]
      },
      {
        level: 4,
        name: 'Legacy Creator',
        description: 'Create transformational experiences that shape character',
        milestones: [
          'Multigenerational Trip',
          'Service Learning Journey',
          'Cultural Immersion Experience',
          'Rite of Passage Traditions',
          'Family Mission Trip'
        ]
      },
      {
        level: 5,
        name: 'Experience Curator',
        description: 'Curate world-class experiences for family enrichment',
        milestones: [
          'Private Family Experiences',
          'Educational Adventures',
          'Exclusive Access Experiences',
          'Transformational Journeys',
          'Legacy Experience Design'
        ]
      }
    ]
  },
  {
    name: 'Legacy',
    slug: 'legacy',
    icon: '🏛️',
    color: '#8b5cf6',
    description: 'Build lasting legacy through values, estate planning, and family governance.',
    levels: [
      {
        level: 1,
        name: 'Foundation Layer',
        description: 'Establish basic legal documents and family values',
        milestones: [
          'Create Basic Will',
          'Designate Beneficiaries',
          'Create Healthcare Directives',
          'Define Family Values',
          'Start Family Conversations'
        ]
      },
      {
        level: 2,
        name: 'Values Builder',
        description: 'Document family history and strengthen relationships',
        milestones: [
          'Document Family History',
          'Create Family Mission Statement',
          'Establish Family Meetings',
          'Plan Values-Based Activities',
          'Create Memory Projects'
        ]
      },
      {
        level: 3,
        name: 'Legacy Planner',
        description: 'Advanced estate planning and wealth transfer strategies',
        milestones: [
          'Create Comprehensive Estate Plan',
          'Set Up Education Trusts',
          'Plan Wealth Transfer Strategy',
          'Create Family Employment Policy',
          'Establish Governance Structure'
        ]
      },
      {
        level: 4,
        name: 'Generational Architect',
        description: 'Build systems for multi-generational success',
        milestones: [
          'Create Family Constitution',
          'Wealth Transition Planning',
          'Next Generation Development',
          'Family Business Planning',
          'Legacy Preservation Systems'
        ]
      },
      {
        level: 5,
        name: 'Dynasty Builder',
        description: 'Create lasting institutions and generational impact',
        milestones: [
          'Multi-Generational Planning',
          'Family Office Development',
          'Institutional Legacy Creation',
          'Perpetual Impact Design',
          'Dynastic Wealth Strategies'
        ]
      }
    ]
  },
  {
    name: 'Operations',
    slug: 'operations',
    icon: '⚙️',
    color: '#6b7280',
    description: 'Optimize financial operations, systems, and family office management.',
    levels: [
      {
        level: 1,
        name: 'System Starter',
        description: 'Basic financial organization and tracking',
        milestones: [
          'Set Up Net Worth Tracking',
          'Organize Financial Accounts',
          'Create Password Management',
          'Set Up Basic Budgeting',
          'Organize Important Documents'
        ]
      },
      {
        level: 2,
        name: 'Efficiency Expert',
        description: 'Streamline financial processes and reporting',
        milestones: [
          'Automate Bill Payments',
          'Set Up Investment Tracking',
          'Create Financial Reporting',
          'Implement Tax Organization',
          'Digitize Financial Records'
        ]
      },
      {
        level: 3,
        name: 'Operations Manager',
        description: 'Advanced financial management and optimization',
        milestones: [
          'Implement Investment Policy',
          'Set Up Family Reporting',
          'Create Tax Optimization Plan',
          'Establish Banking Relationships',
          'Build Advisory Team'
        ]
      },
      {
        level: 4,
        name: 'Strategic Operator',
        description: 'Sophisticated family office operations',
        milestones: [
          'Assemble Advisory Team',
          'Implement Family Office Processes',
          'Create Investment Committee',
          'Advanced Tax Planning',
          'Risk Management Systems'
        ]
      },
      {
        level: 5,
        name: 'Family Office CEO',
        description: 'Institutional-level family office management',
        milestones: [
          'Multi-Family Office Setup',
          'Professional Management Team',
          'Advanced Technology Systems',
          'Global Coordination',
          'Next-Gen Leadership Development'
        ]
      }
    ]
  }
]; 