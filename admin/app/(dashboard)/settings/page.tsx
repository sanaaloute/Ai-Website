"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, Moon, Globe, Key, Shield, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToastStore } from "@/store/ui-store";
import { useTranslation, LOCALES, LOCALE_LABELS, Locale } from "@/lib/i18n";

export default function SettingsPage() {
  const { t, locale, setLocale } = useTranslation();
  const { addToast } = useToastStore();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    marketingEmails: false,
    darkMode: true,
    language: locale,
    twoFactor: true,
    apiKey: "lc_live_51H8m...9x2L",
  });

  useEffect(() => {
    setSettings((s) => ({ ...s, language: locale }));
  }, [locale]);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      addToast({ title: t("settings.toast.saved"), variant: "success" });
    }, 600);
  };

  const regenerateApiKey = () => {
    setSettings({
      ...settings,
      apiKey: `lc_live_${Math.random().toString(36).substring(2, 14)}...${Math.random().toString(36).substring(2, 6)}`,
    });
    addToast({ title: t("settings.toast.apiKeyRegenerated"), variant: "success" });
  };

  const handleLanguageChange = (value: string) => {
    const next = value as Locale;
    setSettings({ ...settings, language: next });
    setLocale(next);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">{t("settings.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("settings.subtitle")}
        </p>
      </div>

      {/* Notifications */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 space-y-6"
      >
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-cyan" />
          <h3 className="text-base font-medium text-foreground">{t("settings.sections.notifications")}</h3>
        </div>
        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">{t("settings.notifications.email.label")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("settings.notifications.email.description")}
              </p>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(v) => setSettings({ ...settings, emailNotifications: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">{t("settings.notifications.push.label")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("settings.notifications.push.description")}
              </p>
            </div>
            <Switch
              checked={settings.pushNotifications}
              onCheckedChange={(v) => setSettings({ ...settings, pushNotifications: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">{t("settings.notifications.marketing.label")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("settings.notifications.marketing.description")}
              </p>
            </div>
            <Switch
              checked={settings.marketingEmails}
              onCheckedChange={(v) => setSettings({ ...settings, marketingEmails: v })}
            />
          </div>
        </div>
      </motion.div>

      {/* Appearance */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-2xl p-6 space-y-6"
      >
        <div className="flex items-center gap-2">
          <Moon className="h-5 w-5 text-purple" />
          <h3 className="text-base font-medium text-foreground">{t("settings.sections.appearance")}</h3>
        </div>
        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">{t("settings.appearance.darkMode.label")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("settings.appearance.darkMode.description")}
              </p>
            </div>
            <Switch
              checked={settings.darkMode}
              onCheckedChange={(v) => setSettings({ ...settings, darkMode: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">{t("settings.appearance.language.label")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("settings.appearance.language.description")}
              </p>
            </div>
            <Select
              value={settings.language}
              onValueChange={handleLanguageChange}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCALES.map((code) => (
                  <SelectItem key={code} value={code}>
                    {LOCALE_LABELS[code]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.div>

      {/* Security */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-2xl p-6 space-y-6"
      >
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-emerald-400" />
          <h3 className="text-base font-medium text-foreground">{t("settings.sections.security")}</h3>
        </div>
        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">{t("settings.security.twoFactor.label")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("settings.security.twoFactor.description")}
              </p>
            </div>
            <Switch
              checked={settings.twoFactor}
              onCheckedChange={(v) => setSettings({ ...settings, twoFactor: v })}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              {t("settings.security.apiKey.label")}
            </Label>
            <div className="flex gap-2">
              <Input
                value={settings.apiKey}
                readOnly
                className="font-mono text-xs"
              />
              <Button variant="outline" onClick={regenerateApiKey}>
                {t("settings.security.apiKey.regenerate")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("settings.security.apiKey.helper")}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? t("settings.saving") : t("settings.saveSettings")}
        </Button>
      </div>
    </div>
  );
}
