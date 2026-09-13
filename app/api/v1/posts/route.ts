import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { extractHashtags } from "@/lib/utils";

const mediaSchema = z.object({
  type: z.enum(["image", "video"]),
  url: z.string().url(),
  thumbnail_url: z.string().url().nullable().optional(),
  detail_url: z.string().url().nullable().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  duration: z.number().nullable().optional()
});

const createPostSchema = z.object({
  type: z.enum(["photo", "carousel", "article", "video"]),
  title: z.string().trim().max(150).nullable().optional(),
  caption: z.string().trim().max(3000).default(""),
  category_id: z.string().uuid().nullable().optional(),
  location: z.string().trim().max(100).nullable().optional(),
  visibility: z.enum(["public", "followers", "private"]).default("public"),
  media: z.array(mediaSchema).max(10).default([])
});

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createPostSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid post" }, { status: 400 });
  }

  const { type, title, caption, category_id, location, visibility, media } = parsed.data;

  if (type !== "article" && media.length === 0) {
    return NextResponse.json({ error: "Add at least one photo or video" }, { status: 400 });
  }
  if (type === "article" && !caption.trim() && !title?.trim()) {
    return NextResponse.json({ error: "Write something first" }, { status: 400 });
  }

  const { data: post, error: postError } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      type,
      title: title || null,
      caption,
      category_id: category_id || null,
      location: location || null,
      visibility
    })
    .select()
    .single();

  if (postError || !post) {
    return NextResponse.json({ error: postError?.message ?? "Failed to create post" }, { status: 500 });
  }

  const tags = extractHashtags(caption + " " + (title ?? ""));

  const [mediaResult] = await Promise.all([
    media.length > 0
      ? supabase
          .from("post_media")
          .insert(media.map((m, i) => ({ ...m, post_id: post.id, sort_order: i })))
          .select()
      : Promise.resolve({ data: [] as any[], error: null as any }),
    tags.length > 0
      ? supabase.rpc("process_post_hashtags", { p_post_id: post.id, p_tags: tags })
      : Promise.resolve()
  ]);

  if (mediaResult.error) {
    return NextResponse.json({ error: mediaResult.error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, post, media: mediaResult.data ?? [] }, { status: 201 });
}
