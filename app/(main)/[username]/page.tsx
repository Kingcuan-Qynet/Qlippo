import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/session";
import { hydratePosts } from "@/lib/posts";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfilePostGrid } from "@/components/profile/ProfilePostGrid";

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const supabase = createClient();
  const user = await getAuthUser();

  const { data: profile } = await supabase.from("profiles").select("*").eq("username", params.username).single();
  if (!profile) notFound();

  const [{ count: followersCount }, { count: followingCount }, { count: postsCount }, { data: rows }] =
    await Promise.all([
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profile.id),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profile.id),
      supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("author_id", profile.id)
        .eq("status", "published"),
      supabase
        .from("posts")
        .select("*")
        .eq("author_id", profile.id)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(30)
    ]);

  let isFollowing = false;
  if (user && user.id !== profile.id) {
    const { data } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", user.id)
      .eq("following_id", profile.id)
      .maybeSingle();
    isFollowing = !!data;
  }

  const posts = await hydratePosts(rows ?? [], user?.id);

  return (
    <div>
      <ProfileHeader
        profile={profile}
        followersCount={followersCount ?? 0}
        followingCount={followingCount ?? 0}
        postsCount={postsCount ?? 0}
        isFollowing={isFollowing}
        isMe={user?.id === profile.id}
      />
      <ProfilePostGrid posts={posts} />
    </div>
  );
}
