"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Cell,
} from "recharts";
import { Activity, Trophy } from "lucide-react";
import { ChartCard } from "@/components/dashboard/chart-card";
import { Badge } from "@/components/ui/badge";
import { fetchBehavior } from "@/lib/api/client";
import { useTranslation, useFormatters, useMockLabels } from "@/lib/i18n";

const COLORS = ["#00E5FF", "#B026FF", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6"];

function getHeatmapColor(value: number): string {
  if (value < 20) return "rgba(0, 229, 255, 0.05)";
  if (value < 40) return "rgba(0, 229, 255, 0.15)";
  if (value < 60) return "rgba(0, 229, 255, 0.3)";
  if (value < 80) return "rgba(0, 229, 255, 0.5)";
  return "rgba(0, 229, 255, 0.75)";
}

export default function BehaviorPage() {
  const { t } = useTranslation();
  const { formatNumber } = useFormatters();
  const labels = useMockLabels();

  const { data, isLoading } = useQuery({
    queryKey: ["behavior"],
    queryFn: fetchBehavior,
  });

  const combinedActivity = useMemo(() => {
    if (!data) return [];
    return data.dau.map((d, i) => ({
      date: d.date,
      dau: d.value,
      wau: data.wau[i]?.value ?? 0,
    }));
  }, [data]);

  const heatmapData = useMemo(() => {
    if (!data) return [];
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return days.map((day) => {
      const row: Record<string, number | string> = { day };
      for (let h = 0; h < 24; h += 3) {
        const avg =
          data.engagementHeatmap
            .filter((c) => c.day === day && c.hour >= h && c.hour < h + 3)
            .reduce((sum, c) => sum + c.value, 0) / 3;
        row[`h${h}`] = Math.round(avg);
      }
      return row;
    });
  }, [data]);

  const hours = Array.from({ length: 8 }, (_, i) => i * 3);

  const featureUsageWithLabels = useMemo(() => {
    return (data?.featureUsage ?? []).map((item) => ({
      ...item,
      feature: labels.feature(item.feature),
    }));
  }, [data, labels]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          {t("behavior.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("behavior.subtitle")}
        </p>
      </div>

      {/* DAU / WAU */}
      <ChartCard title={t("behavior.charts.dauWau")} loading={isLoading}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={combinedActivity}>
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
              dataKey="dau"
              name={t("behavior.charts.dau")}
              stroke="#00E5FF"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="wau"
              name={t("behavior.charts.wau")}
              stroke="#B026FF"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Feature Usage */}
      <ChartCard title={t("behavior.charts.featureUsage")} loading={isLoading} delay={0.1}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={featureUsageWithLabels}
            layout="vertical"
            margin={{ left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis type="number" tick={{ fill: "#64748B", fontSize: 12 }} stroke="rgba(255,255,255,0.1)" />
            <YAxis
              type="category"
              dataKey="feature"
              tick={{ fill: "#64748B", fontSize: 12 }}
              stroke="rgba(255,255,255,0.1)"
              width={100}
            />
            <Tooltip
              contentStyle={{
                background: "#14141E",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "#E2E8F0",
              }}
            />
            <Bar dataKey="count" radius={[0, 6, 6, 0]}>
              {(featureUsageWithLabels ?? []).map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Engagement Heatmap */}
      <ChartCard title={t("behavior.charts.heatmap")} loading={isLoading} delay={0.2}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left text-muted-foreground">{t("behavior.heatmap.day")}</th>
                {hours.map((h) => (
                  <th key={h} className="px-2 py-1 text-center text-muted-foreground">
                    {h}{t("behavior.heatmap.hourSuffix")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmapData.map((row, i) => (
                <tr key={i}>
                  <td className="px-2 py-1.5 font-medium text-foreground">{labels.dayShort(String(row.day))}</td>
                  {hours.map((h) => {
                    const val = row[`h${h}`] as number;
                    return (
                      <td key={h} className="px-1 py-1">
                        <div
                          className="h-8 w-full rounded flex items-center justify-center text-[10px] font-medium text-white/80"
                          style={{ backgroundColor: getHeatmapColor(val) }}
                          title={`${labels.dayShort(String(row.day))} ${h}${t("behavior.heatmap.hourSuffix")} - ${val} ${t("behavior.heatmap.engagements")}`}
                        >
                          {val}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* Top Users */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-amber-400" />
          <h3 className="text-base font-medium text-foreground">{t("behavior.topUsers")}</h3>
        </div>
        <div className="space-y-2">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
              ))
            : (data?.topUsers ?? []).map((user, index) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg bg-white/[0.02] px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-xs font-bold text-muted-foreground">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <p className="font-medium text-foreground">{formatNumber(user.sessions)}</p>
                      <p className="text-xs text-muted-foreground">{t("behavior.metrics.sessions")}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">{formatNumber(user.actions)}</p>
                      <p className="text-xs text-muted-foreground">{t("behavior.metrics.actions")}</p>
                    </div>
                  </div>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}
