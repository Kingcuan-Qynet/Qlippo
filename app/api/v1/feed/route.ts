import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hydratePosts } from "@/lib/posts";

/**
 * GET /api/v1/feed
 * Query params:
 *   ?tab=for_you (default) | following | trending
 *   ?category=<slug> — optional, filters any tab down to one category
 *   ?cursor=<ISO date>, ?limit=<n> (default 20)
 */
export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tab = searchParams.get("tab") ?? "for_you";
  const categorySlug = searchParams.get("category");
  const cursor = searchParams.get("cursor");
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);

  let categoryId: string | null = null;
  if (categorySlug) {
    const { data: category } = await supabase.from("categories").select("id").eq("slug", categorySlug).single();
    categoryId = category?.id ?? null;
  }

  let rows: any[] = [];

  if (tab === "following") {
    const { data: following } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);
    const authorIds = [user.id, ...(following ?? []).map((f) => f.following_id)];

    let query = supabase
      .from("posts")
      .select("*")
      .in("author_id", authorIds)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (categoryId) query = query.eq("category_id", categoryId);
    if (cursor) query = query.lt("created_at", cursor);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    rows = data ?? [];
  } else if (tab === "trending") {
    const { data, error } = await supabase.rpc("get_trending_feed", {
      p_limit: limit,
      p_before: cursor
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    rows = categoryId ? (data ?? []).filter((p: any) => p.category_id === categoryId) : data ?? [];
  } else {
    const { data, error } = await supabase.rpc("get_for_you_feed", {
      p_user_id: user.id,
      p_limit: limit,
      p_before: cursor
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    rows = categoryId ? (data ?? []).filter((p: any) => p.category_id === categoryId) : data ?? [];
  }

  const posts = await hydratePosts(rows, user.id);
  const nextCursor = rows.length === limit ? rows[rows.length - 1].created_at : null;

  return NextResponse.json({ posts, nextCursor });
}
