"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PostMedia, PostType } from "@/types/database.types";

export function MediaViewer({ type, media }: { type: PostType; media: PostMedia[] }) {
  const [index, setIndex] = useState(0);

  if (media.length === 0) return null;

  if (type === "video") {
    const m = media[0];
    return (
      <video
        src={m.detail_url ?? m.url}
        controls
        className="max-h-[70vh] w-full bg-black object-contain"
        poster={m.thumbnail_url ?? undefined}
      />
    );
  }

  const current = media[index];

  return (
    <div className="relative bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current.detail_url ?? current.url}
        alt=""
        className="max-h-[70vh] w-full object-contain"
      />

      {media.length > 1 && (
        <>
          {index > 0 && (
            <button
              onClick={() => setIndex((i) => i - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {index < media.length - 1 && (
            <button
              onClick={() => setIndex((i) => i + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white"
            >
              <ChevronRight size={20} />
            </button>
          )}
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {media.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${i === index ? "bg-white" : "bg-white/40"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
