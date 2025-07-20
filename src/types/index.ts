// Core user and family types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  familyName?: string;
  role: UserRole;
  subscriptionPlan: Plan;
  subscriptionStatus: SubscriptionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Family {
  id: string;
  name: string;
  adminId: string;
  legacyScore: number;
  netWorth: number;
  savingsRate: number;
  members: FamilyMember[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FamilyMember {
  id: string;
  familyId: string;
  userId: string;
  role: FamilyMemberRole;
  user: User;
  joinedAt: Date;
}

// Wing system types
export interface Wing {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  description: string;
  order: number;
  levels: WingLevel[];
}

export interface WingLevel {
  id: string;
  wingId: string;
  level: number;
  name: string;
  description: string;
  milestones: Milestone[];
  order: number;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  order: number;
  estimatedHours?: number;
  resourceLinks?: ResourceLink[];
}

export interface ResourceLink {
  title: string;
  url: string;
  type: 'article' | 'video' | 'tool' | 'guide';
}

// Progress tracking types
export interface WingProgress {
  id: string;
  userId: string;
  familyId?: string;
  wingId: string;
  wing: Wing;
  currentLevel: number;
  progressPoints: number;
  completedMilestones: string[];
  lastActivity: Date;
  updatedAt: Date;
}

export interface LegacyScore {
  total: number;
  wingScores: {
    [wingSlug: string]: {
      current: number;
      max: number;
      percentage: number;
    };
  };
  lastCalculated: Date;
}

// Action items and task management
export interface ActionItem {
  id: string;
  userId: string;
  familyId?: string;
  wingId?: string;
  title: string;
  description: string;
  priority: ActionPriority;
  status: ActionStatus;
  estimatedHours?: number;
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Dashboard and analytics
export interface DashboardStats {
  netWorth: number;
  netWorthChange: number;
  savingsRate: number;
  savingsRateChange: number;
  activeGoals: number;
  completionRate: number;
  nextReviewDays: number;
}

export interface QuarterlyReport {
  id: string;
  userId: string;
  familyId?: string;
  quarter: number;
  year: number;
  legacyScore: number;
  netWorthChange: number;
  topAccomplishments: string[];
  areasForImprovement: string[];
  nextQuarterGoals: string[];
  generatedAt: Date;
}

// Authentication and session types
export interface AuthSession {
  user: User;
  expires: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  familyName?: string;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Component prop types
export interface WingCardProps {
  wing: Wing;
  progress: WingProgress;
  onClick?: () => void;
}

export interface ProgressBarProps {
  current: number;
  max: number;
  color?: string;
  height?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  animated?: boolean;
}

export interface ActionItemCardProps {
  actionItem: ActionItem;
  onComplete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

// Form types
export interface WingProgressFormData {
  milestones: string[];
  notes?: string;
}

export interface ActionItemFormData {
  title: string;
  description: string;
  priority: ActionPriority;
  wingId?: string;
  estimatedHours?: number;
  dueDate?: Date;
}

export interface ProfileFormData {
  firstName: string;
  lastName: string;
  familyName?: string;
  email: string;
}

// Enums (matching Prisma schema)
export enum UserRole {
  FAMILY_ADMIN = 'FAMILY_ADMIN',
  FAMILY_MEMBER = 'FAMILY_MEMBER',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum FamilyMemberRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  CHILD = 'CHILD',
}

export enum Plan {
  FREE_TRIAL = 'FREE_TRIAL',
  CORE = 'CORE',
  LEGACY_PLUS = 'LEGACY_PLUS',
}

export enum SubscriptionStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  INCOMPLETE = 'INCOMPLETE',
}

export enum ActionPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum ActionStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// Utility types
export type WingSlug = 'growth' | 'preservation' | 'philanthropy' | 'experiences' | 'legacy' | 'operations';

export interface WingConfig {
  name: string;
  slug: WingSlug;
  icon: string;
  color: string;
  description: string;
  levels: {
    level: number;
    name: string;
    description: string;
    milestones: Omit<Milestone, 'id' | 'completed'>[];
  }[];
} 