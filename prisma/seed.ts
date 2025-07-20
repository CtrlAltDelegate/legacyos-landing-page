import { PrismaClient } from '@prisma/client';
import { WINGS_CONFIG } from '../src/lib/wings-config';
import { hashPassword } from '../src/lib/auth';

const prisma = new PrismaClient();

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

  // The Rodriguez Family  
  const rodriguezUser = await prisma.user.create({
    data: {
      email: 'demo@rodriguez.com',
      passwordHash: await hashPassword('demo123'),
      firstName: 'Maria',
      lastName: 'Rodriguez',
      familyName: 'The Rodriguez Family',
      isEmailVerified: true,
      subscriptionPlan: 'CORE',
      subscriptionStatus: 'ACTIVE',
    },
  });

  const rodriguezFamily = await prisma.family.create({
    data: {
      name: 'The Rodriguez Family',
      adminId: rodriguezUser.id,
      legacyScore: 89,
      netWorth: 425000,
      savingsRate: 28,
    },
  });

  // Create wing progress for demo users
  console.log('📈 Creating wing progress...');
  const wings = await prisma.wing.findMany();
  
  // Johnson family progress (beginner/intermediate)
  const johnsonProgress = [
    { wingSlug: 'growth', level: 2, points: 65, milestones: ['Open High-Yield Savings Account', 'Fund Emergency Starter ($1,000)'] },
    { wingSlug: 'preservation', level: 1, points: 30, milestones: ['Calculate Monthly Expenses'] },
    { wingSlug: 'philanthropy', level: 2, points: 45, milestones: ['Define Giving Values', 'Start Monthly Giving ($25/month)'] },
    { wingSlug: 'experiences', level: 2, points: 80, milestones: ['Create Family Experience Fund', 'Plan Monthly Family Activity', 'Take First Family Trip'] },
    { wingSlug: 'legacy', level: 1, points: 90, milestones: ['Create Basic Will', 'Designate Beneficiaries', 'Create Healthcare Directives'] },
    { wingSlug: 'operations', level: 3, points: 20, milestones: ['Set Up Net Worth Tracking', 'Organize Financial Accounts'] },
  ];

  for (const progress of johnsonProgress) {
    const wing = wings.find(w => w.slug === progress.wingSlug);
    if (wing) {
      await prisma.wingProgress.create({
        data: {
          userId: johnsonUser.id,
          familyId: johnsonFamily.id,
          wingId: wing.id,
          currentLevel: progress.level,
          progressPoints: progress.points,
          completedMilestones: progress.milestones,
        },
      });
    }
  }

  // Rodriguez family progress (advanced)
  const rodriguezProgress = [
    { wingSlug: 'growth', level: 4, points: 85, milestones: ['Open High-Yield Savings Account', 'Reach $25,000 Total Investments', 'Start Side Business'] },
    { wingSlug: 'preservation', level: 3, points: 95, milestones: ['Build 6-Month Emergency Fund', 'Get Disability Insurance'] },
    { wingSlug: 'philanthropy', level: 3, points: 78, milestones: ['Open Donor Advised Fund', 'Engage in Impact Investing'] },
    { wingSlug: 'experiences', level: 4, points: 90, milestones: ['Plan International Trip', 'Multigenerational Trip'] },
    { wingSlug: 'legacy', level: 4, points: 85, milestones: ['Create Family Constitution', 'Wealth Transition Planning'] },
    { wingSlug: 'operations', level: 4, points: 88, milestones: ['Assemble Advisory Team', 'Implement Family Office Processes'] },
  ];

  for (const progress of rodriguezProgress) {
    const wing = wings.find(w => w.slug === progress.wingSlug);
    if (wing) {
      await prisma.wingProgress.create({
        data: {
          userId: rodriguezUser.id,
          familyId: rodriguezFamily.id,
          wingId: wing.id,
          currentLevel: progress.level,
          progressPoints: progress.points,
          completedMilestones: progress.milestones,
        },
      });
    }
  }

  // Create sample action items
  console.log('📋 Creating action items...');
  const actionItems = [
    {
      userId: johnsonUser.id,
      familyId: johnsonFamily.id,
      title: 'Build Emergency Fund',
      description: 'Your Preservation wing is lagging behind. Increase automatic savings to reach your 3-month expense goal faster.',
      priority: 'HIGH',
      estimatedHours: 2,
    },
    {
      userId: johnsonUser.id,
      familyId: johnsonFamily.id,
      title: 'Complete Healthcare Directives',
      description: "You're 90% done with Legacy Level 1! Finish your healthcare directives to level up and unlock new milestones.",
      priority: 'HIGH',
      estimatedHours: 1,
    },
    {
      userId: johnsonUser.id,
      familyId: johnsonFamily.id,
      title: 'Research Business Formation',
      description: 'Consider LLC formation for tax optimization as your investments grow. This will help advance your Operations wing.',
      priority: 'MEDIUM',
      estimatedHours: 3,
    },
  ];

  for (const item of actionItems) {
    await prisma.actionItem.create({ data: item });
  }

  console.log('✅ Seed completed successfully!');
  console.log('\n📊 Demo accounts created:');
  console.log('🏠 The Johnson Family: demo@johnson.com / demo123');
  console.log('🏠 The Rodriguez Family: demo@rodriguez.com / demo123');
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