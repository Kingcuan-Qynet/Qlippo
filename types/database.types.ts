// Hand-written types mirroring supabase/schema.sql. If you later run
// `supabase gen types typescript`, this file can be replaced with the
// generated one — the shapes below match what that command would produce.

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  website: string | null;
  status: "active" | "suspended" | "deactivated";
  verified: boolean;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  sort_order: number;
};

export type PostType = "photo" | "carousel" | "article" | "video";

export type Post = {
  id: string;
  author_id: string;
  type: PostType;
  title: string | null;
  caption: string;
  category_id: string | null;
  location: string | null;
  visibility: "public" | "followers" | "private";
  status: "published" | "processing" | "removed";
  like_count: number;
  comment_count: number;
  view_count: number;
  save_count: number;
  share_count: number;
  created_at: string;
  updated_at: string;
};

export type PostMedia = {
  id: string;
  post_id: string;
  type: "image" | "video";
  url: string;
  thumbnail_url: string | null;
  detail_url: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  sort_order: number;
  created_at: string;
};

export type PostWithRelations = Post & {
  author: Profile;
  category: Category | null;
  media: PostMedia[];
  liked_by_me?: boolean;
  saved_by_me?: boolean;
};

export type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  like_count: number;
  created_at: string;
};

export type CommentWithAuthor = Comment & {
  author: Profile;
  liked_by_me?: boolean;
  replies?: CommentWithAuthor[];
};

export type Collection = {
  id: string;
  user_id: string;
  name: string;
  cover_url: string | null;
  created_at: string;
};

export type Notification = {
  id: string;
  recipient_id: string;
  actor_id: string;
  type: "like" | "comment" | "follow" | "mention" | "reply";
  post_id: string | null;
  comment_id: string | null;
  is_read: boolean;
  created_at: string;
};

export type NotificationWithActor = Notification & {
  actor: Profile;
  post: Pick<Post, "id" | "caption"> | null;
};

export type CallInvite = {
  id: string;
  caller_id: string;
  callee_id: string;
  status: "ringing" | "accepted" | "declined" | "missed" | "ended";
  created_at: string;
  updated_at: string;
};

type Row<T> = { Row: T; Insert: Partial<T>; Update: Partial<T> };

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string; username: string }; Update: Partial<Profile> };
      categories: Row<Category>;
      hashtags: Row<{ id: string; tag: string; usage_count: number; created_at: string }>;
      post_hashtags: Row<{ post_id: string; hashtag_id: string }>;
      posts: { Row: Post; Insert: Partial<Post> & { author_id: string; type: PostType }; Update: Partial<Post> };
      post_media: { Row: PostMedia; Insert: Partial<PostMedia> & { post_id: string; type: string; url: string }; Update: Partial<PostMedia> };
      likes: { Row: { user_id: string; post_id: string; created_at: string }; Insert: { user_id: string; post_id: string }; Update: never };
      saves: { Row: { user_id: string; post_id: string; created_at: string }; Insert: { user_id: string; post_id: string }; Update: never };
      collections: { Row: Collection; Insert: Partial<Collection> & { user_id: string; name: string }; Update: Partial<Collection> };
      collection_items: Row<{ collection_id: string; post_id: string; created_at: string }>;
      comments: { Row: Comment; Insert: Partial<Comment> & { post_id: string; user_id: string; content: string }; Update: Partial<Comment> };
      comment_likes: Row<{ user_id: string; comment_id: string; created_at: string }>;
      follows: { Row: { follower_id: string; following_id: string; created_at: string }; Insert: { follower_id: string; following_id: string }; Update: never };
      user_interests: Row<{ user_id: string; category_id: string; weight: number; updated_at: string }>;
      user_interactions: Row<{
        id: string;
        user_id: string | null;
        post_id: string;
        type: string;
        watch_seconds: number | null;
        completion_rate: number | null;
        created_at: string;
      }>;
      notifications: { Row: Notification; Insert: Partial<Notification>; Update: Partial<Notification> };
      reports: Row<{
        id: string;
        reporter_id: string;
        post_id: string | null;
        comment_id: string | null;
        reported_user_id: string | null;
        reason: string;
        status: string;
        created_at: string;
      }>;
      blocks: Row<{ blocker_id: string; blocked_id: string; created_at: string }>;
      mutes: Row<{ muter_id: string; muted_id: string; created_at: string }>;
      call_invites: { Row: CallInvite; Insert: Partial<CallInvite> & { caller_id: string; callee_id: string }; Update: Partial<CallInvite> };
    };
    Functions: {
      // supabase/personalization.sql
      process_post_hashtags: {
        Args: { p_post_id: string; p_tags: string[] };
        Returns: void;
      };
      get_for_you_feed: {
        Args: { p_user_id: string; p_limit?: number; p_before?: string | null };
        Returns: Post[];
      };
      get_trending_feed: {
        Args: { p_limit?: number; p_before?: string | null };
        Returns: Post[];
      };
      increment_post_views: {
        Args: { p_post_id: string };
        Returns: void;
      };
    };
  };
};
