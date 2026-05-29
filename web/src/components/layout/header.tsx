import Link from "next/link";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[--color-border]/70 bg-[--color-background]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">🌙</span>
          <span className="text-lg font-semibold tracking-tight text-primary-700">HalalLog</span>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
