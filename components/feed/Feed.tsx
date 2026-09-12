"use client";

import { useEffect, useState } from "react";
import { PostCard } from "@/components/post/PostCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { Category, PostWithRelations } from "@/types/database.types";

type Tab = "for_you" | "following" | "trending";

const TABS: [Tab, string][] = [
  ["for_you", "For You"],
  ["following", "Following"],
  ["trending", "Trending"]
];

export function Feed({
  initialPosts,
  initialCursor,
  categories
}: {
  initialPosts: PostWithRelations[];
  initialCursor: string | null;
  categories: Category[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("for_you");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);

  async function fetchFeed(tab: Tab, category: string | null) {
    setLoading(true);
    const params = new URLSearchParams({ tab });
    if (category) params.set("category", category);
    const res = await fetch(`/api/v1/feed?${params.toString()}`);
    const json = await res.json();
    if (res.ok) {
      setPosts(json.posts);
      setCursor(json.nextCursor);
    }
    setLoading(false);
  }

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    fetchFeed(tab, activeCategory);
  }

  function switchCategory(slug: string | null) {
    setActiveCategory(slug);
    fetchFeed(activeTab, slug);
  }

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    const params = new URLSearchParams({ tab: activeTab, cursor });
    if (activeCategory) params.set("category", activeCategory);
    const res = await fetch(`/api/v1/feed?${params.toString()}`);
    const json = await res.json();
    if (res.ok) {
      setPosts((prev) => [...prev, ...json.posts]);
      setCursor(json.nextCursor);
    }
    setLoading(false);
  }

  return (
    <div>
      <div className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="flex gap-6 px-4 pt-3">
          {TABS.map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => switchTab(tab)}
              className={cn(
                "border-b-2 pb-3 text-sm font-semibold transition",
                activeTab === tab
                  ? "border-brand-600 text-slate-900 dark:text-slate-100"
                  : "border-transparent text-slate-500 dark:text-slate-400"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto px-4 py-2">
          <button
            onClick={() => switchCategory(null)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs font-medium",
              !activeCategory
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300"
            )}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => switchCategory(c.slug)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs font-medium",
                activeCategory === c.slug
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300"
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3">
        {loading && posts.length === 0 && <p className="p-8 text-center text-sm text-slate-400">Loading…</p>}

        {!loading && posts.length === 0 && (
          <p className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Nothing here yet. Follow some people or check back soon.
          </p>
        )}

        <div className="masonry-grid">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>

        {cursor && (
          <div className="p-4 text-center">
            <Button variant="ghost" onClick={loadMore} disabled={loading} className="border dark:border-slate-700">
              {loading ? "Loading…" : "Load more"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
