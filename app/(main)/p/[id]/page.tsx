import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser, getCurrentProfile } from "@/lib/supabase/session";
import { hydratePosts } from "@/lib/posts";
import { Avatar } from "@/components/ui/Avatar";
import { MediaViewer } from "@/components/post/MediaViewer";
import { PostActions } from "@/components/post/PostActions";
import { CommentSection } from "@/components/post/CommentSection";

export default async function PostDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [user, { data: postRow }] = await Promise.all([
    getAuthUser(),
    supabase.from("posts").select("*").eq("id", params.id).single(),
    supabase.rpc("increment_post_views", { p_post_id: params.id })
  ]);
  if (!postRow) notFound();

  const [[post], { data: commentRows }, profile] = await Promise.all([
    hydratePosts([postRow], user?.id),
    supabase.from("comments").select("*").eq("post_id", params.id).order("created_at", { ascending: false }),
    user ? getCurrentProfile(user.id) : Promise.resolve(null)
  ]);

  const authorIds = Array.from(new Set((commentRows ?? []).map((c) => c.user_id)));
  const { data: commentAuthors } =
    authorIds.length > 0 ? await supabase.from("profiles").select("*").in("id", authorIds) : { data: [] as any[] };
  const authorMap = new Map((commentAuthors ?? []).map((a) => [a.id, a]));

  let likedCommentSet = new Set<string>();
  if (user && commentRows && commentRows.length > 0) {
    const { data: likes } = await supabase
      .from("comment_likes")
      .select("comment_id")
      .eq("user_id", user.id)
      .in("comment_id", commentRows.map((c) => c.id));
    likedCommentSet = new Set((likes ?? []).map((l) => l.comment_id));
  }

  const comments = (commentRows ?? []).map((c) => ({
    ...c,
    author: authorMap.get(c.user_id),
    liked_by_me: likedCommentSet.has(c.id)
  }));

  return (
    <div>
      <header className="sticky top-0 z-10 flex items-center gap-4 border-b bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <Link href="/feed" className="rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-bold">Post</h1>
      </header>

      {post.media.length > 0 && <MediaViewer type={post.type} media={post.media} />}

      <div className="p-4">
        <div className="flex items-center gap-2">
          <Link href={`/${post.author.username}`}>
            <Avatar src={post.author.avatar_url} name={post.author.display_name || post.author.username} size={36} />
          </Link>
          <div>
            <Link href={`/${post.author.username}`} className="font-semibold hover:underline">
              {post.author.display_name || post.author.username}
            </Link>
            {post.location && (
              <p className="flex items-center gap-1 text-xs text-slate-400">
                <MapPin size={11} />
                {post.location}
              </p>
            )}
          </div>
        </div>

        {post.title && <h1 className="mt-3 text-xl font-bold">{post.title}</h1>}
        {post.caption && (
          <p className="mt-2 whitespace-pre-wrap break-words text-[15px]">{post.caption}</p>
        )}
        {post.category && (
          <span className="mt-2 inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {post.category.name}
          </span>
        )}

        <p className="mt-2 text-xs text-slate-400">{post.view_count.toLocaleString()} views</p>
      </div>

      <div className="px-4">
        <PostActions postId={post.id} likeCount={post.like_count} likedByMe={post.liked_by_me} savedByMe={post.saved_by_me} />
      </div>

      <CommentSection postId={params.id} currentUser={profile} initialComments={comments} />
    </div>
  );
}
