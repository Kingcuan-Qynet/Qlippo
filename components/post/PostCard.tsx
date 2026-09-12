"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Bookmark, Play, Images, FileText } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import type { PostWithRelations } from "@/types/database.types";

export function PostCard({ post }: { post: PostWithRelations }) {
  const [liked, setLiked] = useState(!!post.liked_by_me);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [saved, setSaved] = useState(!!post.saved_by_me);
  const [pending, setPending] = useState(false);

  const cover = post.media[0];

  async function toggleLike(e: React.MouseEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    const res = await fetch(`/api/v1/posts/${post.id}/like`, { method: next ? "POST" : "DELETE" });
    if (!res.ok) {
      setLiked(!next);
      setLikeCount((c) => c - (next ? 1 : -1));
    }
    setPending(false);
  }

  async function toggleSave(e: React.MouseEvent) {
    e.preventDefault();
    const next = !saved;
    setSaved(next);
    const res = await fetch(`/api/v1/posts/${post.id}/save`, { method: next ? "POST" : "DELETE" });
    if (!res.ok) setSaved(!next);
  }

  return (
    <Link href={`/p/${post.id}`} prefetch={false} className="masonry-item block">
      <div className="overflow-hidden rounded-xl2 border transition hover:shadow-md dark:border-slate-800">
        {cover ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover.url}
              alt=""
              loading="lazy"
              decoding="async"
              className="w-full object-cover"
              style={{ aspectRatio: cover.width && cover.height ? `${cover.width}/${cover.height}` : "3/4" }}
            />
            {post.type === "video" && (
              <span className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white">
                <Play size={14} fill="currentColor" />
              </span>
            )}
            {post.type === "carousel" && post.media.length > 1 && (
              <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs text-white">
                <Images size={12} />
                {post.media.length}
              </span>
            )}
            {post.title && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
                <p className="line-clamp-2 text-sm font-semibold text-white">{post.title}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col justify-between bg-slate-50 p-4 dark:bg-slate-900" style={{ minHeight: 160 }}>
            <FileText size={20} className="text-slate-400" />
            {post.title && <p className="line-clamp-2 font-semibold">{post.title}</p>}
          </div>
        )}

        <div className="p-2.5">
          {post.caption && !post.title && (
            <p className="line-clamp-2 text-sm">{post.caption}</p>
          )}

          <div className="mt-2 flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-1.5">
              <Avatar
                src={post.author.avatar_url}
                name={post.author.display_name || post.author.username}
                size={20}
              />
              <span className="truncate text-xs text-slate-600 dark:text-slate-400">
                {post.author.display_name || post.author.username}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={toggleLike}
                className={cn(
                  "flex items-center gap-1 text-xs hover:text-pink-600",
                  liked ? "text-pink-600" : "text-slate-500 dark:text-slate-400"
                )}
              >
                <Heart size={14} fill={liked ? "currentColor" : "none"} />
                {likeCount || ""}
              </button>
              <button
                onClick={toggleSave}
                className={cn(
                  "hover:text-brand-600",
                  saved ? "text-brand-600" : "text-slate-500 dark:text-slate-400"
                )}
              >
                <Bookmark size={14} fill={saved ? "currentColor" : "none"} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
