"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Server,
  AlertCircle,
} from "lucide-react";
import { KPICard } from "@/components/dashboard/kpi-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { DataTable } from "@/components/dashboard/data-table";
import {
  fetchGenerations,
  fetchGenerationMetrics,
  fetchQueueMetrics,
  fetchSandboxInventory,
} from "@/lib/api/client";
import { useTranslation } from "@/lib/i18n";
import type { Generation } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  completed: "#10B981",
  failed: "#EF4444",
  started: "#F59E0B",
};

export default function GenerationsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const { data: generations, isLoading: generationsLoading } = useQuery({
    queryKey: ["generations", page, statusFilter],
    queryFn: () => fetchGenerations(page, 20, statusFilter),
  });

  const { data: metrics } = useQuery({
    queryKey: ["generation-metrics"],
    queryFn: fetchGenerationMetrics,
  });

  const { data: queue } = useQuery({
    queryKey: ["queue-metrics"],
    queryFn: fetchQueueMetrics,
    refetchInterval: 5000,
  });

  const { data: sandboxes } = useQuery({
    queryKey: ["sandbox-inventory"],
    queryFn: fetchSandboxInventory,
    refetchInterval: 10000,
  });

  const generationColumns = useMemo<ColumnDef<Generation>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ getValue }) => new Date(getValue<string>()).toLocaleString(),
      },
      {
        accessorKey: "userId",
        header: "User",
        cell: ({ getValue }) => {
          const v = getValue<string>();
          return `${v.slice(0, 8)}...`;
        },
      },
      { accessorKey: "workflow", header: "Workflow" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const v = getValue<string>();
          const color = STATUS_COLORS[v] ?? "#94A3B8";
          return (
            <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color }}>
              {v === "completed" ? <CheckCircle2 className="h-3.5 w-3.5" /> : v === "failed" ? <XCircle className="h-3.5 w-3.5" /> : <Activity className="h-3.5 w-3.5" />}
              {v}
            </span>
          );
        },
      },
      {
        id: "duration",
        header: "Duration",
        cell: ({ row }) => {
          const started = row.original.startedAt;
          const completed = row.original.completedAt;
          if (!started || !completed) return "—";
          const seconds = Math.round((new Date(completed).getTime() - new Date(started).getTime()) / 1000);
          return seconds > 0 ? `${seconds}s` : "—";
        },
      },
      {
        accessorKey: "error",
        header: "Error",
        cell: ({ getValue }) => {
          const v = getValue<string | null>();
          return v ? <span className="text-red-400 truncate max-w-[200px] block" title={v}>{v}</span> : "—";
        },
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Generations
        </h1>
        <p className="text-sm text-muted-foreground">
          Monitor active generations, queue depth, and sandbox inventory.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="30-day generations"
          value={metrics?.total ?? 0}
          icon={<Activity className="h-5 w-5" />}
          color="cyan"
        />
        <KPICard
          title="Completed"
          value={metrics?.completed ?? 0}
          icon={<CheckCircle2 className="h-5 w-5" />}
          color="emerald"
        />
        <KPICard
          title="Failed"
          value={metrics?.failed ?? 0}
          icon={<XCircle className="h-5 w-5" />}
          color="amber"
        />
        <KPICard
          title="Avg duration"
          value={metrics?.avgDurationSeconds ?? 0}
          icon={<Clock className="h-5 w-5" />}
          color="purple"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Daily generation trend">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={metrics?.dailyTrend ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} />
              <YAxis stroke="#94A3B8" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0F172A", borderColor: "#334155" }}
                labelStyle={{ color: "#E2E8F0" }}
              />
              <Legend />
              <Line type="monotone" dataKey="total" name="Total" stroke="#00E5FF" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="completed" name="Completed" stroke="#10B981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="failed" name="Failed" stroke="#EF4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Queue state">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={[
                { name: "Waiting", value: queue?.counts.waiting ?? 0 },
                { name: "Active", value: queue?.counts.active ?? 0 },
                { name: "Completed", value: queue?.counts.completed ?? 0 },
                { name: "Failed", value: queue?.counts.failed ?? 0 },
                { name: "Delayed", value: queue?.counts.delayed ?? 0 },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} />
              <YAxis stroke="#94A3B8" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0F172A", borderColor: "#334155" }}
                labelStyle={{ color: "#E2E8F0" }}
              />
              <Bar dataKey="value" fill="#00E5FF" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title={`Sandboxes (${sandboxes?.healthy ?? 0}/${sandboxes?.total ?? 0} healthy)`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase text-muted-foreground border-b border-white/5">
              <tr>
                <th className="py-2 pr-4">Sandbox ID</th>
                <th className="py-2 pr-4">Created</th>
                <th className="py-2 pr-4">Expires in</th>
                <th className="py-2 pr-4">Renewing</th>
                <th className="py-2">Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sandboxes?.items.length ? (
                sandboxes.items.map((s) => (
                  <tr key={s.sandboxId}>
                    <td className="py-2 pr-4 font-mono text-xs">{s.sandboxId}</td>
                    <td className="py-2 pr-4">{new Date(s.createdAt).toLocaleString()}</td>
                    <td className="py-2 pr-4">{s.expiresInMinutes}m</td>
                    <td className="py-2 pr-4">{s.renewing ? "Yes" : "No"}</td>
                    <td className="py-2">
                      {s.healthy ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /> Healthy</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-400"><AlertCircle className="h-3.5 w-3.5" /> Unhealthy</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-4 text-muted-foreground">No sandboxes found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground">Filter by status:</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-md border border-white/10 bg-background px-3 py-1.5 text-sm text-white"
          >
            <option value="">All</option>
            <option value="started">Started</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <DataTable
          columns={generationColumns}
          data={generations?.data ?? []}
          loading={generationsLoading}
          pageIndex={page - 1}
          pageSize={20}
          pageCount={generations ? Math.ceil(generations.total / generations.limit) : 1}
          totalRows={generations?.total}
          onPageChange={(idx) => setPage(idx + 1)}
        />
      </div>
    </div>
  );
}
