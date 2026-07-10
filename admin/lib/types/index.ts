export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  plan: "Free" | "Basic" | "Pro" | "Enterprise";
  status: "Active" | "Inactive" | "Suspended";
  joinDate: string;
  lastActive: string;
  loginFrequency?: number;
  appUsageCount?: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: "Draft" | "Published" | "Archived";
  createdAt: string;
  updatedAt: string;
  deployments: number;
  stars: number;
  forks: number;
  language: string;
  framework: string;
}

export interface UserActivityItem {
  id: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface UserDetail extends User {
  phone?: string;
  company?: string;
  location?: string;
  role?: string;
  bio?: string;
  subscriptionHistory: SubscriptionHistoryItem[];
  behaviorStats: {
    loginFrequency: number;
    appUsageCount: number;
    avgSessionDuration: number;
    lastLoginIp: string;
  };
  projects: Project[];
  recentActivity: UserActivityItem[];
}

export interface SubscriptionHistoryItem {
  id: string;
  plan: string;
  startDate: string;
  endDate: string;
  status: string;
  amount: number;
}

export interface Subscription {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  plan: "Basic" | "Pro" | "Enterprise";
  startDate: string;
  renewalDate: string;
  paymentMethod: string;
  status: "Active" | "Canceled" | "Past Due";
  amount: number;
}

export interface StatsOverview {
  totalUsers: number;
  totalUsersChange: number;
  activeSubscriptions: number;
  activeSubscriptionsChange: number;
  mrr: number;
  mrrChange: number;
  churnRate: number;
  churnRateChange: number;
  signupsTrend: TrendPoint[];
  revenueTrend: TrendPoint[];
  planDistribution: PlanDistributionItem[];
  userStatusDistribution: StatusDistributionItem[];
}

export interface TrendPoint {
  date: string;
  value: number;
}

export interface PlanDistributionItem {
  name: string;
  value: number;
}

export interface StatusDistributionItem {
  name: string;
  value: number;
}

export interface BehaviorData {
  dau: TrendPoint[];
  wau: TrendPoint[];
  featureUsage: FeatureUsageItem[];
  engagementHeatmap: EngagementHeatmapCell[];
  topUsers: TopUser[];
}

export interface FeatureUsageItem {
  feature: string;
  count: number;
}

export interface EngagementHeatmapCell {
  day: string;
  hour: number;
  value: number;
}

export interface TopUser {
  id: string;
  name: string;
  email: string;
  sessions: number;
  actions: number;
}

export interface ActivityLog {
  id: string;
  admin: string;
  action: string;
  target: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface Generation {
  id: string;
  userId: string;
  projectId?: string | null;
  threadId: string;
  workflow?: string | null;
  status: string;
  error?: string | null;
  summary?: string | null;
  previewUrl?: string | null;
  startedAt: string;
  completedAt?: string | null;
  createdAt: string;
}

export interface GenerationMetrics {
  total: number;
  completed: number;
  failed: number;
  avgDurationSeconds: number;
  workflowCounts: Record<string, number>;
  dailyTrend: Array<{ date: string; total: number; completed: number; failed: number }>;
}

export interface QueueJob {
  id?: string;
  userId: string;
  sandboxId: string;
  projectId?: string;
  progress: number;
}

export interface QueueMetrics {
  counts: Record<string, number>;
  active: QueueJob[];
  waiting: QueueJob[];
}

export interface SandboxInventoryItem {
  sandboxId: string;
  createdAt: string;
  endAt: string;
  renewing: boolean;
  expiresInMinutes: number;
  healthy: boolean;
}

export interface SandboxInventory {
  total: number;
  healthy: number;
  items: SandboxInventoryItem[];
}
