"use client";

import { useEffect, useState } from "react";
import { NotificationItem } from "@/components/notification/NotificationItem";
import type { NotificationWithActor } from "@/types/database.types";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationWithActor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/v1/notifications");
      const json = await res.json();
      setNotifications(json.notifications ?? []);
      setLoading(false);
      fetch("/api/v1/notifications", { method: "PATCH" }).catch(() => {});
    })();
  }, []);

  return (
    <div>
      <header className="sticky top-0 z-10 border-b bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <h1 className="text-lg font-bold">Notifications</h1>
      </header>

      {loading && <p className="p-8 text-center text-sm text-slate-400">Loading…</p>}
      {!loading && notifications.length === 0 && (
        <p className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Nothing yet — likes, comments, and follows will show up here.
        </p>
      )}
      {notifications.map((n) => (
        <NotificationItem key={n.id} notification={n} />
      ))}
    </div>
  );
}
