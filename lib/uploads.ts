export type UploadedMedia = {
  type: "image" | "video";
  url: string; // "feed" size — the default the app renders in lists
  thumbnail_url: string | null;
  detail_url: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
};

/**
 * Resizes an image client-side using a <canvas>, so we can upload three
 * purpose-sized variants (thumbnail/feed/detail) without needing a paid
 * image-transformation service. Skips upscaling — if the source is
 * already smaller than `maxWidth`, it's used as-is.
 */
function resizeImage(file: File, maxWidth: number, quality = 0.82): Promise<{ blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.naturalWidth);
      const width = Math.round(img.naturalWidth * scale);
      const height = Math.round(img.naturalHeight * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            reject(new Error("Failed to encode image"));
            return;
          }
          resolve({ blob, width, height });
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };
    img.src = objectUrl;
  });
}

function readVideoMeta(file: File): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({ width: video.videoWidth, height: video.videoHeight, duration: Math.round(video.duration) });
      URL.revokeObjectURL(url);
    };
    video.onerror = () => resolve({ width: 0, height: 0, duration: 0 });
    video.src = url;
  });
}

/** Asks the server for a presigned URL, then PUTs the blob straight to R2. */
async function putToR2(blob: Blob, filename: string, contentType: string): Promise<string> {
  const presignRes = await fetch("/api/v1/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, contentType })
  });
  const presign = await presignRes.json();
  if (!presignRes.ok) throw new Error(presign.error ?? "Could not get upload permission");

  const uploadRes = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      // Must match the CacheControl the server signed the URL with
      // exactly, or R2 rejects the request as a signature mismatch.
      "Cache-Control": "public, max-age=31536000, immutable"
    },
    body: blob
  });
  if (!uploadRes.ok) throw new Error("Upload to storage failed");

  return presign.publicUrl as string;
}

/**
 * Uploads one file. For images: generates and uploads thumbnail (320w),
 * feed (1080w), and full-size "detail" variants in parallel to R2 — three
 * objects per image, all referencing the same logical photo.
 *
 * For video: uploads the original file straight to R2, as-is — no
 * transcoding, no adaptive quality, no auto-generated thumbnail (that's
 * what Cloudflare Stream would add, deliberately deferred: Stream has no
 * free tier and bills a minimum ~$5/month from the first video stored,
 * which isn't worth taking on before this platform has real users. See
 * README's "plug-and-play slots" table — swapping this one function's
 * video branch for a Stream upload later doesn't require touching
 * anything else in the app).
 */
export async function uploadMedia(file: File): Promise<UploadedMedia> {
  const isVideo = file.type.startsWith("video/");

  if (isVideo) {
    const meta = await readVideoMeta(file);
    const url = await putToR2(file, file.name, file.type || "video/mp4");
    return {
      type: "video",
      url,
      thumbnail_url: null,
      detail_url: url,
      width: meta.width || null,
      height: meta.height || null,
      duration: meta.duration || null
    };
  }

  const [thumb, feed, detail] = await Promise.all([
    resizeImage(file, 320, 0.7),
    resizeImage(file, 1080, 0.82),
    resizeImage(file, 2048, 0.88) // full-size cap — no need to keep e.g. a 12MP original around
  ]);

  const baseName = file.name.replace(/\.[^.]+$/, "");
  const [thumbnailUrl, feedUrl, detailUrl] = await Promise.all([
    putToR2(thumb.blob, `${baseName}-thumb.jpg`, "image/jpeg"),
    putToR2(feed.blob, `${baseName}-feed.jpg`, "image/jpeg"),
    putToR2(detail.blob, `${baseName}-detail.jpg`, "image/jpeg")
  ]);

  return {
    type: "image",
    url: feedUrl,
    thumbnail_url: thumbnailUrl,
    detail_url: detailUrl,
    width: feed.width || null,
    height: feed.height || null,
    duration: null
  };
}
