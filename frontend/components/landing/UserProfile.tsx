"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Loader2, LogOut, LogIn } from "lucide-react";
import { signOut } from "@/lib/auth/backendAuth";
import { saveProfile, loadProfile, getBillingPortal } from "@/lib/api/client";
import { PROFILE_PHONE_REGEX } from "@/lib/profile/phone";
import {
  formatAvatarStorageError,
  type ProfilePayload,
  type SubscriptionPayload
} from "./UserProfile.types";
import AccountSection from "./AccountSection";
import ProviderKeysSection from "./ProviderKeysSection";
import SubscriptionSection from "./SubscriptionSection";
import { useLandingAuthStore } from "@/stores/landingAuthStore";

export default function UserProfile() {
  const router = useRouter();
  const t = useTranslations("loginRequired");
  const isAuthenticated = useLandingAuthStore((s) => s.isAuthenticated);
  const authChecked = useLandingAuthStore((s) => s.authChecked);
  const openLoginDialog = useLandingAuthStore((s) => s.openLoginDialog);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionPayload | null>(
    null
  );

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  /** Bust browser cache when the image URL is unchanged but file replaced. */
  const [avatarRevision, setAvatarRevision] = useState(0);

  /** Persists via `PATCH /api/profile` so the browser never blocks on `auth.updateUser()` (known to hang with some setups). */
  const saveProfileFields = async (fields: {
    full_name?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
  }) => {
    const result = await saveProfile(fields);
    if (!result.ok) {
      return { error: result.error ?? "Could not save profile." as const };
    }
    return { error: null as null };
  };

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    setError(null);
    if (!silent) {
      setLoading(true);
    }
    try {
      const result = await loadProfile();
      if (!result.ok) {
        setError(result.error ?? "Could not load profile.");
        return;
      }
      const data = result.data as {
        error?: string;
        profile?: ProfilePayload;
        subscription?: SubscriptionPayload | null;
      };
      if (!data.profile) {
        setError("Invalid profile response.");
        return;
      }
      setProfile(data.profile);
      setFullName(data.profile.full_name ?? "");
      setPhone(data.profile.phone ?? "");
      setAvatarUrl(data.profile.avatar_url ?? "");
      setSubscription(data.subscription ?? null);
    } catch {
      setError("Network error loading profile.");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    if (phone.trim() && !PROFILE_PHONE_REGEX.test(phone.trim())) {
      setError(
        "Phone must match international format, e.g. +1 555 123 4567 (spaces optional in the number part)."
      );
      return;
    }
    setSaving(true);
    try {
      const full_name = fullName.trim() === "" ? null : fullName.trim();
      const phoneVal = phone.trim() === "" ? null : phone.trim();
      const avatar_url = avatarUrl.trim() === "" ? null : avatarUrl.trim();

      const result = await saveProfileFields({
        full_name,
        phone: phoneVal,
        avatar_url
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
      setAvatarRevision((n) => n + 1);
      void load({ silent: true });
    } catch {
      setError("Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) {
      setError("Choose an image file (JPEG, PNG, WebP, or GIF).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be 2 MB or smaller.");
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const result = await saveProfileFields({ avatar_url: dataUrl });
      if (result.error) {
        setError(result.error);
        return;
      }
      setAvatarUrl(dataUrl);
      setSaved(true);
      setAvatarRevision((n) => n + 1);
      void load({ silent: true });
    } catch {
      setError("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    setError(null);
    setSaved(false);
    setUploading(true);
    try {
      setAvatarUrl("");
      const result = await saveProfileFields({ avatar_url: null });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
      setAvatarRevision((n) => n + 1);
      void load({ silent: true });
    } catch {
      setError("Could not remove photo.");
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      router.push("/login");
    } catch {
      setError("Could not sign out.");
    } finally {
      setLoggingOut(false);
    }
  };

  const openBillingPortal = async () => {
    setPortalLoading(true);
    setError(null);
    try {
      const result = await getBillingPortal({ returnUrl: window.location.href });
      if (!result.ok) {
        setError(result.error ?? "Could not open billing portal.");
        return;
      }
      const data = result.data;
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Could not open billing portal.");
    } finally {
      setPortalLoading(false);
    }
  };

  if (!authChecked || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-zinc-400">
        <Loader2 className="h-5 w-5 animate-spin text-glow-cyan" />
        Loading profile…
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
          <LogIn size={28} className="text-zinc-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">{t("title")}</h2>
          <p className="mt-1 max-w-xs text-sm text-zinc-400">
            {t("description")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => openLoginDialog()}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-zinc-100 transition hover:border-glow-cyan/45 hover:bg-white/10"
        >
          <LogIn size={16} />
          {t("loginButton")}
        </button>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-500/30 bg-red-950/40 px-4 py-6 text-center text-sm text-red-200">
        <p>{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-zinc-200 transition hover:border-white/30 hover:text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-4 md:px-0">
      {error && (
        <p
          className="mb-4 rounded-xl border border-red-500/35 bg-red-950/50 px-3 py-2 text-center text-xs text-red-100"
          role="alert"
        >
          {error}
        </p>
      )}
      {saved && (
        <p className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-3 py-2 text-center text-xs text-emerald-100">
          Saved.
        </p>
      )}

      <div className="space-y-8">
        <AccountSection
          profile={profile}
          fullName={fullName}
          setFullName={setFullName}
          phone={phone}
          setPhone={setPhone}
          avatarUrl={avatarUrl}
          avatarRevision={avatarRevision}
          uploading={uploading}
          saving={saving}
          onAvatarPick={handleAvatarPick}
          onRemovePhoto={handleRemovePhoto}
          onSave={handleSave}
        />

        <SubscriptionSection
          subscription={subscription}
          profile={profile}
          portalLoading={portalLoading}
          onOpenBillingPortal={openBillingPortal}
        />

        <ProviderKeysSection />

        <div className="mt-10 border-t border-white/10 pt-8">
          <button
            type="button"
            disabled={loggingOut}
            onClick={() => void handleLogout()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-red-950/40 transition hover:bg-red-700 disabled:opacity-60"
          >
            {loggingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut size={18} aria-hidden />
            )}
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
