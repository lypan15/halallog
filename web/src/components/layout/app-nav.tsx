"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/planner",
    label: "Trips",
    icon: "🧳",
  },
  {
    href: "/map",
    label: "Eat",
    icon: "🍽️",
  },
  {
    href: "/scanner",
    label: "Scanner",
    icon: "📷",
    isCenter: true,
  },
  {
    href: "/prayer",
    label: "Pray",
    icon: "🕌",
  },
  {
    href: "/tour",
    label: "Tour",
    icon: "✨",
  },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[--color-border] bg-[--color-surface]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-20 w-full max-w-6xl items-end justify-between px-4 pb-3">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          if (item.isCenter) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative -mt-10 inline-flex flex-col items-center justify-center"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-[--color-background] bg-primary-600 text-2xl text-white shadow-lg transition-transform hover:scale-105">
                  {item.icon}
                </span>
                <span className="mt-1 text-xs font-semibold text-primary-700">{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "inline-flex min-w-14 flex-col items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-colors",
                isActive
                  ? "text-primary-700"
                  : "text-[--color-text-muted] hover:text-[--color-text]",
              ].join(" ")}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
