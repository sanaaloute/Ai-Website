"use client";

import { motion } from "framer-motion";
import { UserPlus, CreditCard, AlertTriangle, Settings, RefreshCcw } from "lucide-react";
import { ActivityLog } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormatters, useMockLabels } from "@/lib/i18n";

const iconMap: Record<string, React.ReactNode> = {
  "suspended user": <AlertTriangle className="h-4 w-4 text-amber-400" />,
  "activated user": <RefreshCcw className="h-4 w-4 text-emerald-400" />,
  "deleted user": <AlertTriangle className="h-4 w-4 text-red-400" />,
  "canceled subscription": <CreditCard className="h-4 w-4 text-red-400" />,
  "updated plan": <Settings className="h-4 w-4 text-cyan" />,
  "refunded payment": <CreditCard className="h-4 w-4 text-purple" />,
  "exported report": <Settings className="h-4 w-4 text-muted-foreground" />,
};

interface ActivityFeedProps {
  items: ActivityLog[];
  loading?: boolean;
}

export function ActivityFeed({ items, loading }: ActivityFeedProps) {
  const { formatRelativeTime } = useFormatters();
  const labels = useMockLabels();

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5">
            {iconMap[item.action] ?? <UserPlus className="h-4 w-4 text-cyan" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground truncate">
              <span className="font-medium">{item.admin}</span>{" "}
              <span className="text-muted-foreground">{labels.adminAction(item.action)}</span>{" "}
              <span className="font-medium">{item.target}</span>
            </p>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatRelativeTime(item.timestamp)}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
