"use client";

import clsx from "clsx";
import { Briefcase, CalendarDays, Home, Plus, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/offres", label: "Offres", icon: Briefcase },
  { href: "/analyser", label: "Analyser", icon: Plus, primary: true },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/profil", label: "Profil", icon: User },
];

/** Barre d'onglets en bas (convention mobile iOS / Material), rail vertical à gauche sur grand écran. */
export default function TabBar() {
  const path = usePathname();
  if (path === "/login") return null;
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 items-end border-t border-line bg-surface/95 px-1.5 pb-[calc(6px+env(safe-area-inset-bottom))] pt-1.5 backdrop-blur
                 lg:inset-y-0 lg:right-auto lg:w-[92px] lg:grid-cols-1 lg:content-start lg:auto-rows-[76px] lg:border-r lg:border-t-0 lg:pt-20"
    >
      {TABS.map(({ href, label, icon: Icon, primary }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "flex min-h-[52px] flex-col items-center justify-center gap-1 text-[11px] font-semibold",
              active ? "text-amber" : "text-grey hover:text-ink",
            )}
          >
            {primary ? (
              <span
                className={clsx(
                  "-mt-6 grid h-[52px] w-[52px] place-items-center rounded-full shadow-[0_6px_18px_rgba(75,30,143,.55),0_0_0_4px_#0B0910] lg:mt-0",
                  active ? "bg-amber text-[#1a1205]" : "bg-purple text-ink",
                )}
              >
                <Icon size={26} strokeWidth={2.4} aria-hidden />
              </span>
            ) : (
              <Icon size={24} strokeWidth={1.9} aria-hidden />
            )}
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
