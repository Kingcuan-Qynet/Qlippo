"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Video } from "lucide-react";

export function CallButton({ calleeId }: { calleeId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const res = await fetch("/api/v1/calls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calleeId })
    });
    const json = await res.json();
    setLoading(false);
    if (res.ok) router.push(`/call/${json.callId}`);
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-full border p-2 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
      aria-label="Start video call"
    >
      <Video size={18} />
    </button>
  );
}
