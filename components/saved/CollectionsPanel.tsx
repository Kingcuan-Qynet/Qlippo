"use client";

import { useEffect, useState } from "react";
import { FolderPlus, Folder } from "lucide-react";
import type { Collection } from "@/types/database.types";

export function CollectionsPanel() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/v1/collections");
      const json = await res.json();
      if (res.ok) setCollections(json.collections);
    })();
  }, []);

  async function handleCreate() {
    if (!name.trim()) return;
    const res = await fetch("/api/v1/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() })
    });
    const json = await res.json();
    if (res.ok) {
      setCollections((prev) => [json.collection, ...prev]);
      setName("");
      setCreating(false);
    }
  }

  return (
    <div className="border-b p-4 dark:border-slate-800">
      <h2 className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">Collections</h2>
      <div className="flex gap-3 overflow-x-auto">
        {collections.map((c) => (
          <div
            key={c.id}
            className="flex w-24 shrink-0 flex-col items-center gap-1 rounded-xl border p-3 dark:border-slate-800"
          >
            <Folder size={24} className="text-brand-600" />
            <span className="w-full truncate text-center text-xs">{c.name}</span>
          </div>
        ))}

        {creating ? (
          <div className="flex w-32 shrink-0 flex-col gap-1">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Name"
              className="rounded-lg border px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
            />
            <button onClick={handleCreate} className="text-xs font-medium text-brand-600">
              Create
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="flex w-24 shrink-0 flex-col items-center gap-1 rounded-xl border border-dashed p-3 text-slate-400 dark:border-slate-700"
          >
            <FolderPlus size={24} />
            <span className="text-xs">New</span>
          </button>
        )}
      </div>
    </div>
  );
}
