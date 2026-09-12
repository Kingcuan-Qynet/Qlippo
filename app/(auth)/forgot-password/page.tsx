"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/settings`
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-3 text-center">
        <h2 className="text-lg font-semibold">Check your email</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          If an account exists for <strong>{email}</strong>, a reset link is on its way.
        </p>
        <Link href="/login" className="inline-block text-sm font-medium text-brand-600 hover:underline">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold">Reset your password</h2>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? "Sending…" : "Send reset link"}
      </button>
      <p className="text-center text-sm">
        <Link href="/login" className="text-slate-500 hover:underline dark:text-slate-400">
          Back to login
        </Link>
      </p>
    </form>
  );
}
