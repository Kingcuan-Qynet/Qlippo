-- ============================================================================
-- CONTENT PLATFORM — CORE SCHEMA
-- Light MVP on plain PostgreSQL (via Supabase). No Redis/Queue required to
-- run this — every table below is designed so a cache layer or background
-- worker can be added LATER in front of it without changing the schema.
-- Run once against a fresh Supabase project (SQL Editor).
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- search, upgradeable to Meilisearch later without a schema change

-- ============================================================================
-- 1. IDENTITY
-- ============================================================================

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null check (char_length(username) between 3 and 20 and username ~ '^[a-zA-Z0-9_]+$'),
  display_name  text not null default '',
  bio           text default '',
  avatar_url    text,
  cover_url     text,
  website       text,
  status        text not null default 'active' check (status in ('active', 'suspended', 'deactivated')),
  verified      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_profiles_username_trgm on public.profiles using gin (username gin_trgm_ops);

-- ============================================================================
-- 2. TAXONOMY — categories + hashtags (drive both browsing and "For You")
-- ============================================================================

create table if not exists public.categories (
  id          uuid primary key default uuid_generate_v4(),
  slug        text unique not null,
  name        text not null,
  icon        text, -- emoji or icon name, kept simple for MVP
  sort_order  integer not null default 0
);

insert into public.categories (slug, name, sort_order) values
  ('food', 'Food', 1),
  ('travel', 'Travel', 2),
  ('fashion', 'Fashion', 3),
  ('beauty', 'Beauty', 4),
  ('home', 'Home & Living', 5),
  ('fitness', 'Fitness', 6),
  ('tech', 'Tech', 7),
  ('lifestyle', 'Lifestyle', 8)
on conflict (slug) do nothing;

