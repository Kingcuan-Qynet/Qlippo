import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RootPage({
  searchParams
}: {
  searchParams: { code?: string; next?: string };
}) {
  const supabase = createClient();

  if (searchParams.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(searchParams.code);
    if (error) redirect("/login");
    redirect(searchParams.next || "/feed");
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  redirect(user ? "/feed" : "/login");
}
