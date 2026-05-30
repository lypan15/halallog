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
  overrideTimes: Partial<Record<PrayerName, string>>;
  setGlobalEnabled: (v: boolean) => void;
  setPrayerEnabled: (name: PrayerName, v: boolean) => void;
  setPrayerMinutes: (name: PrayerName, minutes: number) => void;
  setOverrideTime: (name: PrayerName, time: string) => void;
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
      overrideTimes: {},

      setGlobalEnabled: (v) =>
        set((s) => ({
          globalEnabled: v,
          prayers: Object.fromEntries(
            PRAYER_NAMES.map((n) => [n, { ...s.prayers[n], enabled: v }])
          ) as Record<PrayerName, PrayerNotifSetting>,
        })),

      setPrayerEnabled: (name, v) =>
        set((s) => {
          const newPrayers = {
            ...s.prayers,
            [name]: { ...s.prayers[name], enabled: v },
          };
          const anyEnabled = PRAYER_NAMES.some((n) => newPrayers[n].enabled);
          return { prayers: newPrayers, globalEnabled: anyEnabled };
        }),

      setPrayerMinutes: (name, minutes) =>
        set((s) => ({
          prayers: {
            ...s.prayers,
            [name]: { ...s.prayers[name], minutesBefore: minutes },
          },
        })),

      setOverrideTime: (name, time) =>
        set((s) => ({
          overrideTimes: { ...s.overrideTimes, [name]: time },
        })),
    }),
    { name: "halallog-prayer-v2" }
  )
);
