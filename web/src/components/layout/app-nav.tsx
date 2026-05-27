"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/planner",
    label: "Planner",
    icon: "🗺️",
  },
  {
    href: "/prayer",
    label: "Pray",
    icon: "🕌",
  },
  {
    href: "/map",
    label: "Eat",
    icon: "🍽️",
  },
  {
    href: "/scanner",
    label: "Tour",
    icon: "🧳",
  },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 border-b border-[--color-border] bg-[--color-background]/80 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-14 items-center gap-1">
          {/* Logo */}
          <Link
            href="/"
            className="mr-4 flex items-center gap-2 font-semibold text-[--color-text]"
          >
            <span className="text-xl">🌙</span>
            <span className="text-primary-600 font-bold">HalalLog</span>
          </Link>

          {/* Tab items */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : "text-[--color-text-muted] hover:bg-[--color-surface] hover:text-[--color-text]",
                  ].join(" ")}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
