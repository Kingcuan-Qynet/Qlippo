import { createClient } from "@/lib/supabase/server";
import type { PostWithRelations } from "@/types/database.types";

export async function hydratePosts(postRows: any[], viewerId?: string): Promise<PostWithRelations[]> {
  if (postRows.length === 0) return [];
  const supabase = createClient();

  const postIds = postRows.map((p) => p.id);
  const authorIds = Array.from(new Set(postRows.map((p) => p.author_id)));
  const categoryIds = Array.from(new Set(postRows.map((p) => p.category_id).filter(Boolean)));

  const [{ data: authors }, { data: media }, { data: categories }] = await Promise.all([
    supabase.from("profiles").select("*").in("id", authorIds),
    supabase.from("post_media").select("*").in("post_id", postIds).order("sort_order"),
    categoryIds.length > 0
      ? supabase.from("categories").select("*").in("id", categoryIds)
      : Promise.resolve({ data: [] as any[] })
  ]);

  const authorMap = new Map((authors ?? []).map((a) => [a.id, a]));
  const categoryMap = new Map((categories ?? []).map((c) => [c.id, c]));
  const mediaMap = new Map<string, any[]>();
  for (const m of media ?? []) {
    if (!mediaMap.has(m.post_id)) mediaMap.set(m.post_id, []);
    mediaMap.get(m.post_id)!.push(m);
  }

  let likedSet = new Set<string>();
  let savedSet = new Set<string>();
  if (viewerId) {
    const [{ data: likes }, { data: saves }] = await Promise.all([
      supabase.from("likes").select("post_id").eq("user_id", viewerId).in("post_id", postIds),
      supabase.from("saves").select("post_id").eq("user_id", viewerId).in("post_id", postIds)
    ]);
    likedSet = new Set((likes ?? []).map((l) => l.post_id));
    savedSet = new Set((saves ?? []).map((s) => s.post_id));
  }

  return postRows.map((row) => ({
    ...row,
    author: authorMap.get(row.author_id),
    category: row.category_id ? categoryMap.get(row.category_id) ?? null : null,
    media: mediaMap.get(row.id) ?? [],
    liked_by_me: likedSet.has(row.id),
    saved_by_me: savedSet.has(row.id)
  }));
}
