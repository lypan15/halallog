"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  PRAYER_META,
  PRAYER_NAMES,
  PRAYER_TIMES,
  type PrayerName,
} from "@/constants/prayerTimes";
import {
  DEFAULT_PRAYER_SETTINGS,
  usePrayerStore,
  type PrayerNotifSetting,
} from "@/lib/prayer-store";

const PRESET_MINS = [5, 10, 15, 30] as const;

// ── Toggle switch ────────────────────────────────────────────────────────
function Toggle({
  on,
  onToggle,
  disabled = false,
}: {
  on: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onToggle}
      style={{
        display: "inline-flex",
        alignItems: "center",
        width: 44,
        height: 24,
        borderRadius: 999,
        backgroundColor: on && !disabled ? "#2d6a4f" : "#d1d5db",
        border: "none",
        padding: 2,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        flexShrink: 0,
        transition: "background-color 0.2s",
      }}
    >
      <span
        style={{
          display: "block",
          width: 20,
          height: 20,
          borderRadius: "50%",
          backgroundColor: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          transform: on ? "translateX(20px)" : "translateX(0px)",
          transition: "transform 0.2s",
        }}
      />
    </button>
  );
}

// ── Custom minutes popup ─────────────────────────────────────────────────
function CustomPopup({
  prayerName,
  current,
  onConfirm,
  onClose,
}: {
  prayerName: PrayerName;
  current: number;
  onConfirm: (v: number) => void;
  onClose: () => void;
}) {
  const [raw, setRaw] = useState(String(current));
  const parsed = parseInt(raw, 10);
  const valid = !isNaN(parsed) && parsed >= 1 && parsed <= 60;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.4)",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 280,
          borderRadius: 16,
          backgroundColor: "var(--color-surface)",
          padding: 24,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        <p
          style={{
            textAlign: "center",
            fontWeight: 600,
            fontSize: 15,
            marginBottom: 4,
            color: "var(--color-text)",
          }}
        >
          직접 입력
        </p>
        <p
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "var(--color-text-muted)",
            marginBottom: 20,
          }}
        >
          {PRAYER_META[prayerName].icon} {prayerName} 알림
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="number"
            value={raw}
            min={1}
            max={60}
            autoFocus
            onChange={(e) => setRaw(e.target.value)}
            style={{
              flex: 1,
              border: `1px solid ${valid ? "#2d6a4f" : "var(--color-border)"}`,
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 22,
              fontWeight: 700,
              textAlign: "center",
              outline: "none",
              backgroundColor: "var(--color-background)",
              color: "var(--color-text)",
            }}
          />
          <span style={{ fontSize: 13, color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
            분 전
          </span>
        </div>

        {raw !== "" && !valid && (
          <p style={{ fontSize: 11, color: "#c4704a", textAlign: "center", marginTop: 6 }}>
            1–60 사이 숫자를 입력해주세요
          </p>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              border: "1px solid var(--color-border)",
              borderRadius: 10,
              padding: "10px 0",
              fontSize: 14,
              color: "var(--color-text-muted)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => valid && onConfirm(parsed)}
            disabled={!valid}
            style={{
              flex: 1,
              border: "none",
              borderRadius: 10,
              padding: "10px 0",
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              backgroundColor: valid ? "#2d6a4f" : "#9ca3af",
              cursor: valid ? "pointer" : "not-allowed",
            }}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Prayer time override popup ───────────────────────────────────────────
function OverridePopup({
  prayerName,
  currentTime,
  onConfirm,
  onClose,
}: {
  prayerName: PrayerName;
  currentTime: string;
  onConfirm: (time: string) => void;
  onClose: () => void;
}) {
  const [time, setTime] = useState(currentTime);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.4)",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 280,
          borderRadius: 16,
          backgroundColor: "var(--color-surface)",
          padding: 24,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        <p
          style={{
            textAlign: "center",
            fontWeight: 600,
            fontSize: 15,
            marginBottom: 4,
            color: "var(--color-text)",
          }}
        >
          {PRAYER_META[prayerName].icon} Set {prayerName} time
        </p>
        <p
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "var(--color-text-muted)",
            marginBottom: 20,
          }}
        >
          기본값을 덮어씁니다 (manual override)
        </p>

        <input
          type="time"
          value={time}
          autoFocus
          onChange={(e) => setTime(e.target.value)}
          style={{
            width: "100%",
            boxSizing: "border-box",
            border: "1px solid #2d6a4f",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 24,
            fontWeight: 700,
            textAlign: "center",
            outline: "none",
            backgroundColor: "var(--color-background)",
            color: "var(--color-text)",
          }}
        />

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              border: "1px solid var(--color-border)",
              borderRadius: 10,
              padding: "10px 0",
              fontSize: 14,
              color: "var(--color-text-muted)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => time && onConfirm(time)}
            disabled={!time}
            style={{
              flex: 1,
              border: "none",
              borderRadius: 10,
              padding: "10px 0",
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              backgroundColor: time ? "#2d6a4f" : "#9ca3af",
              cursor: time ? "pointer" : "not-allowed",
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────
export default function PrayerPage() {
  // Prevent SSR/hydration mismatch: render nothing store-dependent until client mount
  const [mounted, setMounted] = useState(false);
  const [customTarget, setCustomTarget] = useState<PrayerName | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<PrayerName | null>(null);
  const notifTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Always call the hook unconditionally
  const store = usePrayerStore();

  // After mount, the persisted store values are available
  const globalEnabled = mounted ? store.globalEnabled : false;
  const prayers: Record<PrayerName, PrayerNotifSetting> = mounted
    ? store.prayers ?? DEFAULT_PRAYER_SETTINGS
    : DEFAULT_PRAYER_SETTINGS;
  const overrideTimes: Partial<Record<PrayerName, string>> = mounted
    ? store.overrideTimes ?? {}
    : {};

  useEffect(() => {
    setMounted(true);
  }, []);

  // Schedule browser notifications whenever relevant state changes
  useEffect(() => {
    if (!mounted) return;
    notifTimers.current.forEach(clearTimeout);
    notifTimers.current = [];

    if (
      !store.globalEnabled ||
      typeof Notification === "undefined" ||
      Notification.permission !== "granted"
    )
      return;

    PRAYER_NAMES.forEach((name) => {
      const s = store.prayers?.[name];
      if (!s?.enabled) return;

      // Use manually overridden time if set, otherwise fall back to default
      const prayerTime = store.overrideTimes?.[name] ?? PRAYER_TIMES[name];
      const [h, m] = prayerTime.split(":").map(Number);
      const now = new Date();
      const fireAt = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        h,
        m - s.minutesBefore,
        0
      );
      if (fireAt <= now) return;

      const id = setTimeout(() => {
        new Notification(`${PRAYER_META[name].icon} ${name} – ${prayerTime}`, {
          body: `${name} prayer in ${s.minutesBefore} min`,
          icon: "/favicon.png",
          tag: `prayer-${name}`,
          silent: true,
        });
      }, fireAt.getTime() - now.getTime());

      notifTimers.current.push(id);
    });

    return () => notifTimers.current.forEach(clearTimeout);
  }, [mounted, store.globalEnabled, store.prayers, store.overrideTimes]);

  return (
    <div className="space-y-4 pb-4">
      {/* ── Header ── */}
      <header>
        <h1 className="text-2xl font-bold text-[--color-text]">Pray</h1>
      </header>

      {/* ── Quick links ── */}
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

      {/* ── Prayer times + notification settings ── */}
      <section className="overflow-hidden rounded-2xl border border-[--color-border] bg-[--color-surface] shadow-sm">
        {/* Section header with master toggle */}
        <div className="border-b border-[--color-border] px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-[--color-text]">Today&apos;s Prayer Times</p>
              <p className="text-xs text-[--color-text-muted]">Mecca · test data</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[--color-text-muted]">전체 알림</span>
              <Toggle
                on={globalEnabled}
                onToggle={() => store.setGlobalEnabled(!globalEnabled)}
              />
            </div>
          </div>
        </div>

        {/* Individual prayer rows */}
        <div className="divide-y divide-[--color-border]">
          {PRAYER_NAMES.map((name) => {
            const meta = PRAYER_META[name];
            const setting = prayers[name] ?? { enabled: true, minutesBefore: 10 };
            const rowOn = setting.enabled;
            const isCustomMin = !(PRESET_MINS as readonly number[]).includes(
              setting.minutesBefore
            );
            const effectiveTime = overrideTimes[name] ?? PRAYER_TIMES[name];
            const isOverridden = !!overrideTimes[name];

            return (
              <div key={name} className="px-4 py-3">
                {/* Prayer name + time + toggle */}
                <div className="flex items-center gap-3">
                  <span className="w-7 shrink-0 text-center text-xl">{meta.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[--color-text]">{name}</p>
                    <p className="text-xs text-[--color-text-muted]">{meta.arabic}</p>
                  </div>

                  {/* Tappable time — opens override popup */}
                  <button
                    type="button"
                    onClick={() => setOverrideTarget(name)}
                    title="Tap to set custom time"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                      padding: "2px 4px",
                      borderRadius: 6,
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: 14,
                        fontWeight: 600,
                        color: isOverridden ? "#2d6a4f" : "var(--color-text)",
                      }}
                    >
                      {effectiveTime}
                    </span>
                    {isOverridden && (
                      <span style={{ fontSize: 10, lineHeight: 1 }}>✏️</span>
                    )}
                  </button>

                  <Toggle
                    on={setting.enabled}
                    onToggle={() => store.setPrayerEnabled(name, !setting.enabled)}
                  />
                </div>

                {/* Notification time chips — only when row is active */}
                {rowOn && (
                  <div style={{ paddingLeft: 36, marginTop: 10 }}>
                    {/* Bell label */}
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
                      <span style={{ fontSize: 11 }}>🔔</span>
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--color-text-muted)",
                          fontWeight: 500,
                        }}
                      >
                        알림 설정
                      </span>
                    </div>

                    {/* Preset chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_MINS.map((min) => {
                        const active = setting.minutesBefore === min;
                        return (
                          <button
                            key={min}
                            type="button"
                            onClick={() => store.setPrayerMinutes(name, min)}
                            style={{
                              border: `1px solid ${active ? "#2d6a4f" : "var(--color-border)"}`,
                              backgroundColor: active ? "#2d6a4f" : "transparent",
                              color: active ? "#fff" : "var(--color-text-muted)",
                              borderRadius: 999,
                              padding: "4px 12px",
                              fontSize: 12,
                              fontWeight: 500,
                              cursor: "pointer",
                            }}
                          >
                            {min}분 전
                          </button>
                        );
                      })}

                      {/* 직접 입력 chip */}
                      <button
                        type="button"
                        onClick={() => setCustomTarget(name)}
                        style={{
                          border: `1px solid ${isCustomMin ? "#c4704a" : "var(--color-border)"}`,
                          backgroundColor: isCustomMin ? "#c4704a" : "transparent",
                          color: isCustomMin ? "#fff" : "var(--color-text-muted)",
                          borderRadius: 999,
                          padding: "4px 12px",
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        {isCustomMin ? `${setting.minutesBefore}분 전` : "직접 입력"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Custom minutes popup ── */}
      {customTarget && (
        <CustomPopup
          prayerName={customTarget}
          current={prayers[customTarget]?.minutesBefore ?? 10}
          onConfirm={(v) => {
            store.setPrayerMinutes(customTarget, v);
            setCustomTarget(null);
          }}
          onClose={() => setCustomTarget(null)}
        />
      )}

      {/* ── Prayer time override popup ── */}
      {overrideTarget && (
        <OverridePopup
          prayerName={overrideTarget}
          currentTime={overrideTimes[overrideTarget] ?? PRAYER_TIMES[overrideTarget]}
          onConfirm={(time) => {
            store.setOverrideTime(overrideTarget, time);
            setOverrideTarget(null);
          }}
          onClose={() => setOverrideTarget(null)}
        />
      )}
    </div>
  );
}
