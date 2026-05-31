"use client";

import { useRef, useState } from "react";

type Status = "Halal" | "Doubtful" | "Haram";

type ScanResult = {
  status: Status;
  confidence: "high" | "medium" | "low";
  reason: string;
  flaggedIngredients: string[];
};

// Visual mapping shared by the status badge and the legend.
const STATUS_STYLES: Record<Status, { color: string; emoji: string }> = {
  Halal: { color: "bg-green-100 text-green-700", emoji: "✅" },
  Doubtful: { color: "bg-yellow-100 text-yellow-700", emoji: "⚠️" },
  Haram: { color: "bg-red-100 text-red-700", emoji: "❌" },
};

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export default function ScannerPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);

  // Read a File as a data URL (base64) string.
  function readAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read the image file."));
      reader.readAsDataURL(file);
    });
  }

  async function handleFile(file: File) {
    setError(null);
    setResult(null);

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image is too large (max 10MB).");
      return;
    }

    let dataUrl: string;
    try {
      dataUrl = await readAsDataURL(file);
    } catch {
      setError("Could not read that image. Please try another file.");
      return;
    }
    setPreview(dataUrl);

    // Strip the "data:image/...;base64," prefix before sending.
    const imageBase64 = dataUrl.split(",")[1] ?? "";
    setLoading(true);
    try {
      const res = await fetch("/api/scanner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mediaType: file.type }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Scan failed. Please try again.");
        return;
      }
      setResult(data as ScanResult);
    } catch {
      setError("Network error — could not reach the scanner. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so selecting the same file again re-triggers onChange.
    e.target.value = "";
  }

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
          {preview ? (
            <img
              src={preview}
              alt="Selected food label or menu"
              className="max-h-48 w-full rounded-lg object-contain"
            />
          ) : (
            <span className="text-5xl">📷</span>
          )}
          <div>
            <p className="font-medium text-[--color-text]">Upload a food label or menu</p>
            <p className="mt-1 text-sm text-[--color-text-muted]">PNG, JPG up to 10MB</p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {preview ? "Choose Another" : "Choose Image"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onInputChange}
            className="hidden"
          />
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        </div>

        {/* Result area */}
        <div className="rounded-xl border border-[--color-border] bg-[--color-surface] p-5">
          <h2 className="mb-4 font-semibold text-[--color-text]">Scan Result</h2>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-[--color-border] border-t-primary-500" />
              <p className="text-sm text-[--color-text-muted]">Analyzing…</p>
            </div>
          ) : result ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <span
                  className={`rounded-full px-4 py-1.5 text-base font-semibold ${STATUS_STYLES[result.status].color}`}
                >
                  {STATUS_STYLES[result.status].emoji} {result.status}
                </span>
              </div>
              <p className="text-sm text-[--color-text]">{result.reason}</p>
              <p className="text-xs text-[--color-text-muted] capitalize">
                Confidence: {result.confidence}
              </p>
              {result.flaggedIngredients.length > 0 && (
                <div className="text-sm">
                  <p className="font-medium text-[--color-text]">Flagged:</p>
                  <ul className="mt-1 list-disc pl-5 text-[--color-text-muted]">
                    {result.flaggedIngredients.map((ing) => (
                      <li key={ing}>{ing}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-3xl">
                ?
              </div>
              <p className="text-sm text-[--color-text-muted]">
                Upload an image to see the<br />halal status analysis
              </p>
            </div>
          )}

          {/* Status legend */}
          <div className="mt-4 space-y-2 border-t border-[--color-border] pt-4">
            {(["Halal", "Doubtful", "Haram"] as Status[]).map((status) => (
              <div key={status} className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status].color}`}>
                  {STATUS_STYLES[status].emoji} {status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-[--color-text-muted]">
        Powered by Claude Vision AI · Results are for guidance only — always verify with certified halal sources
      </p>
    </div>
  );
}
