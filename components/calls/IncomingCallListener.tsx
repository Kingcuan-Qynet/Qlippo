"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, PhoneOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import type { Profile } from "@/types/database.types";

export function IncomingCallListener({ currentUserId }: { currentUserId: string }) {
  const router = useRouter();
  const [incoming, setIncoming] = useState<{ callId: string; caller: Profile } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`incoming-calls:${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "call_invites", filter: `callee_id=eq.${currentUserId}` },
        async (payload) => {
          const callerId = payload.new.caller_id as string;
          const { data: caller } = await supabase.from("profiles").select("*").eq("id", callerId).single();
          if (caller) setIncoming({ callId: payload.new.id as string, caller });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  if (!incoming) return null;

  async function respond(status: "accepted" | "declined") {
    await fetch(`/api/v1/calls/${incoming!.callId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (status === "accepted") router.push(`/call/${incoming!.callId}`);
    setIncoming(null);
  }

  return (
    <div className="fixed inset-x-0 top-4 z-50 mx-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900">
      <Avatar src={incoming.caller.avatar_url} name={incoming.caller.display_name || incoming.caller.username} size={44} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{incoming.caller.display_name || incoming.caller.username}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">Incoming video call…</p>
      </div>
      <button
        onClick={() => respond("declined")}
        className="rounded-full bg-red-600 p-2 text-white hover:bg-red-700"
        aria-label="Decline"
      >
        <PhoneOff size={18} />
      </button>
      <button
        onClick={() => respond("accepted")}
        className="rounded-full bg-green-600 p-2 text-white hover:bg-green-700"
        aria-label="Accept"
      >
        <Phone size={18} />
      </button>
    </div>
  );
}
