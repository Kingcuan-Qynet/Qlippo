import { NextResponse } from "next/server";
import { z } from "zod";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@/lib/supabase/server";
import { getR2Client, R2_BUCKET, r2PublicUrl } from "@/lib/r2";

const bodySchema = z.object({
  filename: z.string().min(1).max(200),
  contentType: z.string().min(1).max(100)
});

/**
 * POST /api/v1/uploads/presign
 * Body: { filename, contentType }
 * Returns: { uploadUrl, publicUrl, key }
 *
 * This is the ONLY thing the server does for an upload: it decides the
 * storage key (always prefixed with the authenticated user's own id, so a
 * user can never get a presigned URL for someone else's folder — R2 has
 * no per-request RLS the way Supabase Storage does, so this check has to
 * happen here instead) and hands back a short-lived signed URL. The
 * browser then PUTs the file bytes directly to R2 — they never pass
 * through this Next.js server.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const safeName = parsed.data.filename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const key = `${user.id}/${Date.now()}-${safeName}`;

  try {
    const client = getR2Client();
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: parsed.data.contentType,
      // Every key is unique (timestamp-based), so a file at this URL never
      // changes — safe to tell Cloudflare's CDN to cache it for a full
      // year without ever revalidating. This is what actually makes
      // "loads instantly for every user after the first" true, rather
      // than just being true by accident of R2 sitting behind Cloudflare.
      CacheControl: "public, max-age=31536000, immutable"
    });
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 }); // 5 minutes

    return NextResponse.json({ uploadUrl, publicUrl: r2PublicUrl(key), key });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create upload URL" },
      { status: 500 }
    );
  }
}
