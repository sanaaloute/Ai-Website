"use client";

import { useQuery } from "@tanstack/react-query";
import { ScrollText, Shield } from "lucide-react";
import { fetchActivity } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation, useFormatters, useMockLabels } from "@/lib/i18n";

export default function LogsPage() {
  const { t } = useTranslation();
  const { formatDateTime } = useFormatters();
  const labels = useMockLabels();

  const { data, isLoading } = useQuery({
    queryKey: ["activity", 50],
    queryFn: () => fetchActivity(50),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          {t("logs.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("logs.subtitle")}
        </p>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="space-y-0">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-4 border-b border-white/5 last:border-0">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))
            : (data ?? []).map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors px-2 rounded-lg"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 mt-0.5">
                    <Shield className="h-4 w-4 text-cyan" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {log.admin}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {labels.adminAction(log.action)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {t("logs.on")} {log.target}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDateTime(log.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}
