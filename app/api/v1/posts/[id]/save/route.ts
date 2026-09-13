import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const saveSchema = z.object({ collectionId: z.string().uuid().nullable().optional() });

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = saveSchema.safeParse(body);
  const collectionId = parsed.success ? parsed.data.collectionId : null;

  const { error } = await supabase.from("saves").insert({ user_id: user.id, post_id: params.id });
  if (error && error.code !== "23505") return NextResponse.json({ error: error.message }, { status: 500 });

  if (collectionId) {
    await supabase.from("collection_items").insert({ collection_id: collectionId, post_id: params.id });
  }

  await supabase.from("user_interactions").insert({ user_id: user.id, post_id: params.id, type: "save" });

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("saves").delete().eq("user_id", user.id).eq("post_id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
