"use client";

import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Users,
  CreditCard,
  DollarSign,
  TrendingDown,
} from "lucide-react";
import { KPICard } from "@/components/dashboard/kpi-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { fetchStats, fetchActivity, fetchUsers } from "@/lib/api/client";
import { useFormatters } from "@/lib/i18n";
import { useTranslation } from "@/lib/i18n";

const COLORS = ["#00E5FF", "#B026FF", "#10B981", "#F59E0B"];
const STATUS_COLORS = ["#10B981", "#F59E0B", "#EF4444"];

export default function DashboardPage() {
  const { t } = useTranslation();
  const { formatCurrency } = useFormatters();

  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
  } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
  });

  // Fallback: if /stats fails (e.g. 500) or returns totalUsers=0/missing,
  // fetch an unfiltered users page (limit 1) to get the real total.
  const needsUsersCountFallback =
    statsError ||
    (stats !== undefined &&
      (stats.totalUsers === 0 || stats.totalUsers === undefined));

  const { data: usersCount } = useQuery({
    queryKey: ["users-count"],
    queryFn: () => fetchUsers(1, 1, "", ""),
    enabled: needsUsersCountFallback,
  });

  const totalUsers =
    (stats && stats.totalUsers > 0 ? stats.totalUsers : undefined) ??
    usersCount?.total ??
    0;

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ["activity", 10],
    queryFn: () => fetchActivity(10),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          {t("dashboard.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.subtitle")}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title={t("dashboard.kpi.totalUsers")}
          value={totalUsers}
          change={stats?.totalUsersChange}
          icon={<Users className="h-5 w-5" />}
          color="cyan"
          index={0}
        />
        <KPICard
          title={t("dashboard.kpi.activeSubscriptions")}
          value={stats?.activeSubscriptions ?? 0}
          change={stats?.activeSubscriptionsChange}
          icon={<CreditCard className="h-5 w-5" />}
          color="purple"
          index={1}
        />
        <KPICard
          title={t("dashboard.kpi.mrr")}
          value={stats?.mrr ?? 0}
          change={stats?.mrrChange}
          isCurrency
          icon={<DollarSign className="h-5 w-5" />}
          color="emerald"
          index={2}
        />
        <KPICard
          title={t("dashboard.kpi.churnRate")}
          value={stats?.churnRate ?? 0}
          change={stats?.churnRateChange}
          isPercent
          icon={<TrendingDown className="h-5 w-5" />}
          color="amber"
          index={3}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={t("dashboard.charts.userSignups")} loading={statsLoading} delay={0.2}>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={stats?.signupsTrend ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#64748B", fontSize: 12 }}
                tickFormatter={(v) => new Date(v).getDate().toString()}
                stroke="rgba(255,255,255,0.1)"
              />
              <YAxis tick={{ fill: "#64748B", fontSize: 12 }} stroke="rgba(255,255,255,0.1)" />
              <Tooltip
                contentStyle={{
                  background: "#14141E",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#E2E8F0",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#00E5FF"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, fill: "#00E5FF" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t("dashboard.charts.revenueTrend")} loading={statsLoading} delay={0.3}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={stats?.revenueTrend ?? []}>
              <defs>
                <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#B026FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#B026FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#64748B", fontSize: 12 }}
                tickFormatter={(v) => {
                  const [year, month] = v.split("-");
                  return `${month}/${year.slice(2)}`;
                }}
                stroke="rgba(255,255,255,0.1)"
              />
              <YAxis
                tick={{ fill: "#64748B", fontSize: 12 }}
                stroke="rgba(255,255,255,0.1)"
                tickFormatter={(v) => `$${v / 1000}k`}
              />
              <Tooltip
                contentStyle={{
                  background: "#14141E",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#E2E8F0",
                }}
                formatter={(value) => typeof value === "number" ? formatCurrency(value) : value}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#B026FF"
                strokeWidth={2}
                fill="url(#revGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title={t("dashboard.charts.planDistribution")} loading={statsLoading} delay={0.4}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats?.planDistribution ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: "#64748B", fontSize: 12 }} stroke="rgba(255,255,255,0.1)" />
              <YAxis tick={{ fill: "#64748B", fontSize: 12 }} stroke="rgba(255,255,255,0.1)" />
              <Tooltip
                contentStyle={{
                  background: "#14141E",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#E2E8F0",
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {(stats?.planDistribution ?? []).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t("dashboard.charts.userStatus")} loading={statsLoading} delay={0.5}>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={stats?.userStatusDistribution ?? []}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {(stats?.userStatusDistribution ?? []).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#14141E",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#E2E8F0",
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                formatter={(value) => (
                  <span style={{ color: "#94A3B8" }}>{String(value)}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t("dashboard.charts.recentActivity")} loading={activityLoading} delay={0.6}>
          <div className="h-[240px] overflow-y-auto pr-2">
            <ActivityFeed items={activity ?? []} loading={activityLoading} />
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
