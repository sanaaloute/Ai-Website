"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { CreditCard, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/dashboard/data-table";
import { ChartCard } from "@/components/dashboard/chart-card";
import { CancelSubscriptionModal } from "@/components/dashboard/cancel-subscription-modal";
import { fetchSubscriptions, cancelSubscription, fetchStats } from "@/lib/api/client";
import { Subscription } from "@/lib/types";
import { useToastStore } from "@/store/ui-store";
import { useTranslation, useFormatters, useMockLabels } from "@/lib/i18n";

const COLORS = ["#00E5FF", "#B026FF", "#10B981"];

export default function SubscriptionsPage() {
  const { t } = useTranslation();
  const { formatDate, formatCurrency } = useFormatters();
  const labels = useMockLabels();
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["subscriptions", page, pageSize, planFilter, statusFilter],
    queryFn: () => fetchSubscriptions(page + 1, pageSize, planFilter, statusFilter),
  });

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      cancelSubscription(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      addToast({ title: t("subscriptions.toast.canceled"), variant: "success" });
      setCancelOpen(false);
      setCancelId(null);
    },
    onError: () => {
      addToast({ title: t("subscriptions.toast.cancelFailed"), variant: "error" });
    },
  });

  const columns: ColumnDef<Subscription>[] = useMemo(
    () => [
      {
        accessorKey: "userName",
        header: t("subscriptions.columns.user"),
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-foreground">{row.original.userName}</p>
            <p className="text-xs text-muted-foreground">{row.original.userEmail}</p>
          </div>
        ),
      },
      {
        accessorKey: "plan",
        header: t("subscriptions.columns.plan"),
        cell: ({ row }) => <Badge variant="default">{labels.plan(row.original.plan)}</Badge>,
      },
      { accessorKey: "startDate", header: t("subscriptions.columns.startDate"), cell: ({ row }) => formatDate(row.original.startDate) },
      { accessorKey: "renewalDate", header: t("subscriptions.columns.renewalDate"), cell: ({ row }) => formatDate(row.original.renewalDate) },
      {
        accessorKey: "paymentMethod",
        header: t("subscriptions.columns.paymentMethod"),
        cell: ({ row }) => labels.paymentMethod(row.original.paymentMethod),
      },
      {
        accessorKey: "status",
        header: t("subscriptions.columns.status"),
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.status === "Active"
                ? "success"
                : row.original.status === "Past Due"
                ? "warning"
                : "destructive"
            }
          >
            {labels.subscriptionStatus(row.original.status)}
          </Badge>
        ),
      },
      {
        accessorKey: "amount",
        header: t("subscriptions.columns.amount"),
        cell: ({ row }) => formatCurrency(row.original.amount),
      },
      {
        id: "actions",
        header: t("subscriptions.columns.actions"),
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            {row.original.status === "Active" && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("subscriptions.aria.cancel")}
                onClick={() => {
                  setCancelId(row.original.id);
                  setCancelOpen(true);
                }}
              >
                <XCircle className="h-4 w-4 text-red-400" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [t, labels, formatDate, formatCurrency]
  );

  const pageCount = data ? Math.ceil(data.total / pageSize) : 1;

  const revenueByPlan = useMemo(() => {
    const map: Record<string, number> = {};
    (data?.data ?? []).forEach((s) => {
      map[s.plan] = (map[s.plan] || 0) + s.amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          {t("subscriptions.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("subscriptions.subtitle")}
        </p>
      </div>

      {/* Summary Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={t("subscriptions.charts.monthlyActive")} loading={!stats}>
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
                {(stats?.planDistribution ?? []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t("subscriptions.charts.revenueByPlan")} loading={!data}>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={revenueByPlan}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {revenueByPlan.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#14141E",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#E2E8F0",
                }}
                formatter={(value) => typeof value === "number" ? formatCurrency(value) : value}
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
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={planFilter || "ALL"}
          onValueChange={(v) => {
            setPlanFilter(v === "ALL" ? "" : v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("subscriptions.filters.allPlans")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("subscriptions.filters.allPlans")}</SelectItem>
            <SelectItem value="Basic">{t("subscriptions.filters.plan.basic")}</SelectItem>
            <SelectItem value="Pro">{t("subscriptions.filters.plan.pro")}</SelectItem>
            <SelectItem value="Enterprise">{t("subscriptions.filters.plan.enterprise")}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={statusFilter || "ALL"}
          onValueChange={(v) => {
            setStatusFilter(v === "ALL" ? "" : v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("subscriptions.filters.allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("subscriptions.filters.allStatuses")}</SelectItem>
            <SelectItem value="Active">{t("subscriptions.filters.status.active")}</SelectItem>
            <SelectItem value="Canceled">{t("subscriptions.filters.status.canceled")}</SelectItem>
            <SelectItem value="Past Due">{t("subscriptions.filters.status.pastDue")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        pageCount={pageCount}
        pageIndex={page}
        pageSize={pageSize}
        onPageChange={setPage}
        totalRows={data?.total}
      />

      <CancelSubscriptionModal
        subscriptionId={cancelId}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onConfirm={(id, reason) => cancelMutation.mutate({ id, reason })}
        loading={cancelMutation.isPending}
      />
    </div>
  );
}
