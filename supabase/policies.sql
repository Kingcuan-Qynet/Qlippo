-- ============================================================================
-- ROW LEVEL SECURITY
-- Run after schema.sql.
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.hashtags enable row level security;
alter table public.post_hashtags enable row level security;
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.likes enable row level security;
alter table public.saves enable row level security;
alter table public.collections enable row level security;
alter table public.collection_items enable row level security;
alter table public.comments enable row level security;
alter table public.comment_likes enable row level security;
alter table public.follows enable row level security;
alter table public.user_interests enable row level security;
alter table public.user_interactions enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;
alter table public.mutes enable row level security;
alter table public.call_invites enable row level security;

-- ---- PROFILES ---------------------------------------------------------
create policy "profiles are publicly readable" on public.profiles for select using (true);
create policy "users can update their own profile" on public.profiles for update using (auth.uid() = id);

-- ---- CATEGORIES / HASHTAGS (public read; writes via triggers/RPC) --------
create policy "categories are publicly readable" on public.categories for select using (true);
create policy "hashtags are publicly readable" on public.hashtags for select using (true);
create policy "post_hashtags are publicly readable" on public.post_hashtags for select using (true);

-- ---- POSTS --------------------------------------------------------------
create policy "public posts are readable by everyone" on public.posts
  for select using (visibility = 'public' or author_id = auth.uid());
create policy "users can create their own posts" on public.posts
  for insert with check (auth.uid() = author_id);
create policy "users can update their own posts" on public.posts
  for update using (auth.uid() = author_id);
create policy "users can delete their own posts" on public.posts
  for delete using (auth.uid() = author_id);

-- ---- POST MEDIA -----------------------------------------------------------
create policy "media readable if parent post readable" on public.post_media
  for select using (
    exists (select 1 from public.posts p where p.id = post_media.post_id and (p.visibility = 'public' or p.author_id = auth.uid()))
  );
create policy "author can attach media to own post" on public.post_media
  for insert with check (exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));
create policy "author can remove media from own post" on public.post_media
  for delete using (exists (select 1 from public.posts p where p.id = post_media.post_id and p.author_id = auth.uid()));

-- ---- LIKES / SAVES ------------------------------------------------------
create policy "likes are publicly readable" on public.likes for select using (true);
create policy "users can like as themselves" on public.likes for insert with check (auth.uid() = user_id);
create policy "users can unlike as themselves" on public.likes for delete using (auth.uid() = user_id);

create policy "users see only their own saves" on public.saves for select using (auth.uid() = user_id);
create policy "users can save as themselves" on public.saves for insert with check (auth.uid() = user_id);
create policy "users can unsave as themselves" on public.saves for delete using (auth.uid() = user_id);

-- ---- COLLECTIONS ----------------------------------------------------------
create policy "users manage their own collections" on public.collections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage their own collection items" on public.collection_items
  for all using (exists (select 1 from public.collections c where c.id = collection_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.collections c where c.id = collection_id and c.user_id = auth.uid()));

-- ---- COMMENTS -------------------------------------------------------------
create policy "comments readable if parent post readable" on public.comments
  for select using (
    exists (select 1 from public.posts p where p.id = comments.post_id and (p.visibility = 'public' or p.author_id = auth.uid()))
  );
create policy "users can comment as themselves" on public.comments
  for insert with check (auth.uid() = user_id);
create policy "users can delete their own comments" on public.comments
  for delete using (auth.uid() = user_id);

create policy "comment likes are publicly readable" on public.comment_likes for select using (true);
create policy "users can like comments as themselves" on public.comment_likes for insert with check (auth.uid() = user_id);
create policy "users can unlike comments as themselves" on public.comment_likes for delete using (auth.uid() = user_id);

-- ---- FOLLOWS --------------------------------------------------------------
create policy "follows are publicly readable" on public.follows for select using (true);
create policy "users can follow as themselves" on public.follows for insert with check (auth.uid() = follower_id);
create policy "users can unfollow as themselves" on public.follows for delete using (auth.uid() = follower_id);

-- ---- PERSONALIZATION ------------------------------------------------------
create policy "users manage their own interests" on public.user_interests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Interaction logging: insert-only from the client, never readable back by
-- the client (this is telemetry feeding a future ranking system, not
-- something the app needs to display) — keeps it lightweight and avoids
-- exposing other users' behavior.
create policy "authenticated users can log their own interactions" on public.user_interactions
  for insert with check (auth.uid() = user_id or user_id is null);

-- ---- NOTIFICATIONS ----------------------------------------------------
create policy "users see only their own notifications" on public.notifications
  for select using (auth.uid() = recipient_id);
create policy "users can mark their own notifications read" on public.notifications
  for update using (auth.uid() = recipient_id);
-- No insert policy for regular users — every notification is created by a
-- security-definer trigger (see schema.sql), which bypasses RLS. A user
-- can never insert a fake notification claiming to be from someone else.

-- ---- MODERATION -------------------------------------------------------
create policy "users can file their own reports" on public.reports
  for insert with check (auth.uid() = reporter_id);
create policy "users can see their own filed reports" on public.reports
  for select using (auth.uid() = reporter_id);

create policy "users manage their own blocks" on public.blocks
  for all using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);
create policy "users manage their own mutes" on public.mutes
  for all using (auth.uid() = muter_id) with check (auth.uid() = muter_id);

-- ---- VIDEO CALLS ------------------------------------------------------
create policy "participants can read their call invites" on public.call_invites
  for select using (auth.uid() = caller_id or auth.uid() = callee_id);
create policy "users can create a call as the caller" on public.call_invites
  for insert with check (auth.uid() = caller_id);
create policy "participants can update call status" on public.call_invites
  for update using (auth.uid() = caller_id or auth.uid() = callee_id);
