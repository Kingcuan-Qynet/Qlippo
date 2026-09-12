import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hydratePosts } from "@/lib/posts";

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ users: [], posts: [], hashtags: [] });

  if (q.startsWith("#")) {
    const tag = q.slice(1).toLowerCase();
    const { data: hashtags } = await supabase
      .from("hashtags")
      .select("*")
      .ilike("tag", `%${tag}%`)
      .order("usage_count", { ascending: false })
      .limit(10);
    return NextResponse.json({ users: [], posts: [], hashtags: hashtags ?? [] });
  }

  const [{ data: users }, { data: postRows }] = await Promise.all([
    supabase.from("profiles").select("*").or(`username.ilike.%${q}%,display_name.ilike.%${q}%`).limit(10),
    supabase
      .from("posts")
      .select("*")
      .or(`caption.ilike.%${q}%,title.ilike.%${q}%`)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(20)
  ]);

  const posts = await hydratePosts(postRows ?? [], user?.id);
  return NextResponse.json({ users: users ?? [], posts, hashtags: [] });
}
