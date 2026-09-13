"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function FollowButton({ profileId, initialIsFollowing }: { profileId: string; initialIsFollowing: boolean }) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (pending) return;
    setPending(true);
    const next = !isFollowing;
    setIsFollowing(next);
    const res = await fetch("/api/v1/follows", {
      method: next ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ following_id: profileId })
    });
    if (!res.ok) setIsFollowing(!next);
    setPending(false);
    router.refresh();
  }

  return (
    <Button
      variant={isFollowing ? "ghost" : "primary"}
      onClick={toggle}
      disabled={pending}
      className={isFollowing ? "border dark:border-slate-700" : ""}
    >
      {isFollowing ? "Following" : "Follow"}
    </Button>
  );
}
