import { redirect } from "next/navigation";
import { getAuthUser, getCurrentProfile } from "@/lib/supabase/session";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { IncomingCallListener } from "@/components/calls/IncomingCallListener";

// Force dynamic rendering — every route under (main) depends on the
// caller's session/cookies. Without this, an auth redirect response can
// get cached (edge/CDN) and served to later requests regardless of who's
// actually logged in.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const profile = await getCurrentProfile(user.id);
  if (!profile) redirect("/login");

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl">
      <Sidebar username={profile.username} />
      <main className="min-h-screen w-full flex-1 border-r pb-16 dark:border-slate-800 md:pb-0">{children}</main>
      <MobileNav username={profile.username} />
      <IncomingCallListener currentUserId={user.id} />
    </div>
  );
}
