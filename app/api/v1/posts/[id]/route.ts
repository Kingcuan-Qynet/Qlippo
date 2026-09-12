import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hydratePosts } from "@/lib/posts";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [{ data: post, error }] = await Promise.all([
    supabase.from("posts").select("*").eq("id", params.id).single(),
    supabase.rpc("increment_post_views", { p_post_id: params.id })
  ]);

  if (error || !post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  if (user) {
    await supabase.from("user_interactions").insert({ user_id: user.id, post_id: params.id, type: "view" });
  }

  const [hydrated] = await hydratePosts([post], user?.id);
  return NextResponse.json({ post: hydrated });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: post } = await supabase.from("posts").select("author_id").eq("id", params.id).single();
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.author_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await supabase.from("posts").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
