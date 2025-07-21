const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Helper function to hash password (simple version for demo)
async function hashPassword(password) {
  // In a real implementation, you'd use bcrypt here
  // For demo purposes, we'll use a simple hash
  return Buffer.from(password).toString('base64');
}

// Wings configuration
const WINGS_CONFIG = [
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
      }
    ]
  }
];

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data (in development only)
  if (process.env.NODE_ENV === 'development') {
    await prisma.wingProgress.deleteMany();
    await prisma.actionItem.deleteMany();
    await prisma.wingLevel.deleteMany();
    await prisma.wing.deleteMany();
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();
    await prisma.user.deleteMany();
  }

  // Create wings with levels
  console.log('📊 Creating wings and levels...');
  for (const wingConfig of WINGS_CONFIG) {
    const wing = await prisma.wing.create({
      data: {
        name: wingConfig.name,
        slug: wingConfig.slug,
        icon: wingConfig.icon,
        color: wingConfig.color,
        description: wingConfig.description,
        order: WINGS_CONFIG.indexOf(wingConfig) + 1,
      },
    });

    // Create levels for this wing
    for (const levelConfig of wingConfig.levels) {
      await prisma.wingLevel.create({
        data: {
          wingId: wing.id,
          level: levelConfig.level,
          name: levelConfig.name,
          description: levelConfig.description,
          milestones: levelConfig.milestones,
          order: levelConfig.level,
        },
      });
    }

    console.log(`✅ Created wing: ${wingConfig.name} with ${wingConfig.levels.length} levels`);
  }

  // Create demo users and families
  console.log('👥 Creating demo users...');
  
  // The Johnson Family
  const johnsonUser = await prisma.user.create({
    data: {
      email: 'demo@johnson.com',
      passwordHash: await hashPassword('demo123'),
      firstName: 'John',
      lastName: 'Johnson',
      familyName: 'The Johnson Family',
      isEmailVerified: true,
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  const johnsonFamily = await prisma.family.create({
    data: {
      name: 'The Johnson Family',
      adminId: johnsonUser.id,
      legacyScore: 73,
      netWorth: 47332,
      savingsRate: 34,
    },
  });

  console.log('✅ Seed completed successfully!');
  console.log('\n📊 Demo accounts created:');
  console.log('🏠 The Johnson Family: demo@johnson.com / demo123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 