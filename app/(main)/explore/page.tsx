"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { PostCard } from "@/components/post/PostCard";
import type { Profile, PostWithRelations } from "@/types/database.types";

export default function ExplorePage() {
  return (
    <Suspense fallback={null}>
      <ExploreContent />
    </Suspense>
  );
}

function ExploreContent() {
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [users, setUsers] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<PostWithRelations[]>([]);
  const [hashtags, setHashtags] = useState<{ id: string; tag: string; usage_count: number }[]>([]);
  const [trending, setTrending] = useState<PostWithRelations[]>([]);
  const [loading, setLoading] = useState(false);

  // Default view (no query): trending grid, so Explore isn't a dead page.
  useEffect(() => {
    if (q.trim()) return;
    (async () => {
      const res = await fetch("/api/v1/feed?tab=trending");
      const json = await res.json();
      if (res.ok) setTrending(json.posts);
    })();
  }, [q]);

  useEffect(() => {
    if (!q.trim()) {
      setUsers([]);
      setPosts([]);
      setHashtags([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(`/api/v1/search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      setUsers(json.users ?? []);
      setPosts(json.posts ?? []);
      setHashtags(json.hashtags ?? []);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [q]);

  return (
    <div>
      <header className="sticky top-0 z-10 border-b bg-white/90 p-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 dark:bg-slate-900">
          <Search size={18} className="text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people, posts, or #hashtags"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
      </header>

      {!q.trim() && (
        <div className="masonry-grid p-3">
          {trending.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}

      {loading && <p className="p-4 text-sm text-slate-400">Searching…</p>}

      {!loading && q.trim() && users.length === 0 && posts.length === 0 && hashtags.length === 0 && (
        <p className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No results for &ldquo;{q}&rdquo;.</p>
      )}

      {hashtags.length > 0 && (
        <div className="border-b p-4 dark:border-slate-800">
          <h2 className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">Hashtags</h2>
          {hashtags.map((h) => (
            <div key={h.id} className="py-2 text-sm">
              <span className="font-medium text-brand-600">#{h.tag}</span>{" "}
              <span className="text-slate-400">· {h.usage_count} posts</span>
            </div>
          ))}
        </div>
      )}

      {users.length > 0 && (
        <div className="border-b dark:border-slate-800">
          <h2 className="p-4 pb-0 text-sm font-semibold text-slate-500 dark:text-slate-400">People</h2>
          {users.map((u) => (
            <Link
              key={u.id}
              href={`/${u.username}`}
              className="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-900"
            >
              <Avatar src={u.avatar_url} name={u.display_name || u.username} />
              <div className="min-w-0">
                <p className="truncate font-semibold">{u.display_name || u.username}</p>
                <p className="truncate text-sm text-slate-500 dark:text-slate-400">@{u.username}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {posts.length > 0 && (
        <div className="masonry-grid p-3">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}
