"use client";

import { useRef } from "react";
import { Loader2, UserCircle2 } from "lucide-react";
import type { ProfilePayload } from "./UserProfile.types";

interface AccountSectionProps {
  profile: ProfilePayload;
  fullName: string;
  setFullName: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  avatarUrl: string;
  setAvatarUrl: (value: string) => void;
  avatarRevision: number;
  uploading: boolean;
  saving: boolean;
  onAvatarPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: () => void;
  onSave: () => void;
}

export default function AccountSection({
  profile,
  fullName,
  setFullName,
  phone,
  setPhone,
  avatarUrl,
  setAvatarUrl,
  avatarRevision,
  uploading,
  saving,
  onAvatarPick,
  onRemovePhoto,
  onSave
}: AccountSectionProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <section className="rounded-2xl border border-white/10 bg-background-soft/90 p-5 shadow-[0_0_40px_rgba(15,23,42,0.9)] backdrop-blur-xl">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
        <UserCircle2 size={18} className="text-glow-cyan" />
        Account
      </h2>

      <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <div className="relative">
          <div className="flex h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-background/80">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- user storage URL
              <img
                key={`${avatarUrl}-${avatarRevision}`}
                src={
                  avatarUrl.includes("?")
                    ? `${avatarUrl}&v=${avatarRevision}`
                    : `${avatarUrl}?v=${avatarRevision}`
                }
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-zinc-600">
                <UserCircle2 size={48} strokeWidth={1} />
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={onAvatarPick}
          />
          <div className="mt-3 flex w-full flex-col gap-2">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-lg border border-white/15 bg-background/70 px-3 py-2 text-[11px] font-medium text-zinc-200 transition hover:border-glow-cyan/50 hover:text-white disabled:opacity-50"
            >
              {uploading ? "Working…" : "Change photo"}
            </button>
            {avatarUrl ? (
              <button
                type="button"
                disabled={uploading}
                onClick={() => void onRemovePhoto()}
                className="w-full rounded-lg border border-red-500/35 bg-red-950/30 px-3 py-2 text-[11px] font-medium text-red-200 transition hover:bg-red-950/50 disabled:opacity-50"
              >
                Remove photo
              </button>
            ) : null}
          </div>
        </div>

        <div className="w-full flex-1 space-y-4">
          <div>
            <label
              htmlFor="profile-email"
              className="text-[11px] font-medium uppercase tracking-wide text-zinc-500"
            >
              Email
            </label>
            <input
              id="profile-email"
              type="email"
              readOnly
              value={profile.email}
              className="mt-1 w-full cursor-not-allowed rounded-xl border border-white/10 bg-background/60 px-3 py-2 text-sm text-zinc-300"
            />
          </div>
          <div>
            <label
              htmlFor="profile-name"
              className="text-[11px] font-medium uppercase tracking-wide text-zinc-500"
            >
              Name
            </label>
            <input
              id="profile-name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className="mt-1 w-full rounded-xl border border-white/15 bg-background/70 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-glow-cyan/50 focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="profile-phone"
              className="text-[11px] font-medium uppercase tracking-wide text-zinc-500"
            >
              Phone
            </label>
            <input
              id="profile-phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 123 4567"
              className="mt-1 w-full rounded-xl border border-white/15 bg-background/70 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-glow-cyan/50 focus:outline-none"
            />
            <p className="mt-1 text-[10px] text-zinc-500">
              International format with country code, or leave blank.
            </p>
          </div>
          <div>
            <label
              htmlFor="profile-avatar-url"
              className="text-[11px] font-medium uppercase tracking-wide text-zinc-500"
            >
              Profile photo URL
            </label>
            <input
              id="profile-avatar-url"
              type="url"
              inputMode="url"
              autoComplete="photo"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://… (optional — use if upload is unavailable)"
              className="mt-1 w-full rounded-xl border border-white/15 bg-background/70 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-glow-cyan/50 focus:outline-none"
            />
            <p className="mt-1 text-[10px] text-zinc-500">
              Paste any https image URL, or leave empty and use Change photo
              after the storage bucket exists.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={() => void onSave()}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary via-primary-soft to-primary-accent px-5 py-2 text-xs font-semibold text-white shadow-soft-glow transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save changes"
          )}
        </button>
      </div>
    </section>
  );
}
