# Qlippo — Lemon8-style, Light MVP

A photo/carousel/article/video sharing platform (Next.js 14 + Supabase),
built as a **deliberately light MVP** that can absorb real scale later
without a rewrite — not a monolith that will need replacing.

## Why this isn't the "hundreds of millions of users" architecture

The original concept called for Redis, Cloudflare Queues, ClickHouse,
Meilisearch, a video transcode pipeline, and a multi-service monorepo —
infrastructure sized for a platform with real, proven traffic. This
project has zero users yet. Building for that scale now would mean:
weeks of infrastructure work before a single post exists, real monthly
cost with no revenue to offset it, and far more surface area for bugs —
all to solve a problem ("too much traffic") this project doesn't have.

Instagram ran on a single Django + Postgres server through its first
years of real growth. Architecture should follow proven traffic, not
precede it. So this MVP uses **one stack (Next.js + Supabase)**, but every
piece that would need to scale later is already isolated behind a clean
boundary — see "Where the plug-and-play slots are" below.

## What's built

- **Auth** (Supabase Auth) + **onboarding** (pick interest categories → seeds personalization)
- **Posts**: photo, carousel (multi-image), article (long-form text), video — one schema, one API
- **Feed**: For You / Following / Trending tabs, filterable by category
- **Engagement**: likes, saves, collections (folders), threaded comments with replies
- **Profile**: posts grid, follow/unfollow, edit profile (avatar + cover upload)
- **Explore**: search users/posts/hashtags, trending grid when idle
- **Notifications**: like, comment, follow, reply
- **1:1 video calls**: WebRTC, peer-to-peer, **nothing is ever recorded or stored** —
  signaling rides on a Supabase Realtime channel scoped to each call
- **Dark mode**, mobile bottom nav + prominent Create button, desktop sidebar

## Where the plug-and-play slots are

| Future heavy piece | Where it plugs in today |
|---|---|
| **Redis cache** | `/api/v1/feed` and `get_for_you_feed()`/`get_trending_feed()` are the only two places feed data is produced. Add a cache read/write around those calls — nothing else in the app needs to change. |
| **Real ranking model** | `user_interactions` has been logging every view/like/comment/save/skip since day one. `get_for_you_feed()` is a SQL function specifically so its internals can be swapped for a model that reads that table, without touching the API route that calls it. |
| **Meilisearch/Typesense** | `/api/v1/search` is the only search entry point. Swap its Postgres `ilike` queries for Meilisearch calls; the response shape stays the same. |
| **Background queue** | Hashtag processing and notification creation are already isolated single-purpose functions/triggers — the natural units to move into a queue worker later. |
| **Video transcoding / HLS** | `post_media` already has `url` / `thumbnail_url` / `detail_url` as separate fields. A transcode pipeline just needs to populate them differently — the schema and every query already expects three variants. |
| **TURN server for calls** | `lib/webrtc.ts` reads `NEXT_PUBLIC_ICE_SERVERS` from one env var. Add a TURN server (Cloudflare Calls, Twilio, metered.ca) to that list — no code changes. |
| **Live streaming** | Deferred entirely (per your call) — but `call_invites` + the Realtime signaling pattern already built for 1:1 calls is the same foundation an SFU-based live broadcast would extend. |

## Setup

### 1. Create a Supabase project
Run these SQL files in the SQL Editor, **in this exact order**:
1. `supabase/schema.sql`
2. `supabase/policies.sql`
3. `supabase/personalization.sql`

### 2. Set up Cloudflare R2 (media storage)
Photos, videos, avatars, and covers are stored in R2, not Supabase Storage —
**zero egress fees**, which matters a lot for a photo/video platform once
it has real traffic.
1. Cloudflare dashboard → R2 → Create bucket.
2. R2 → Manage API Tokens → Create API Token, permission **Object Read & Write**, scoped to that bucket. Copy the Account ID + Access Key ID + Secret.
3. Connect a custom domain to the bucket (Settings → Public Access → Connect Domain) — e.g. `media.yourdomain.com`. For local testing only, you can instead enable the bucket's `.r2.dev` URL, but Cloudflare explicitly says that's rate-limited and not for production.
4. Put those values in `.env.local` (see `.env.example` — `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `NEXT_PUBLIC_R2_PUBLIC_URL`).

Uploads work like this: the browser asks `/api/v1/uploads/presign` for a
short-lived signed URL (the server decides the storage path, always
prefixed with your own user id — this is what stops one user writing into
another's folder, since R2 has no per-request RLS the way Supabase Storage
does), then the browser PUTs the file bytes straight to R2. The file never
passes through the Next.js server.

### 3. Environment variables
```bash
cp .env.example .env.local
```
Fill in Supabase + R2 credentials from steps 1–2. `NEXT_PUBLIC_ICE_SERVERS`
already has free public STUN servers — no signup needed to test calls.

### 4. Run it
```bash
npm install
npm run dev
```

> This environment couldn't reach npm's registry to actually install
> dependencies or run a build — every file was written carefully against
> known-stable Next.js 14 / Supabase v2 / WebRTC APIs and syntax-checked,
> but **not** compiled end-to-end here. Run `npm install && npm run build`
> locally first and fix anything TypeScript flags before deploying — it
> should be minor if anything.

## Deploying

Same pattern as before: push to GitHub, import in Vercel, set env vars,
deploy. **Pin the Vercel function region to match wherever you create
this Supabase project** (Project Settings → Functions → Function Region)
— this was the single biggest performance lever on the QYNET project and
applies here too.

## A note on video calls specifically

- No recording feature exists **by design** — this isn't a missing
  feature, it's the reason "no storage used" is true. If you want call
  recording later, that's a deliberate, separate feature to build (and
  it *would* need storage + consent handling).
- Group calls aren't built (you chose 1:1 first). Extending to group
  calls means moving from a single peer connection to either a mesh of
  connections (fine for ~4 people) or an SFU service (needed beyond
  that) — a bigger step than 1:1, worth doing once 1:1 is proven useful.
