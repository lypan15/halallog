// Hardcoded Mecca times — replace with GPS-based Aladhan API response later
export type PrayerName = "Fajr" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";

export const PRAYER_NAMES: readonly PrayerName[] = [
  "Fajr",
  "Dhuhr",
  "Asr",
  "Maghrib",
  "Isha",
];

export const PRAYER_TIMES: Record<PrayerName, string> = {
  Fajr: "04:32",
  Dhuhr: "12:08",
  Asr: "15:29",
  Maghrib: "18:21",
  Isha: "19:51",
};

export const PRAYER_META: Record<PrayerName, { arabic: string; icon: string }> =
  {
    Fajr: { arabic: "الفجر", icon: "🌙" },
    Dhuhr: { arabic: "الظهر", icon: "☀️" },
    Asr: { arabic: "العصر", icon: "🌤️" },
    Maghrib: { arabic: "المغرب", icon: "🌅" },
    Isha: { arabic: "العشاء", icon: "🌙" },
  };
