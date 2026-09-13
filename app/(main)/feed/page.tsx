import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/session";
import { hydratePosts } from "@/lib/posts";
import { Feed } from "@/components/feed/Feed";

export default async function FeedPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const supabase = createClient();

  const [{ data: rows }, { data: categories }] = await Promise.all([
    supabase.rpc("get_for_you_feed", { p_user_id: user.id, p_limit: 20 }),
    supabase.from("categories").select("*").order("sort_order")
  ]);

  const posts = await hydratePosts(rows ?? [], user.id);
  const nextCursor = rows && rows.length === 20 ? rows[rows.length - 1].created_at : null;

  return <Feed initialPosts={posts} initialCursor={nextCursor} categories={categories ?? []} />;
}
