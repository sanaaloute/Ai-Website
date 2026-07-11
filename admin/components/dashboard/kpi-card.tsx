"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useFormatters } from "@/lib/i18n";
import { useTranslation } from "@/lib/i18n";

interface KPICardProps {
  title: string;
  value: number;
  change?: number;
  prefix?: string;
  suffix?: string;
  isCurrency?: boolean;
  isPercent?: boolean;
  icon: React.ReactNode;
  color: "cyan" | "purple" | "emerald" | "amber";
  index?: number;
}

const colorClasses = {
  cyan: "bg-cyan/10 text-cyan border-cyan/20",
  purple: "bg-purple/10 text-purple border-purple/20",
  emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

function AnimatedNumber({ value, isCurrency, isPercent }: { value: number; isCurrency?: boolean; isPercent?: boolean }) {
  const { formatCurrency, formatNumber, formatPercent } = useFormatters();
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => {
    if (isCurrency) return formatCurrency(Math.round(v));
    if (isPercent) return formatPercent(v);
    return formatNumber(Math.round(v));
  });

  useEffect(() => {
    const controls = animate(motionValue, value, { duration: 1.2, ease: "easeOut" });
    return controls.stop;
  }, [motionValue, value]);

  return <motion.span>{rounded}</motion.span>;
}

export function KPICard({
  title,
  value,
  change,
  isCurrency,
  isPercent,
  icon,
  color,
  index = 0,
}: KPICardProps) {
  const { t } = useTranslation();
  const isPositive = change !== undefined && change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="glass rounded-2xl p-6 hover:border-white/15 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-white tracking-tight">
            <AnimatedNumber value={value} isCurrency={isCurrency} isPercent={isPercent} />
          </p>
          {change !== undefined && (
            <div className="flex items-center gap-1 text-xs">
              {isPositive ? (
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-red-400" />
              )}
              <span className={isPositive ? "text-emerald-400" : "text-red-400"}>
                {isPositive ? "+" : ""}
                {change}%
              </span>
              <span className="text-muted-foreground">{t("dashboard.kpi.vsLastMonth")}</span>
            </div>
          )}
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl border ${colorClasses[color]}`}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  );
}
