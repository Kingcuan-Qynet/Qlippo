import { S3Client } from "@aws-sdk/client-s3";

/**
 * R2 speaks the S3 API, so the standard AWS SDK works against it — just
 * point the endpoint at your R2 account instead of AWS. This client is
 * server-only (uses the R2 secret key) and is never imported into a
 * Client Component.
 */
export function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
    }
  });
}

export const R2_BUCKET = process.env.R2_BUCKET_NAME || "qlippo-media";

/** Builds the public URL for a stored object from its key. */
export function r2PublicUrl(key: string): string {
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (!base) {
    throw new Error(
      "NEXT_PUBLIC_R2_PUBLIC_URL is not set. Connect a custom domain (or use the R2.dev dev URL for local testing) and add it to your environment variables."
    );
  }
  return `${base.replace(/\/$/, "")}/${key}`;
}
