"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Compass, Bell, Bookmark, User, LogOut, Plus, Home } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const links = [
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/saved", label: "Saved", icon: Bookmark }
];

export function Sidebar({ username }: { username?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between border-r px-3 py-4 dark:border-slate-800 md:flex">
      <div>
        <Link href="/feed" className="mb-4 block px-3 text-xl font-bold text-brand-600">
          {process.env.NEXT_PUBLIC_SITE_NAME ?? "Qlippo"}
        </Link>
        <nav className="space-y-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-full px-3 py-2 text-base transition hover:bg-slate-100 dark:hover:bg-slate-800",
                  active && "font-semibold text-brand-600"
                )}
              >
                <Icon size={22} />
                {label}
              </Link>
            );
          })}
          {username && (
            <Link
              href={`/${username}`}
              className={cn(
                "flex items-center gap-3 rounded-full px-3 py-2 text-base transition hover:bg-slate-100 dark:hover:bg-slate-800",
                (pathname === `/${username}`) && "font-semibold text-brand-600"
              )}
            >
              <User size={22} />
              Profile
            </Link>
          )}
        </nav>

        <Link
          href="/create"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700"
        >
          <Plus size={18} />
          Create
        </Link>
      </div>

      <div className="space-y-1 px-1">
        <ThemeToggle />
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-full px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <LogOut size={18} />
          Log out
        </button>
      </div>
    </aside>
  );
}
