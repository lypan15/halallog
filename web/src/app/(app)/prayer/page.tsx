"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  PRAYER_META,
  PRAYER_NAMES,
  PRAYER_TIMES,
  type PrayerName,
} from "@/constants/prayerTimes";
import { usePrayerStore } from "@/lib/prayer-store";

const PRESET_CHIPS = [5, 10, 15, 30] as const;

// ── Toggle ──────────────────────────────────────────────────────────────
function Toggle({
  value,
  onChange,
  disabled = false,
}: {
  value: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={onChange}
      disabled={disabled}
      className={[
        "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none",
        value && !disabled ? "bg-[#2d6a4f]" : "bg-[--color-border]",
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
      ].join(" ")}
    >
      <span
        className={[
          "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
          value ? "translate-x-5" : "translate-x-0",
        ].join(" ")}
      />
    </button>
  );
}

// ── Custom Minutes Popup ────────────────────────────────────────────────
function CustomMinutesPopup({
  prayerName,
  initialValue,
  onConfirm,
  onClose,
}: {
  prayerName: PrayerName;
  initialValue: number;
  onConfirm: (minutes: number) => void;
  onClose: () => void;
}) {
  const [raw, setRaw] = useState(String(initialValue));
  const num = parseInt(raw, 10);
  const valid = !isNaN(num) && num >= 1 && num <= 60;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-72 rounded-xl bg-[--color-surface] p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-1 text-center text-sm font-semibold text-[--color-text]">
          직접 입력
        </p>
        <p className="mb-4 text-center text-xs text-[--color-text-muted]">
          {PRAYER_META[prayerName].icon} {prayerName} 알림
        </p>

        <div className="flex items-center gap-2">
          <input
            type="number"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            min={1}
            max={60}
            autoFocus
            className="w-full rounded-lg border border-[--color-border] bg-[--color-background] px-3 py-2.5 text-center text-xl font-bold text-[--color-text] outline-none focus:border-[#2d6a4f]"
          />
          <span className="shrink-0 text-sm text-[--color-text-muted]">분 전</span>
        </div>

        {raw !== "" && !valid && (
          <p className="mt-1.5 text-center text-xs text-[#c4704a]">
            1–60 범위로 입력해주세요
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-[--color-border] py-2 text-sm text-[--color-text-muted] transition-colors hover:bg-[--color-background]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => valid && onConfirm(num)}
            disabled={!valid}
            className="flex-1 rounded-lg bg-[#2d6a4f] py-2 text-sm font-medium text-white transition-colors hover:bg-[#245a42] disabled:opacity-50"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────
export default function PrayerPage() {
  const [mounted, setMounted] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [customPopup, setCustomPopup] = useState<PrayerName | null>(null);
  const timeoutIds = useRef<ReturnType<typeof setTimeout>[]>([]);

  const { globalEnabled, prayers, setGlobalEnabled, setPrayerEnabled, setPrayerMinutes } =
    usePrayerStore();

  // Hydrate store from localStorage
  useEffect(() => {
    usePrayerStore.persist.rehydrate();
    setMounted(true);
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission);
    }
  }, []);

  // Schedule browser notifications for today's remaining prayers
  const scheduleToday = useCallback(() => {
    timeoutIds.current.forEach(clearTimeout);
    timeoutIds.current = [];

    const { globalEnabled: ge, prayers: pr } = usePrayerStore.getState();
    if (!ge || typeof Notification === "undefined" || Notification.permission !== "granted") return;

    PRAYER_NAMES.forEach((name) => {
      const setting = pr[name];
      if (!setting.enabled) return;

      const [h, m] = PRAYER_TIMES[name].split(":").map(Number);
      const now = new Date();
      const notifyAt = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        h,
        m - setting.minutesBefore,
        0
      );
      if (notifyAt <= now) return;

      const id = setTimeout(() => {
        new Notification(`${PRAYER_META[name].icon} ${name} – ${PRAYER_TIMES[name]}`, {
          body: `${name} prayer in ${setting.minutesBefore} min`,
          icon: "/favicon.png",
          tag: `prayer-${name}`,
          silent: true,
        });
      }, notifyAt.getTime() - now.getTime());

      timeoutIds.current.push(id);
    });
  }, []);

  useEffect(() => {
    if (mounted) scheduleToday();
    return () => timeoutIds.current.forEach(clearTimeout);
  }, [mounted, globalEnabled, prayers, scheduleToday]);

  // Master toggle: always switches state; permission is handled via a separate banner
  const handleGlobalToggle = () => {
    setGlobalEnabled(!globalEnabled);
  };

  const requestPermission = async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  if (!mounted) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-32 rounded-lg bg-[--color-surface]" />
        <div className="h-28 rounded-xl bg-[--color-surface]" />
        <div className="h-96 rounded-xl bg-[--color-surface]" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold text-[--color-text]">Prayer</h1>
      </header>

      {/* Quick links */}
      <section className="grid grid-cols-3 gap-2">
        {[
          { href: "/qibla", label: "Qibla", icon: "🧭" },
          { href: "/mosques", label: "Mosques", icon: "🕌" },
          { href: "/ramadan", label: "Ramadan", icon: "🌙" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl border border-[--color-border] bg-[--color-surface] p-3 text-center shadow-sm transition-colors hover:border-primary-600"
          >
            <p className="text-xl">{item.icon}</p>
            <p className="mt-1 text-xs font-semibold text-[--color-text]">{item.label}</p>
          </Link>
        ))}
      </section>

      {/* Global notification controls */}
      <section className="space-y-3 rounded-2xl border border-[--color-border] bg-[--color-surface] p-4 shadow-sm">
        <h2 className="font-semibold text-[--color-text]">🔔 Notification Settings</h2>

        {/* Master toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[--color-text]">전체 알림</p>
            <p className="text-xs text-[--color-text-muted]">
              끄면 개별 설정이 유지된 채로 비활성화됩니다
            </p>
          </div>
          <Toggle value={globalEnabled} onChange={handleGlobalToggle} />
        </div>

        {/* Permission banner — only when master is ON but permission not granted */}
        {globalEnabled && permission !== "granted" && (
          <div
            className={[
              "rounded-lg px-3 py-2.5 text-xs",
              permission === "denied"
                ? "bg-red-50 text-red-600"
                : "bg-[#fef9f0] text-[#c4704a]",
            ].join(" ")}
          >
            {permission === "denied" ? (
              "브라우저에서 알림이 차단됐습니다. 브라우저 설정에서 직접 허용해 주세요."
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span>알림을 받으려면 권한이 필요합니다</span>
                <button
                  type="button"
                  onClick={requestPermission}
                  className="shrink-0 rounded-full bg-[#c4704a] px-3 py-1 font-medium text-white transition-colors hover:bg-[#b35f3a]"
                >
                  허용
                </button>
              </div>
            )}
          </div>
        )}

        {/* Granted confirmation */}
        {globalEnabled && permission === "granted" && (
          <p className="text-xs text-[#2d6a4f]">✓ 브라우저 알림 권한이 허용됐습니다</p>
        )}
      </section>

      {/* Prayer times + per-prayer notification settings */}
      <section className="overflow-hidden rounded-2xl border border-[--color-border] bg-[--color-surface] shadow-sm">
        <div className="border-b border-[--color-border] px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[--color-text]">Today&apos;s Prayer Times</h2>
            <span className="rounded-full bg-[--color-background] px-2 py-0.5 text-[10px] text-[--color-text-muted]">
              Mecca (test)
            </span>
          </div>
        </div>

        <div className="divide-y divide-[--color-border]">
          {PRAYER_NAMES.map((name) => {
            const meta = PRAYER_META[name];
            const setting = prayers[name];
            const rowActive = globalEnabled && setting.enabled;
            const isCustom = !(PRESET_CHIPS as readonly number[]).includes(setting.minutesBefore);

            return (
              <div key={name} className="space-y-2.5 px-4 py-3">
                {/* Prayer row */}
                <div className="flex items-center gap-3">
                  <span className="w-6 shrink-0 text-center text-lg">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[--color-text]">{name}</p>
                    <p className="text-xs text-[--color-text-muted]">{meta.arabic}</p>
                  </div>
                  <span className="shrink-0 font-mono text-sm font-medium text-[--color-text]">
                    {PRAYER_TIMES[name]}
                  </span>
                  <Toggle
                    value={setting.enabled}
                    onChange={() => setPrayerEnabled(name, !setting.enabled)}
                    disabled={!globalEnabled}
                  />
                </div>

                {/* Notification chips — visible only when this prayer is active */}
                {rowActive && (
                  <div className="flex flex-wrap gap-1.5 pl-9">
                    {PRESET_CHIPS.map((min) => (
                      <button
                        key={min}
                        type="button"
                        onClick={() => setPrayerMinutes(name, min)}
                        className={[
                          "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                          setting.minutesBefore === min
                            ? "border-[#2d6a4f] bg-[#2d6a4f] text-white"
                            : "border-[--color-border] text-[--color-text-muted] hover:border-[#2d6a4f] hover:text-[#2d6a4f]",
                        ].join(" ")}
                      >
                        {min}분
                      </button>
                    ))}

                    {/* Custom input chip */}
                    <button
                      type="button"
                      onClick={() => setCustomPopup(name)}
                      className={[
                        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        isCustom
                          ? "border-[#c4704a] bg-[#c4704a] text-white"
                          : "border-[--color-border] text-[--color-text-muted] hover:border-[#c4704a] hover:text-[#c4704a]",
                      ].join(" ")}
                    >
                      {isCustom ? `${setting.minutesBefore}분` : "직접 입력"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Custom minutes popup */}
      {customPopup && (
        <CustomMinutesPopup
          prayerName={customPopup}
          initialValue={prayers[customPopup].minutesBefore}
          onConfirm={(minutes) => {
            setPrayerMinutes(customPopup, minutes);
            setCustomPopup(null);
          }}
          onClose={() => setCustomPopup(null)}
        />
      )}
    </div>
  );
}
