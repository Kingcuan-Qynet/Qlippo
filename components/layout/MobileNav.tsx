"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Plus, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNav({ username }: { username?: string | null }) {
  const pathname = usePathname();

  const links = [
    { href: "/feed", label: "Feed", icon: Home },
    { href: "/explore", label: "Explore", icon: Compass },
    { href: "/create", label: "", icon: Plus, isCreate: true },
    { href: "/notifications", label: "Alerts", icon: Bell },
    { href: username ? `/${username}` : "/feed", label: "You", icon: User }
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex items-center border-t bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 md:hidden">
      {links.map(({ href, label, icon: Icon, isCreate }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        if (isCreate) {
          return (
            <Link key={href} href={href} className="flex flex-1 flex-col items-center py-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white">
                <Icon size={20} />
              </span>
            </Link>
          );
        }
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] text-slate-500 dark:text-slate-400",
              active && "text-brand-600 dark:text-brand-400"
            )}
          >
            <Icon size={22} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
