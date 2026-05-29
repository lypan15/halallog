import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PRAYER_NAMES, type PrayerName } from "@/constants/prayerTimes";

export type PrayerNotifSetting = {
  enabled: boolean;
  minutesBefore: number;
};

type PrayerStore = {
  globalEnabled: boolean;
  prayers: Record<PrayerName, PrayerNotifSetting>;
  setGlobalEnabled: (v: boolean) => void;
  setPrayerEnabled: (name: PrayerName, v: boolean) => void;
  setPrayerMinutes: (name: PrayerName, minutes: number) => void;
};

export const DEFAULT_PRAYER_SETTINGS: Record<PrayerName, PrayerNotifSetting> =
  Object.fromEntries(
    PRAYER_NAMES.map((n) => [n, { enabled: true, minutesBefore: 10 }])
  ) as Record<PrayerName, PrayerNotifSetting>;

export const usePrayerStore = create<PrayerStore>()(
  persist(
    (set) => ({
      globalEnabled: false,
      prayers: { ...DEFAULT_PRAYER_SETTINGS },

      setGlobalEnabled: (v) => set({ globalEnabled: v }),

      setPrayerEnabled: (name, v) =>
        set((s) => ({
          prayers: { ...s.prayers, [name]: { ...s.prayers[name], enabled: v } },
        })),

      setPrayerMinutes: (name, minutes) =>
        set((s) => ({
          prayers: {
            ...s.prayers,
            [name]: { ...s.prayers[name], minutesBefore: minutes },
          },
        })),
    }),
    { name: "halallog-prayer-v2" }
  )
);
