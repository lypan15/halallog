import { AppNav } from "@/components/layout/app-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[--color-border] bg-[--color-background]/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌙</span>
            <span className="text-lg font-bold text-primary-700">HalalLog</span>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-28">
        {children}
      </main>
      <AppNav />
    </>
  );
}
