"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Phone,
  Building2,
  MapPin,
  Briefcase,
  Calendar,
  Activity,
  Globe,
  MousePointer,
  FolderOpen,
  Star,
  GitFork,
  Rocket,
  Clock,
  CreditCard,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserDetail } from "@/lib/types";
import { useTranslation, useFormatters, useMockLabels } from "@/lib/i18n";

interface UserDetailModalProps {
  user: UserDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
}

const tabVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

export function UserDetailModal({ user, open, onOpenChange, loading }: UserDetailModalProps) {
  const { t } = useTranslation();
  const { formatDate, formatNumber } = useFormatters();
  const labels = useMockLabels();
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v) setActiveTab("profile");
      onOpenChange(v);
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{t("userDetail.title")}</DialogTitle>
        </DialogHeader>
        {loading || !user ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-0"
          >
            {/* Header Card */}
            <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-br from-cyan/10 via-purple/5 to-transparent p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-18 w-18 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan/30 to-purple/30 text-2xl font-bold text-white shadow-glow-cyan shrink-0 h-16 w-16">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <h3 className="text-xl font-semibold text-white">{user.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Badge
                      variant={
                        user.status === "Active"
                          ? "success"
                          : user.status === "Suspended"
                          ? "destructive"
                          : "warning"
                      }
                    >
                      {labels.userStatus(user.status)}
                    </Badge>
                    <Badge variant="default">{labels.plan(user.plan)}</Badge>
                    {user.role && (
                      <Badge variant="outline" className="text-xs">
                        {labels.role(user.role)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {user.bio && (
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                  {user.bio}
                </p>
              )}
            </div>

            <div className="px-6 pb-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full grid grid-cols-4 mt-2">
                  <TabsTrigger value="profile">{t("userDetail.tabs.profile")}</TabsTrigger>
                  <TabsTrigger value="projects">
                    {t("userDetail.tabs.projects")} ({user.projects.length})
                  </TabsTrigger>
                  <TabsTrigger value="subscriptions">
                    {t("userDetail.tabs.subscriptions")}
                  </TabsTrigger>
                  <TabsTrigger value="activity">{t("userDetail.tabs.activity")}</TabsTrigger>
                </TabsList>

                  <TabsContent value="profile" className="mt-4 space-y-4">
                    <motion.div
                      variants={tabVariants}
                      initial="hidden"
                      animate="visible"
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <InfoItem icon={<Mail className="h-4 w-4 text-cyan" />} label={t("userDetail.labels.email")} value={user.email} />
                        {user.phone && (
                          <InfoItem icon={<Phone className="h-4 w-4 text-purple" />} label={t("userDetail.labels.phone")} value={user.phone} />
                        )}
                        {user.company && (
                          <InfoItem icon={<Building2 className="h-4 w-4 text-emerald-400" />} label={t("userDetail.labels.company")} value={user.company} />
                        )}
                        {user.location && (
                          <InfoItem icon={<MapPin className="h-4 w-4 text-amber-400" />} label={t("userDetail.labels.location")} value={user.location} />
                        )}
                        <InfoItem icon={<Briefcase className="h-4 w-4 text-cyan" />} label={t("userDetail.labels.role")} value={user.role ?? t("userDetail.noRole")} />
                        <InfoItem icon={<Calendar className="h-4 w-4 text-purple" />} label={t("userDetail.labels.joined")} value={formatDate(user.joinDate)} />
                      </div>

                      <Separator />

                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">
                          {t("userDetail.behaviorOverview")}
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <StatCard
                            icon={<Activity className="h-4 w-4 text-cyan" />}
                            label={t("userDetail.stats.logins")}
                            value={formatNumber(user.behaviorStats.loginFrequency)}
                          />
                          <StatCard
                            icon={<MousePointer className="h-4 w-4 text-purple" />}
                            label={t("userDetail.stats.appUsage")}
                            value={formatNumber(user.behaviorStats.appUsageCount)}
                          />
                          <StatCard
                            icon={<Clock className="h-4 w-4 text-emerald-400" />}
                            label={t("userDetail.stats.avgSession")}
                            value={`${user.behaviorStats.avgSessionDuration}m`}
                          />
                          <StatCard
                            icon={<Globe className="h-4 w-4 text-amber-400" />}
                            label={t("userDetail.stats.lastIp")}
                            value={user.behaviorStats.lastLoginIp}
                          />
                        </div>
                      </div>
                    </motion.div>
                  </TabsContent>

                  <TabsContent value="projects" className="mt-4">
                    <motion.div
                      variants={tabVariants}
                      initial="hidden"
                      animate="visible"
                      transition={{ duration: 0.2 }}
                      className="space-y-3"
                    >
                      {user.projects.map((project) => (
                        <div
                          key={project.id}
                          className="flex items-start justify-between rounded-xl bg-white/[0.02] border border-white/5 px-4 py-3 hover:bg-white/5 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <FolderOpen className="h-4 w-4 text-cyan shrink-0" />
                              <p className="text-sm font-medium text-foreground truncate">
                                {project.name}
                              </p>
                              <Badge
                                variant={
                                  project.status === "Published"
                                    ? "success"
                                    : project.status === "Draft"
                                    ? "warning"
                                    : "outline"
                                }
                                className="text-[10px] shrink-0"
                              >
                                {labels.projectStatus(project.status)}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {project.description}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="bg-white/5 rounded px-1.5 py-0.5">{project.framework}</span>
                              <span className="bg-white/5 rounded px-1.5 py-0.5">{project.language}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground shrink-0 ml-3">
                            <div className="flex items-center gap-1">
                              <Rocket className="h-3 w-3" />
                              {project.deployments}
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              {project.stars}
                            </div>
                            <div className="flex items-center gap-1">
                              <GitFork className="h-3 w-3" />
                              {project.forks}
                            </div>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  </TabsContent>

                  <TabsContent value="subscriptions" className="mt-4">
                    <motion.div
                      variants={tabVariants}
                      initial="hidden"
                      animate="visible"
                      transition={{ duration: 0.2 }}
                      className="space-y-3"
                    >
                      {user.subscriptionHistory.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/5 px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5">
                              <CreditCard className="h-4 w-4 text-cyan" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{labels.plan(sub.plan)}{t("userDetail.subscription.planSuffix")}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(sub.startDate)} → {formatDate(sub.endDate)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-foreground">
                              ${sub.amount}
                              <span className="text-xs text-muted-foreground font-normal">{t("userDetail.subscription.perMonth")}</span>
                            </p>
                            <div className="flex items-center gap-1 justify-end mt-0.5">
                              {sub.status === "Active" ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                              ) : sub.status === "Expired" ? (
                                <XCircle className="h-3 w-3 text-muted-foreground" />
                              ) : (
                                <AlertTriangle className="h-3 w-3 text-red-400" />
                              )}
                              <span
                                className={`text-xs ${
                                  sub.status === "Active"
                                    ? "text-emerald-400"
                                    : sub.status === "Expired"
                                    ? "text-muted-foreground"
                                    : "text-red-400"
                                }`}
                              >
                                {labels.subscriptionStatus(sub.status)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  </TabsContent>

                  <TabsContent value="activity" className="mt-4">
                    <motion.div
                      variants={tabVariants}
                      initial="hidden"
                      animate="visible"
                      transition={{ duration: 0.2 }}
                      className="space-y-3"
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <StatCard
                          icon={<Activity className="h-4 w-4 text-cyan" />}
                          label={t("userDetail.activity.totalLogins")}
                          value={formatNumber(user.behaviorStats.loginFrequency)}
                        />
                        <StatCard
                          icon={<Zap className="h-4 w-4 text-purple" />}
                          label={t("userDetail.activity.totalActions")}
                          value={formatNumber(user.behaviorStats.appUsageCount)}
                        />
                        <StatCard
                          icon={<Clock className="h-4 w-4 text-emerald-400" />}
                          label={t("userDetail.activity.avgSession")}
                          value={`${user.behaviorStats.avgSessionDuration}m`}
                        />
                        <StatCard
                          icon={<FolderOpen className="h-4 w-4 text-amber-400" />}
                          label={t("userDetail.activity.projects")}
                          value={String(user.projects.length)}
                        />
                      </div>

                      <Separator />

                      <div className="space-y-1">
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">
                          {t("userDetail.activity.title")}
                        </h4>
                        {user.recentActivity.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-white/[0.02] transition-colors"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5">
                              <Zap className="h-3 w-3 text-cyan" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground">{labels.userAction(item.action)}</p>
                              <p className="text-xs text-muted-foreground truncate">{item.details}</p>
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {formatDate(item.timestamp)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </TabsContent>
              </Tabs>
            </div>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/5 px-4 py-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-white/5 px-3 py-3 text-center">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 mb-1.5">
        {icon}
      </div>
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}
