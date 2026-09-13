import { redirect } from "next/navigation";
import { getAuthUser, getCurrentProfile } from "@/lib/supabase/session";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";

export default async function SettingsPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const profile = await getCurrentProfile(user.id);
  if (!profile) redirect("/login");

  return (
    <div>
      <header className="sticky top-0 z-10 border-b bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <h1 className="text-lg font-bold">Settings</h1>
      </header>
      <div className="p-4">
        <ProfileEditForm profile={profile} email={user.email ?? ""} />
      </div>
    </div>
  );
}
