"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Shield, Calendar, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/store/auth-store";
import { useToastStore } from "@/store/ui-store";
import { useTranslation } from "@/lib/i18n";

export default function ProfilePage() {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    role: user?.role ?? t("profile.fallback.role"),
    phone: t("profile.fallback.phone"),
    company: t("profile.fallback.company"),
    location: t("profile.fallback.location"),
    bio: t("profile.fallback.bio"),
  });

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      addToast({ title: t("profile.toast.updated"), variant: "success" });
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">{t("profile.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("profile.subtitle")}
        </p>
      </div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan/30 to-purple/30 text-3xl font-bold text-white shadow-glow-cyan">
            {user?.name
              ? user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
              : t("profile.fallback.initials")}
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-white">{user?.name ?? t("profile.fallback.name")}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              {user?.email ?? t("profile.fallback.email")}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Badge variant="default">
                <Shield className="mr-1 h-3 w-3" />
                {user?.role ?? t("profile.fallback.role")}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Calendar className="mr-1 h-3 w-3" />
                {t("profile.fallback.memberSince")}
              </Badge>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Edit Form */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-2xl p-6 space-y-6"
      >
        <h3 className="text-base font-medium text-foreground">{t("profile.sections.personalInfo")}</h3>
        <Separator />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("profile.fields.fullName")}</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t("profile.fields.email")}</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t("profile.fields.phone")}</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">{t("profile.fields.role")}</Label>
            <Input id="role" value={form.role} disabled className="opacity-60" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">{t("profile.fields.company")}</Label>
            <Input
              id="company"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">{t("profile.fields.location")}</Label>
            <Input
              id="location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">{t("profile.fields.bio")}</Label>
          <textarea
            id="bio"
            rows={3}
            className="flex w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan/40 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? t("profile.saving") : t("profile.saveChanges")}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
