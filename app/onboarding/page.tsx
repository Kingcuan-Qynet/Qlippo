"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/types/database.types";

export default function OnboardingPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("categories").select("*").order("sort_order");
      setCategories(data ?? []);
    })();
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleContinue() {
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (user && selected.size > 0) {
      const rows = Array.from(selected).map((category_id) => ({ user_id: user.id, category_id, weight: 1.0 }));
      await supabase.from("user_interests").upsert(rows);
    }

    router.push("/feed");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="w-full max-w-lg">
        <h1 className="text-center text-2xl font-bold">What are you into?</h1>
        <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
          Pick a few — this helps shape your For You feed. You can change this later in Settings.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {categories.map((c) => {
            const isSelected = selected.has(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  isSelected
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-300 text-slate-700 hover:border-brand-400 dark:border-slate-700 dark:text-slate-300"
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleContinue}
          disabled={saving}
          className="mt-8 w-full rounded-full bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? "Setting up…" : selected.size > 0 ? `Continue with ${selected.size} picked` : "Skip for now"}
        </button>
      </div>
    </div>
  );
}
