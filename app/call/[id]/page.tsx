import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/session";
import { CallRoom } from "@/components/calls/CallRoom";

export default async function CallPage({ params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const supabase = createClient();
  const { data: invite } = await supabase.from("call_invites").select("*").eq("id", params.id).single();
  if (!invite) notFound();

  const isParticipant = invite.caller_id === user.id || invite.callee_id === user.id;
  if (!isParticipant) redirect("/feed");

  const otherUserId = invite.caller_id === user.id ? invite.callee_id : invite.caller_id;
  const { data: otherUser } = await supabase.from("profiles").select("*").eq("id", otherUserId).single();
  if (!otherUser) notFound();

  return (
    <CallRoom
      callId={params.id}
      currentUserId={user.id}
      otherUser={otherUser}
      isCaller={invite.caller_id === user.id}
    />
  );
}
