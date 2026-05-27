import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Halal Scanner",
};

export default function ScannerPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[--color-text]">Halal Scanner</h1>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          Scan food labels or menus to check halal status instantly
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Upload area */}
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-[--color-border] bg-[--color-surface] p-10 text-center">
          <span className="text-5xl">📷</span>
          <div>
            <p className="font-medium text-[--color-text]">Upload a food label or menu</p>
            <p className="mt-1 text-sm text-[--color-text-muted]">PNG, JPG up to 10MB</p>
          </div>
          <button className="rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600">
            Choose Image
          </button>
        </div>

        {/* Result area */}
        <div className="rounded-xl border border-[--color-border] bg-[--color-surface] p-5">
          <h2 className="mb-4 font-semibold text-[--color-text]">Scan Result</h2>
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-3xl">
              ?
            </div>
            <p className="text-sm text-[--color-text-muted]">
              Upload an image to see the<br />halal status analysis
            </p>
          </div>

          {/* Status legend */}
          <div className="mt-4 space-y-2 border-t border-[--color-border] pt-4">
            {[
              { status: "Halal", color: "bg-green-100 text-green-700", emoji: "✅" },
              { status: "Doubtful", color: "bg-yellow-100 text-yellow-700", emoji: "⚠️" },
              { status: "Haram", color: "bg-red-100 text-red-700", emoji: "❌" },
            ].map((item) => (
              <div key={item.status} className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${item.color}`}>
                  {item.emoji} {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-[--color-text-muted]">
        Powered by Claude Vision AI · Results are for guidance only — always verify with certified sources
      </p>
    </div>
  );
}
