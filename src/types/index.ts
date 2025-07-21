// User and Authentication Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  familyName?: string;
  role: 'FAMILY_ADMIN' | 'FAMILY_MEMBER' | 'ADVISOR';
  subscriptionPlan: 'FREE_TRIAL' | 'CORE' | 'PREMIUM' | 'ENTERPRISE';
  subscriptionStatus: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
  isEmailVerified: boolean;
  trialEndsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Family Types
export interface Family {
  id: string;
  name: string;
  adminId: string;
  legacyScore: number;
  netWorth: number;
  savingsRate: number;
  createdAt: Date;
  updatedAt: Date;
}

// Wing and Progress Types
export interface Wing {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  description: string;
  order: number;
}

export interface WingLevel {
  id: string;
  wingId: string;
  level: number;
  name: string;
  description: string;
  milestones: string[];
  order: number;
}

export interface WingProgress {
  id: string;
  userId: string;
  familyId: string;
  wingId: string;
  wing: Wing;
  currentLevel: number;
  progressPoints: number;
  completedMilestones: string[];
  lastActivityAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Action Item Types
export interface ActionItem {
  id: string;
  userId: string;
  familyId: string;
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
  estimatedHours?: number;
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Dashboard Types
export interface DashboardStats {
  legacyScore: number;
  netWorth: number;
  savingsRate: number;
  totalActionItems: number;
  completedThisMonth: number;
  familyMembers: number;
}

// Wing Configuration (for static config)
export interface WingConfig {
  name: string;
  slug: string;
  icon: string;
  color: string;
  description: string;
  levels: WingLevelConfig[];
}

export interface WingLevelConfig {
  level: number;
  name: string;
  description: string;
  milestones: string[];
} 