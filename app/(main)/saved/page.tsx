import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/session";
import { hydratePosts } from "@/lib/posts";
import { PostCard } from "@/components/post/PostCard";
import { CollectionsPanel } from "@/components/saved/CollectionsPanel";

export default async function SavedPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const supabase = createClient();
  const { data: saves } = await supabase
    .from("saves")
    .select("post_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  const postIds = (saves ?? []).map((s) => s.post_id);
  const { data: rows } = postIds.length > 0 ? await supabase.from("posts").select("*").in("id", postIds) : { data: [] as any[] };

  const order = new Map(postIds.map((id, i) => [id, i]));
  const sorted = [...(rows ?? [])].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  const posts = await hydratePosts(sorted, user.id);

  return (
    <div>
      <header className="sticky top-0 z-10 border-b bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <h1 className="text-lg font-bold">Saved</h1>
      </header>

      <CollectionsPanel />

      <h2 className="px-4 pt-4 text-sm font-semibold text-slate-500 dark:text-slate-400">All saves</h2>
      {posts.length === 0 ? (
        <p className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Nothing saved yet — tap the bookmark icon on any post.
        </p>
      ) : (
        <div className="masonry-grid p-3">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}
