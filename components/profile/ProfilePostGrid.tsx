"use client";

import { PostCard } from "@/components/post/PostCard";
import type { PostWithRelations } from "@/types/database.types";

export function ProfilePostGrid({ posts }: { posts: PostWithRelations[] }) {
  if (posts.length === 0) {
    return <p className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No posts yet.</p>;
  }

  return (
    <div className="masonry-grid p-3">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
