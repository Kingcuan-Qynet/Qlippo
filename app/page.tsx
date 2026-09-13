import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | undefined, fallback = "/feed") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export default async function RootPage({ searchParams }: { searchParams: { code?: string; next?: string } }) {
  const supabase = createClient();

  // Backward compatibility for old Supabase links that point at /.
  // New confirmation links use /api/v1/auth/callback.
  if (searchParams.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(searchParams.code);
    if (error) redirect("/login?error=verification_failed");
    redirect(safeNext(searchParams.next));
  }

  const { data: { user } } = await supabase.auth.getUser();
  redirect(user ? "/feed" : "/login");
}
