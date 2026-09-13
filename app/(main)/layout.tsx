import { redirect } from "next/navigation";
import { getAuthUser, getCurrentProfile } from "@/lib/supabase/session";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { IncomingCallListener } from "@/components/calls/IncomingCallListener";

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
