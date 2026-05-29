import { AppNav } from "@/components/layout/app-nav";
import { Header } from "@/components/layout/header";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-28">
        {children}
      </main>
      <AppNav />
    </>
  );
}
