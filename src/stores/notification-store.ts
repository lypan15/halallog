import { create } from 'zustand';

export type PrayerName = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface PrayerSetting {
  enabled: boolean;
  selectedMinutes: number[];
}

interface NotificationState {
  masterEnabled: boolean;
  prayers: Record<PrayerName, PrayerSetting>;
  setMasterEnabled: (enabled: boolean) => void;
  setPrayerEnabled: (prayer: PrayerName, enabled: boolean) => void;
  toggleMinute: (prayer: PrayerName, minute: number) => void;
}

const defaultSetting: PrayerSetting = { enabled: false, selectedMinutes: [] };

export const useNotificationStore = create<NotificationState>((set) => ({
  masterEnabled: false,
  prayers: {
    fajr: { ...defaultSetting },
    dhuhr: { ...defaultSetting },
    asr: { ...defaultSetting },
    maghrib: { ...defaultSetting },
    isha: { ...defaultSetting },
  },

  setMasterEnabled: (enabled) => set({ masterEnabled: enabled }),

  setPrayerEnabled: (prayer, enabled) =>
    set((state) => ({
      prayers: {
        ...state.prayers,
        [prayer]: { ...state.prayers[prayer], enabled },
      },
    })),

  toggleMinute: (prayer, minute) =>
    set((state) => {
      const current = state.prayers[prayer].selectedMinutes;
      const next = current.includes(minute)
        ? current.filter((m) => m !== minute)
        : [...current, minute].sort((a, b) => a - b);
      return {
        prayers: {
          ...state.prayers,
          [prayer]: { ...state.prayers[prayer], selectedMinutes: next },
        },
      };
    }),
}));
