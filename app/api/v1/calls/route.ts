import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({ calleeId: z.string().uuid() });

// POST /api/v1/calls — starts a call invite. The callee finds out via a
// Realtime subscription on this table (see IncomingCallListener), not a
// separate push mechanism.
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  if (parsed.data.calleeId === user.id) {
    return NextResponse.json({ error: "You can't call yourself" }, { status: 400 });
  }

  const { data: invite, error } = await supabase
    .from("call_invites")
    .insert({ caller_id: user.id, callee_id: parsed.data.calleeId, status: "ringing" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ callId: invite.id }, { status: 201 });
}