create table if not exists public.hashtags (
  id          uuid primary key default uuid_generate_v4(),
  tag         text unique not null,
  usage_count integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_hashtags_tag_trgm on public.hashtags using gin (tag gin_trgm_ops);

create table if not exists public.post_hashtags (
  post_id     uuid not null,
  hashtag_id  uuid not null references public.hashtags(id) on delete cascade,
  primary key (post_id, hashtag_id)
);

-- ============================================================================
-- 3. POSTS — photo / carousel / article / video, all one table
-- ============================================================================

create table if not exists public.posts (
  id              uuid primary key default uuid_generate_v4(),
  author_id       uuid not null references public.profiles(id) on delete cascade,
  type            text not null check (type in ('photo', 'carousel', 'article', 'video')),
  title           text,                     -- used by article/carousel; optional elsewhere
  caption         text not null default '' check (char_length(caption) <= 3000),
  category_id     uuid references public.categories(id) on delete set null,
  location        text,
  visibility      text not null default 'public' check (visibility in ('public', 'followers', 'private')),
  status          text not null default 'published' check (status in ('published', 'processing', 'removed')),
  like_count      integer not null default 0,
  comment_count   integer not null default 0,
  view_count      integer not null default 0,
  save_count      integer not null default 0,
  share_count     integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.post_hashtags
  add constraint post_hashtags_post_id_fkey foreign key (post_id) references public.posts(id) on delete cascade;

create index if not exists idx_posts_author_created on public.posts (author_id, created_at desc);
create index if not exists idx_posts_category_created on public.posts (category_id, created_at desc) where status = 'published';
create index if not exists idx_posts_feed on public.posts (created_at desc) where status = 'published' and visibility = 'public';
create index if not exists idx_posts_caption_trgm on public.posts using gin (caption gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Media attached to a post. `variant` lets one logical image/video have
-- multiple sizes (thumbnail/feed/detail) without re-uploading — the upload
-- pipeline (see storage.sql) writes all three; the app picks the right one
-- per context so the feed never ships a full-resolution file.
-- ---------------------------------------------------------------------------
create table if not exists public.post_media (
  id            uuid primary key default uuid_generate_v4(),
  post_id       uuid not null references public.posts(id) on delete cascade,
  type          text not null check (type in ('image', 'video')),
  url           text not null,             -- the "feed"-size variant, safe default to render
  thumbnail_url text,                      -- small variant, for grid/list views
  detail_url    text,                      -- full-size variant, for the detail/lightbox view
  width         integer,
  height        integer,
  duration      integer,                   -- seconds, video only
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists idx_post_media_post_id on public.post_media (post_id, sort_order);

-- ============================================================================
-- 4. ENGAGEMENT — likes, saves, collections, comments
-- ============================================================================

create table if not exists public.likes (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  post_id     uuid not null references public.posts(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index if not exists idx_likes_post on public.likes (post_id);

create table if not exists public.saves (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  post_id     uuid not null references public.posts(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, post_id)
);

-- Pinterest/Lemon8-style folders for saved posts — optional; a save with no
-- collection just lives in the user's default "All saves" view.
create table if not exists public.collections (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  cover_url   text,
  created_at  timestamptz not null default now()
);

create table if not exists public.collection_items (
  collection_id uuid not null references public.collections(id) on delete cascade,
  post_id       uuid not null references public.posts(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (collection_id, post_id)
);

create table if not exists public.comments (
  id            uuid primary key default uuid_generate_v4(),
  post_id       uuid not null references public.posts(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  parent_id     uuid references public.comments(id) on delete cascade, -- threaded replies
  content       text not null check (char_length(content) <= 1000),
  like_count    integer not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists idx_comments_post on public.comments (post_id, created_at);
create index if not exists idx_comments_parent on public.comments (parent_id);

create table if not exists public.comment_likes (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  comment_id  uuid not null references public.comments(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, comment_id)
);

-- ============================================================================
-- 5. SOCIAL GRAPH
-- ============================================================================

create table if not exists public.follows (
  follower_id   uuid not null references public.profiles(id) on delete cascade,
  following_id  uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists idx_follows_following on public.follows (following_id);
create index if not exists idx_follows_follower on public.follows (follower_id);

-- ============================================================================
-- 6. PERSONALIZATION SIGNAL — lightweight now, feeds a real ranking model later
-- ============================================================================

-- Explicit interest a user picked (onboarding) or that we inferred from
-- behavior. `weight` starts simple (1.0) and can be adjusted by a future
-- job without touching the app code that reads it.
create table if not exists public.user_interests (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  weight      real not null default 1.0,
  updated_at  timestamptz not null default now(),
  primary key (user_id, category_id)
);

-- ---------------------------------------------------------------------------
-- Raw interaction log. This is the "slot" for a future real ranking engine:
-- right now nothing reads it except an optional lightweight scoring query
-- (see performance.sql), but the data is captured from day one so when a
-- proper recommendation system gets built later, historical signal already
-- exists instead of starting from zero.
-- ---------------------------------------------------------------------------
create table if not exists public.user_interactions (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references public.profiles(id) on delete cascade, -- null = anonymous/logged-out view
  post_id         uuid not null references public.posts(id) on delete cascade,
  type            text not null check (type in ('view', 'like', 'unlike', 'comment', 'save', 'unsave', 'share', 'skip', 'watch_progress')),
  watch_seconds   real,
  completion_rate real, -- 0.0–1.0, video/carousel only
  created_at      timestamptz not null default now()
);

create index if not exists idx_interactions_user_created on public.user_interactions (user_id, created_at desc);
create index if not exists idx_interactions_post on public.user_interactions (post_id);

-- ============================================================================
-- 7. NOTIFICATIONS
-- ============================================================================

create table if not exists public.notifications (
  id            uuid primary key default uuid_generate_v4(),
  recipient_id  uuid not null references public.profiles(id) on delete cascade,
  actor_id      uuid not null references public.profiles(id) on delete cascade,
  type          text not null check (type in ('like', 'comment', 'follow', 'mention', 'reply')),
  post_id       uuid references public.posts(id) on delete cascade,
  comment_id    uuid references public.comments(id) on delete cascade,
  is_read       boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists idx_notifications_recipient on public.notifications (recipient_id, created_at desc);

-- ============================================================================
-- 8. MODERATION
-- ============================================================================

create table if not exists public.reports (
  id            uuid primary key default uuid_generate_v4(),
  reporter_id   uuid not null references public.profiles(id) on delete cascade,
  post_id       uuid references public.posts(id) on delete cascade,
  comment_id    uuid references public.comments(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete cascade,
  reason        text not null,
  status        text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
  created_at    timestamptz not null default now()
);

create table if not exists public.blocks (
  blocker_id  uuid not null references public.profiles(id) on delete cascade,
  blocked_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.mutes (
  muter_id    uuid not null references public.profiles(id) on delete cascade,
  muted_id    uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (muter_id, muted_id),
  check (muter_id <> muted_id)
);

-- ============================================================================
-- 9. VIDEO CALLS — ephemeral signaling only, nothing is ever stored/recorded
-- ============================================================================

-- A call "ring" event, purely so the recipient's client knows to show an
-- incoming-call UI even if they weren't already looking at a Realtime
-- channel for it. The actual audio/video never touches this database or
-- any storage — it flows peer-to-peer over WebRTC. This row is deleted
-- (or just expires from relevance) once the call ends; there is no
-- recording feature by design.
create table if not exists public.call_invites (
  id            uuid primary key default uuid_generate_v4(),
  caller_id     uuid not null references public.profiles(id) on delete cascade,
  callee_id     uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'ringing' check (status in ('ringing', 'accepted', 'declined', 'missed', 'ended')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_call_invites_callee on public.call_invites (callee_id, status);

-- ============================================================================
-- 10. TRIGGERS — keep counters + updated_at in sync, auto-create profile
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_posts_updated_at on public.posts;
create trigger trg_posts_updated_at before update on public.posts
  for each row execute function public.set_updated_at();

drop trigger if exists trg_call_invites_updated_at on public.call_invites;
create trigger trg_call_invites_updated_at before update on public.call_invites
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', 'New User')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.on_like_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_likes_count on public.likes;
create trigger trg_likes_count after insert or delete on public.likes
  for each row execute function public.on_like_change();

create or replace function public.on_save_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set save_count = save_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.posts set save_count = greatest(save_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_saves_count on public.saves;
create trigger trg_saves_count after insert or delete on public.saves
  for each row execute function public.on_save_change();

create or replace function public.on_comment_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_comments_count on public.comments;
create trigger trg_comments_count after insert or delete on public.comments
  for each row execute function public.on_comment_change();

create or replace function public.on_comment_like_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    update public.comments set like_count = like_count + 1 where id = new.comment_id;
  elsif (tg_op = 'DELETE') then
    update public.comments set like_count = greatest(like_count - 1, 0) where id = old.comment_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_comment_likes_count on public.comment_likes;
create trigger trg_comment_likes_count after insert or delete on public.comment_likes
  for each row execute function public.on_comment_like_change();

-- Notifications (skip self-notifications)
create or replace function public.on_follow_notify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (recipient_id, actor_id, type)
  values (new.following_id, new.follower_id, 'follow');
  return new;
end;
$$;

drop trigger if exists trg_follow_notify on public.follows;
create trigger trg_follow_notify after insert on public.follows
  for each row execute function public.on_follow_notify();

create or replace function public.on_like_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_author uuid;
begin
  select author_id into v_author from public.posts where id = new.post_id;
  if v_author is not null and v_author <> new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, post_id)
    values (v_author, new.user_id, 'like', new.post_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_like_notify on public.likes;
create trigger trg_like_notify after insert on public.likes
  for each row execute function public.on_like_notify();

create or replace function public.on_comment_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_author uuid;
  v_parent_author uuid;
begin
  select author_id into v_author from public.posts where id = new.post_id;
  if v_author is not null and v_author <> new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, post_id, comment_id)
    values (v_author, new.user_id, 'comment', new.post_id, new.id);
  end if;

  if new.parent_id is not null then
    select user_id into v_parent_author from public.comments where id = new.parent_id;
    if v_parent_author is not null and v_parent_author <> new.user_id and v_parent_author <> v_author then
      insert into public.notifications (recipient_id, actor_id, type, post_id, comment_id)
      values (v_parent_author, new.user_id, 'reply', new.post_id, new.id);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_comment_notify on public.comments;
create trigger trg_comment_notify after insert on public.comments
  for each row execute function public.on_comment_notify();

-- ============================================================================
-- 11. REALTIME — enables the incoming-call listener (postgres_changes on
--     call_invites) and lets the profile edit / feed pages subscribe to
--     live updates later if needed, without another migration.
-- ============================================================================
alter publication supabase_realtime add table public.call_invites;
