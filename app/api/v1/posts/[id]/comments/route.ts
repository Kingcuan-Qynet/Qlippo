import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// GET /api/v1/posts/:id/comments — flat list, newest first; client groups
// into threads via parent_id.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: comments, error } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", params.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const authorIds = Array.from(new Set((comments ?? []).map((c) => c.user_id)));
  const { data: authors } =
    authorIds.length > 0 ? await supabase.from("profiles").select("*").in("id", authorIds) : { data: [] as any[] };
  const authorMap = new Map((authors ?? []).map((a) => [a.id, a]));

  let likedSet = new Set<string>();
  if (user && comments && comments.length > 0) {
    const { data: likes } = await supabase
      .from("comment_likes")
      .select("comment_id")
      .eq("user_id", user.id)
      .in("comment_id", comments.map((c) => c.id));
    likedSet = new Set((likes ?? []).map((l) => l.comment_id));
  }

  const hydrated = (comments ?? []).map((c) => ({
    ...c,
    author: authorMap.get(c.user_id),
    liked_by_me: likedSet.has(c.id)
  }));

  return NextResponse.json({ comments: hydrated });
}

const commentSchema = z.object({
  content: z.string().trim().min(1).max(1000),
  parentId: z.string().uuid().nullable().optional()
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = commentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Comment can't be empty" }, { status: 400 });

  const { data: comment, error } = await supabase
    .from("comments")
    .insert({
      post_id: params.id,
      user_id: user.id,
      parent_id: parsed.data.parentId ?? null,
      content: parsed.data.content
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: author } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  await supabase
    .from("user_interactions")
    .insert({ user_id: user.id, post_id: params.id, type: "comment" });

  return NextResponse.json({ comment: { ...comment, author, liked_by_me: false } }, { status: 201 });
}
