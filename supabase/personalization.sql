-- ============================================================================
-- FEED RANKING — For You + Trending
-- Run after schema.sql/policies.sql.
--
-- These are deliberately simple heuristics, not a real ML ranking system.
-- The point of wrapping them in a SQL function (rather than inlining the
-- logic in the app) is that later, when there's enough real traffic to
-- justify a proper ranking model (reading from user_interactions, cached
-- in Redis, whatever), you swap what's INSIDE these functions — the API
-- route calling them never has to change.
-- ============================================================================

-- "For You": recency decay × log-scaled engagement × interest-category
-- boost. A post from a category the viewer picked in onboarding (or has
-- engaged with before, if user_interests gets updated by future signal
-- processing) ranks higher; nothing here requires that data to exist —
-- posts with no matching interest just don't get the boost.
create or replace function public.get_for_you_feed(p_user_id uuid, p_limit integer default 20, p_before timestamptz default null)
returns setof public.posts
language sql
stable
as $$
  select p.*
  from public.posts p
  left join public.user_interests ui on ui.user_id = p_user_id and ui.category_id = p.category_id
  where p.status = 'published'
    and p.visibility = 'public'
    and (p_before is null or p.created_at < p_before)
  order by (
    exp(-extract(epoch from (now() - p.created_at)) / 172800.0) -- ~halves every 2 days
    * (1 + ln(1 + p.like_count + p.comment_count * 2 + p.save_count * 3))
    * (1 + coalesce(ui.weight, 0.3))
  ) desc, p.created_at desc
  limit p_limit;
$$;

grant execute on function public.get_for_you_feed(uuid, integer, timestamptz) to authenticated, anon;

-- "Trending": pure engagement within the last 7 days, no personalization.
-- Simple on purpose — this is the "what's hot right now" tab.
create or replace function public.get_trending_feed(p_limit integer default 20, p_before timestamptz default null)
returns setof public.posts
language sql
stable
as $$
  select *
  from public.posts
  where status = 'published'
    and visibility = 'public'
    and created_at > now() - interval '7 days'
    and (p_before is null or created_at < p_before)
  order by (like_count + comment_count * 2 + save_count * 3) desc, created_at desc
  limit p_limit;
$$;

grant execute on function public.get_trending_feed(integer, timestamptz) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Hashtag processing in one round trip (same pattern used successfully in
-- the QYNET project) instead of a query per hashtag.
-- ---------------------------------------------------------------------------
create or replace function public.process_post_hashtags(p_post_id uuid, p_tags text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_tags is null or array_length(p_tags, 1) is null then
    return;
  end if;

  insert into public.hashtags (tag, usage_count)
  select distinct tag, 1
  from unnest(p_tags) as tag
  on conflict (tag) do update set usage_count = public.hashtags.usage_count + 1;

  insert into public.post_hashtags (post_id, hashtag_id)
  select p_post_id, h.id
  from public.hashtags h
  where h.tag = any(p_tags)
  on conflict do nothing;
end;
$$;

grant execute on function public.process_post_hashtags(uuid, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Bumps a post's view_count. Any viewer can call this (it only touches
-- that one counter) — a direct UPDATE would be blocked by RLS for anyone
-- other than the post's author.
-- ---------------------------------------------------------------------------
create or replace function public.increment_post_views(p_post_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.posts set view_count = view_count + 1 where id = p_post_id;
$$;

grant execute on function public.increment_post_views(uuid) to authenticated, anon;
