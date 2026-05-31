import { AppNav } from "@/components/layout/app-nav";
import { Header } from "@/components/layout/header";
import { MapsProvider } from "@/components/maps/maps-provider";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-28">
        <MapsProvider>{children}</MapsProvider>
      </main>
      <AppNav />
    </>
  );
}
