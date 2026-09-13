"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { uploadMedia } from "@/lib/uploads";
import type { Profile } from "@/types/database.types";

export function ProfileEditForm({ profile, email }: { profile: Profile; email: string }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [website, setWebsite] = useState(profile.website ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [coverUrl, setCoverUrl] = useState(profile.cover_url);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const uploaded = await uploadMedia(file);
    setAvatarUrl(uploaded.detail_url ?? uploaded.url);
  }

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const uploaded = await uploadMedia(file);
    setCoverUrl(uploaded.detail_url ?? uploaded.url);
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, bio, website, avatar_url: avatarUrl, cover_url: coverUrl })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Saved.");
    router.refresh();
  }

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Cover photo</label>
        <label className="group relative block h-32 w-full cursor-pointer overflow-hidden rounded-xl2 border bg-gradient-to-r from-brand-100 to-brand-300/40 dark:border-slate-700 dark:from-brand-950 dark:to-slate-900">
          {coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/40">
            <span className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
              <Camera size={14} />
              {coverUrl ? "Change cover" : "Add cover photo"}
            </span>
          </div>
          <input type="file" accept="image/*" hidden onChange={handleCoverChange} />
        </label>
      </div>

      <div className="-mt-12 flex items-end gap-4 pl-2">
        <label className="group relative cursor-pointer rounded-full ring-4 ring-white dark:ring-slate-950">
          <Avatar src={avatarUrl} name={displayName || profile.username} size={80} />
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition group-hover:bg-black/40">
            <Camera size={18} className="text-white opacity-0 transition group-hover:opacity-100" />
          </div>
          <input type="file" accept="image/*" hidden onChange={handleAvatarChange} />
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Username</label>
        <input
          disabled
          value={`@${profile.username}`}
          className="mt-1 w-full rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
        <input
          disabled
          value={email}
          className="mt-1 w-full rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Display name</label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={50}
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={160}
          rows={3}
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Website</label>
        <input
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://"
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      {message && <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>}

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}
