"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { cn, timeAgo } from "@/lib/utils";
import type { CommentWithAuthor, Profile } from "@/types/database.types";

function buildTree(flat: CommentWithAuthor[]): CommentWithAuthor[] {
  const byId = new Map(flat.map((c) => [c.id, { ...c, replies: [] as CommentWithAuthor[] }]));
  const roots: CommentWithAuthor[] = [];
  for (const c of byId.values()) {
    if (c.parent_id && byId.has(c.parent_id)) {
      byId.get(c.parent_id)!.replies!.push(c);
    } else {
      roots.push(c);
    }
  }
  return roots;
}

function CommentItem({
  comment,
  onReply
}: {
  comment: CommentWithAuthor;
  onReply: (parentId: string, username: string) => void;
}) {
  const [liked, setLiked] = useState(!!comment.liked_by_me);
  const [likeCount, setLikeCount] = useState(comment.like_count);

  async function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    const supabase = (await import("@/lib/supabase/client")).createClient();
    if (next) {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (user) await supabase.from("comment_likes").insert({ user_id: user.id, comment_id: comment.id });
    } else {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (user) await supabase.from("comment_likes").delete().eq("user_id", user.id).eq("comment_id", comment.id);
    }
  }

  return (
    <div className="flex gap-2.5 py-3">
      <Avatar src={comment.author.avatar_url} name={comment.author.display_name || comment.author.username} size={32} />
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-semibold">{comment.author.display_name || comment.author.username}</span>{" "}
          <span className="text-slate-400">· {timeAgo(comment.created_at)}</span>
        </p>
        <p className="whitespace-pre-wrap break-words text-sm">{comment.content}</p>
        <div className="mt-1 flex items-center gap-4">
          <button
            onClick={toggleLike}
            className={cn("flex items-center gap-1 text-xs", liked ? "text-pink-600" : "text-slate-400")}
          >
            <Heart size={13} fill={liked ? "currentColor" : "none"} />
            {likeCount || ""}
          </button>
          <button
            onClick={() => onReply(comment.id, comment.author.username)}
            className="text-xs text-slate-400 hover:underline"
          >
            Reply
          </button>
        </div>

        {comment.replies && comment.replies.length > 0 && (
          <div className="ml-2 mt-2 border-l pl-3 dark:border-slate-800">
            {comment.replies.map((r) => (
              <CommentItem key={r.id} comment={r} onReply={onReply} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function CommentSection({
  postId,
  currentUser,
  initialComments
}: {
  postId: string;
  currentUser: Profile | null;
  initialComments: CommentWithAuthor[];
}) {
  const [comments, setComments] = useState(initialComments);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => setComments(initialComments), [initialComments]);

  async function handleSend() {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);

    const res = await fetch(`/api/v1/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, parentId: replyTo?.id ?? null })
    });
    const json = await res.json();

    if (res.ok) {
      setComments((prev) => [json.comment, ...prev]);
      setDraft("");
      setReplyTo(null);
    }
    setSending(false);
  }

  const tree = buildTree(comments);

  return (
    <div className="border-t p-4 dark:border-slate-800">
      <h2 className="mb-2 font-semibold">Comments ({comments.length})</h2>

      {currentUser && (
        <div className="mb-4 flex items-start gap-2">
          <Avatar src={currentUser.avatar_url} name={currentUser.display_name || currentUser.username} size={32} />
          <div className="flex-1">
            {replyTo && (
              <p className="mb-1 text-xs text-slate-400">
                Replying to @{replyTo.username}{" "}
                <button onClick={() => setReplyTo(null)} className="underline">
                  cancel
                </button>
              </p>
            )}
            <div className="flex items-center gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Add a comment…"
                maxLength={1000}
                className="flex-1 rounded-full border px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
              />
              <Button onClick={handleSend} disabled={!draft.trim() || sending}>
                Post
              </Button>
            </div>
          </div>
        </div>
      )}

      {tree.length === 0 && <p className="text-sm text-slate-400">No comments yet. Be the first!</p>}

      <div className="divide-y dark:divide-slate-800">
        {tree.map((c) => (
          <CommentItem key={c.id} comment={c} onReply={(id, username) => setReplyTo({ id, username })} />
        ))}
      </div>
    </div>
  );
}
