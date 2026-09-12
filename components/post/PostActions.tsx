"use client";

import { useState } from "react";
import { Heart, Bookmark, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Post } from "@/types/database.types";

export function PostActions({
  postId,
  likeCount,
  likedByMe,
  savedByMe
}: {
  postId: string;
  likeCount: Post["like_count"];
  likedByMe?: boolean;
  savedByMe?: boolean;
}) {
  const [liked, setLiked] = useState(!!likedByMe);
  const [count, setCount] = useState(likeCount);
  const [saved, setSaved] = useState(!!savedByMe);

  async function toggleLike() {
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    const res = await fetch(`/api/v1/posts/${postId}/like`, { method: next ? "POST" : "DELETE" });
    if (!res.ok) {
      setLiked(!next);
      setCount((c) => c - (next ? 1 : -1));
    }
  }

  async function toggleSave() {
    const next = !saved;
    setSaved(next);
    const res = await fetch(`/api/v1/posts/${postId}/save`, { method: next ? "POST" : "DELETE" });
    if (!res.ok) setSaved(!next);
  }

  return (
    <div className="flex items-center gap-4 border-y py-3 dark:border-slate-800">
      <button onClick={toggleLike} className={cn("flex items-center gap-1.5", liked && "text-pink-600")}>
        <Heart size={22} fill={liked ? "currentColor" : "none"} />
        <span className="text-sm">{count}</span>
      </button>
      <button onClick={toggleSave} className={cn("flex items-center gap-1.5", saved && "text-brand-600")}>
        <Bookmark size={20} fill={saved ? "currentColor" : "none"} />
        <span className="text-sm">Save</span>
      </button>
      <button
        onClick={() => navigator.clipboard?.writeText(`${process.env.NEXT_PUBLIC_SITE_URL}/p/${postId}`)}
        className="ml-auto flex items-center gap-1.5 text-slate-500 dark:text-slate-400"
      >
        <Share2 size={18} />
      </button>
    </div>
  );
}
