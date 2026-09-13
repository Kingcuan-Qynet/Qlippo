import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: rows, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const actorIds = Array.from(new Set((rows ?? []).map((r) => r.actor_id)));
  const postIds = Array.from(new Set((rows ?? []).filter((r) => r.post_id).map((r) => r.post_id)));

  const [{ data: actors }, { data: posts }] = await Promise.all([
    actorIds.length ? supabase.from("profiles").select("*").in("id", actorIds) : Promise.resolve({ data: [] }),
    postIds.length ? supabase.from("posts").select("id, caption").in("id", postIds) : Promise.resolve({ data: [] })
  ]);

  const actorMap = new Map((actors ?? []).map((a) => [a.id, a]));
  const postMap = new Map((posts ?? []).map((p) => [p.id, p]));

  const notifications = (rows ?? []).map((n) => ({
    ...n,
    actor: actorMap.get(n.actor_id),
    post: n.post_id ? postMap.get(n.post_id) ?? null : null
  }));

  return NextResponse.json({ notifications });
}

export async function PATCH() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("recipient_id", user.id)
    .eq("is_read", false);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
