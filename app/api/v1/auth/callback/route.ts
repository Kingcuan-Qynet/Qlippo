import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | null, fallback = "/onboarding") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const login = new URL("/login", url.origin);
    login.searchParams.set("error", "verification_failed");
    return NextResponse.redirect(login);
  }

  // exchangeCodeForSession writes the Supabase auth cookies through the
  // server client. Redirect only after the exchange succeeds so protected
  // pages receive a valid session on their first request.
  return NextResponse.redirect(new URL(next, url.origin));
}
