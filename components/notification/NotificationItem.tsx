import Link from "next/link";
import { Heart, MessageCircle, UserPlus, Reply } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { timeAgo } from "@/lib/utils";
import type { NotificationWithActor } from "@/types/database.types";

const icons = {
  like: <Heart size={16} className="text-pink-600" fill="currentColor" />,
  comment: <MessageCircle size={16} className="text-brand-600" />,
  follow: <UserPlus size={16} className="text-brand-600" />,
  mention: <MessageCircle size={16} className="text-brand-600" />,
  reply: <Reply size={16} className="text-brand-600" />
};

const verbs: Record<string, string> = {
  like: "liked your post",
  comment: "commented on your post",
  follow: "followed you",
  mention: "mentioned you",
  reply: "replied to your comment"
};

export function NotificationItem({ notification }: { notification: NotificationWithActor }) {
  const href = notification.post_id ? `/p/${notification.post_id}` : `/${notification.actor.username}`;

  return (
    <Link
      href={href}
      className={`flex gap-3 border-b p-4 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 ${
        !notification.is_read ? "bg-brand-50/40 dark:bg-brand-950/20" : ""
      }`}
    >
      <div className="pt-1">{icons[notification.type]}</div>
      <Avatar src={notification.actor.avatar_url} name={notification.actor.display_name || notification.actor.username} size={36} />
      <div className="min-w-0">
        <p className="text-sm">
          <span className="font-semibold">{notification.actor.display_name || notification.actor.username}</span>{" "}
          <span className="text-slate-600 dark:text-slate-400">{verbs[notification.type]}</span>
        </p>
        {notification.post?.caption && (
          <p className="mt-0.5 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{notification.post.caption}</p>
        )}
        <p className="mt-0.5 text-xs text-slate-400">{timeAgo(notification.created_at)}</p>
      </div>
    </Link>
  );
}
