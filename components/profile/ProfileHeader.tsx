import Link from "next/link";
import { ArrowLeft, Link as LinkIcon, Calendar } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { FollowButton } from "@/components/profile/FollowButton";
import { CallButton } from "@/components/profile/CallButton";
import type { Profile } from "@/types/database.types";

export function ProfileHeader({
  profile,
  followersCount,
  followingCount,
  postsCount,
  isFollowing,
  isMe
}: {
  profile: Profile;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing: boolean;
  isMe: boolean;
}) {
  return (
    <div>
      <header className="sticky top-0 z-10 flex items-center gap-4 border-b bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <Link href="/feed" className="rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-lg font-bold leading-tight">{profile.display_name || profile.username}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{postsCount} posts</p>
        </div>
      </header>

      <div className="h-32 bg-gradient-to-r from-brand-100 to-brand-300/40 dark:from-brand-950 dark:to-slate-900">
        {profile.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.cover_url} alt="" className="h-full w-full object-cover" />
        )}
      </div>

      <div className="px-4 pb-4">
        <div className="-mt-10 flex items-end justify-between">
          <Avatar
            src={profile.avatar_url}
            name={profile.display_name || profile.username}
            size={88}
            className="border-4 border-white dark:border-slate-950"
          />
          {isMe ? (
            <Link
              href="/settings"
              className="rounded-full border px-4 py-1.5 text-sm font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Edit profile
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <CallButton calleeId={profile.id} />
              <FollowButton profileId={profile.id} initialIsFollowing={isFollowing} />
            </div>
          )}
        </div>

        <div className="mt-3">
          <h2 className="text-xl font-bold">{profile.display_name || profile.username}</h2>
          <p className="text-slate-500 dark:text-slate-400">@{profile.username}</p>
        </div>

        {profile.bio && <p className="mt-3 whitespace-pre-wrap text-[15px]">{profile.bio}</p>}

        <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-1 text-brand-600 hover:underline"
            >
              <LinkIcon size={14} />
              {profile.website.replace(/^https?:\/\//, "")}
            </a>
          )}
          <span className="flex items-center gap-1">
            <Calendar size={14} />
            Joined {new Date(profile.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </span>
        </div>

        <div className="mt-3 flex gap-4 text-sm">
          <span>
            <strong>{followingCount}</strong> <span className="text-slate-500 dark:text-slate-400">Following</span>
          </span>
          <span>
            <strong>{followersCount}</strong> <span className="text-slate-500 dark:text-slate-400">Followers</span>
          </span>
        </div>
      </div>
    </div>
  );
}
