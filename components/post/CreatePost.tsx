"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, Images, FileText, Video as VideoIcon, X, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { uploadMedia, type UploadedMedia } from "@/lib/uploads";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/database.types";

type PostType = "photo" | "carousel" | "article" | "video";

const TYPE_OPTIONS: { type: PostType; label: string; icon: typeof ImageIcon; accept: string; multiple: boolean }[] = [
  { type: "photo", label: "Photo", icon: ImageIcon, accept: "image/*", multiple: false },
  { type: "carousel", label: "Carousel", icon: Images, accept: "image/*", multiple: true },
  { type: "article", label: "Article", icon: FileText, accept: "", multiple: false },
  { type: "video", label: "Video", icon: VideoIcon, accept: "video/*", multiple: false }
];

export function CreatePost({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<PostType | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [location, setLocation] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function selectType(t: PostType) {
    setType(t);
    setFiles([]);
    setPreviews([]);
    if (t !== "article") {
      setTimeout(() => fileInputRef.current?.click(), 0);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;
    const max = type === "carousel" ? 10 : 1;
    const next = type === "carousel" ? [...files, ...selected].slice(0, max) : selected.slice(0, 1);
    setFiles(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
    e.target.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!type) return;
    setError(null);

    if (type !== "article" && files.length === 0) {
      setError("Add at least one photo or video.");
      return;
    }
    if (type === "article" && !caption.trim() && !title.trim()) {
      setError("Write something first.");
      return;
    }

    setUploading(true);
    try {
      const uploaded: UploadedMedia[] =
        files.length > 0 ? await Promise.all(files.map((f) => uploadMedia(f))) : [];

      const res = await fetch("/api/v1/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: title.trim() || null,
          caption: caption.trim(),
          category_id: categoryId,
          location: location.trim() || null,
          visibility: "public",
          media: uploaded
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to post");

      router.push(`/p/${json.post.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setUploading(false);
    }
  }

  if (!type) {
    return (
      <div className="p-6">
        <h1 className="mb-6 text-xl font-bold">What do you want to share?</h1>
        <div className="grid grid-cols-2 gap-3">
          {TYPE_OPTIONS.map(({ type: t, label, icon: Icon }) => (
            <button
              key={t}
              onClick={() => selectType(t)}
              className="flex flex-col items-center gap-2 rounded-xl2 border p-6 hover:border-brand-500 hover:bg-brand-50 dark:border-slate-800 dark:hover:bg-slate-900"
            >
              <Icon size={28} className="text-brand-600" />
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const typeConfig = TYPE_OPTIONS.find((o) => o.type === type)!;

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => setType(null)} className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Change type
        </button>
        <span className="text-sm font-semibold text-brand-600">{typeConfig.label}</span>
      </div>

      {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {type !== "article" && (
        <div className="mb-4">
          {previews.length > 0 ? (
            <div className={cn("grid gap-2", previews.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
              {previews.map((src, i) => (
                <div key={src} className="relative">
                  {type === "video" ? (
                    <video src={src} controls className="max-h-72 w-full rounded-xl bg-black object-contain" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt="" className="max-h-72 w-full rounded-xl object-cover" />
                  )}
                  <button
                    onClick={() => removeFile(i)}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {type === "carousel" && files.length < 10 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-full min-h-[120px] items-center justify-center rounded-xl border border-dashed text-sm text-slate-400 dark:border-slate-700"
                >
                  + Add more
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex h-48 w-full items-center justify-center rounded-xl border border-dashed text-slate-400 dark:border-slate-700"
            >
              Tap to select {type === "video" ? "a video" : "photo(s)"}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={typeConfig.accept}
            multiple={typeConfig.multiple}
            hidden
            onChange={handleFileSelect}
          />
        </div>
      )}

      {(type === "article" || type === "carousel") && (
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 150))}
          placeholder="Add a title"
          className="mb-3 w-full border-0 border-b bg-transparent pb-2 text-lg font-semibold placeholder:text-slate-400 focus:outline-none dark:border-slate-800"
        />
      )}

      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value.slice(0, 3000))}
        placeholder={type === "article" ? "Write your story…" : "Write a caption…"}
        rows={type === "article" ? 10 : 4}
        className="w-full resize-none border-0 bg-transparent text-base placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
      />

      <div className="mt-4 flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategoryId(categoryId === c.id ? null : c.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              categoryId === c.id
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300"
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 border-t pt-4 dark:border-slate-800">
        <MapPin size={16} className="text-slate-400" />
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value.slice(0, 100))}
          placeholder="Add location (optional)"
          className="flex-1 border-0 bg-transparent text-sm placeholder:text-slate-400 focus:outline-none"
        />
      </div>

      <Button onClick={handleSubmit} disabled={uploading} className="mt-6 w-full justify-center">
        {uploading ? "Posting…" : "Post"}
      </Button>
    </div>
  );
}
