import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Coordinates, CalculationMethod, Madhab, PrayerTimes as AdhanPrayerTimes } from 'adhan';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PrayerName, useNotificationStore } from '@/stores/notification-store';

const PRAYER_LABELS: Record<PrayerName, string> = {
  fajr: 'Fajr',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
};

const PRAYER_KEYS = Object.keys(PRAYER_LABELS) as PrayerName[];
const PRESET_MINUTES = [5, 10, 15, 30] as const;

const MECCA = { lat: 21.3891, lng: 39.8579 };

interface PrayTimeState {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

function fmtTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function PrayScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const [customTarget, setCustomTarget] = useState<PrayerName | null>(null);
  const [customInput, setCustomInput] = useState('');
  const [prayTimes, setPrayTimes] = useState<PrayTimeState | null>(null);
  const [locationLabel, setLocationLabel] = useState('');

  const { masterEnabled, prayers, setMasterEnabled, setPrayerEnabled, toggleMinute } =
    useNotificationStore();

  // ── Prayer times: GPS → adhan calculation ─────────────────────────────
  useEffect(() => {
    const computeTimes = (lat: number, lng: number, label: string) => {
      try {
        const coords = new Coordinates(lat, lng);
        const params = CalculationMethod.MuslimWorldLeague();
        params.madhab = Madhab.Shafi;
        const times = new AdhanPrayerTimes(coords, new Date(), params);
        setPrayTimes({
          fajr: fmtTime(times.fajr),
          dhuhr: fmtTime(times.dhuhr),
          asr: fmtTime(times.asr),
          maghrib: fmtTime(times.maghrib),
          isha: fmtTime(times.isha),
        });
        setLocationLabel(label);
      } catch {
        // ignore calculation errors for edge coordinates
      }
    };

    const fallback = () => computeTimes(MECCA.lat, MECCA.lng, 'Mecca (test)');

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => computeTimes(pos.coords.latitude, pos.coords.longitude, 'Current Location'),
        fallback,
        { timeout: 5000, enableHighAccuracy: false },
      );
    } else {
      fallback();
    }
  }, []);

  // ── Notification toggle: always clickable, auto-sync master ────────────
  const handlePrayerToggle = (prayerName: PrayerName) => {
    const newEnabled = !prayers[prayerName].enabled;
    setPrayerEnabled(prayerName, newEnabled);

    if (newEnabled) {
      // Any prayer turned ON → master ON
      setMasterEnabled(true);
    } else {
      // All prayers OFF → master OFF
      const allWillBeOff = PRAYER_KEYS.every(
        (k) => k === prayerName || !prayers[k].enabled,
      );
      if (allWillBeOff) setMasterEnabled(false);
    }
  };

  const openCustomModal = (prayer: PrayerName) => {
    setCustomInput('');
    setCustomTarget(prayer);
  };

  const closeCustomModal = () => {
    setCustomTarget(null);
    setCustomInput('');
  };

  const confirmCustom = () => {
    if (!customTarget) return;
    const value = parseInt(customInput, 10);
    if (!isNaN(value) && value >= 1 && value <= 60) {
      toggleMinute(customTarget, value);
      closeCustomModal();
    } else {
      Alert.alert('유효하지 않은 값', '1~60 사이의 숫자를 입력하세요.');
    }
  };

  return (
    <ThemedView style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.four,
            paddingBottom: insets.bottom + BottomTabInset + Spacing.four,
            paddingHorizontal: Spacing.four,
          },
        ]}>
        <View style={styles.inner}>
          <ThemedText type="subtitle" style={styles.pageTitle}>
            Pray
          </ThemedText>

          {/* Today's Prayer Times */}
          {prayTimes && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <View style={[styles.row, styles.timesHeader]}>
                <ThemedText type="default" style={styles.masterLabel}>
                  Today's Prayer Times
                </ThemedText>
              </View>
              {locationLabel ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.locationLabel}>
                  {locationLabel}
                </ThemedText>
              ) : null}
              {PRAYER_KEYS.map((prayer, index) => (
                <View key={prayer}>
                  {index > 0 && (
                    <View
                      style={[styles.separator, { backgroundColor: theme.backgroundSelected }]}
                    />
                  )}
                  <View style={styles.row}>
                    <ThemedText type="default">{PRAYER_LABELS[prayer]}</ThemedText>
                    <ThemedText type="default" style={styles.timeValue}>
                      {prayTimes[prayer]}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </ThemedView>
          )}

          {/* Master toggle */}
          <ThemedView type="backgroundElement" style={styles.card}>
            <View style={styles.row}>
              <ThemedText type="default" style={styles.masterLabel}>
                전체 알림
              </ThemedText>
              <Switch
                value={masterEnabled}
                onValueChange={setMasterEnabled}
                trackColor={{ true: '#22c55e', false: theme.backgroundSelected }}
                thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
              />
            </View>
          </ThemedView>

          {/* Pray notification rows */}
          <ThemedView type="backgroundElement" style={styles.prayerCard}>
            {PRAYER_KEYS.map((prayer, index) => {
              const setting = prayers[prayer];
              const showChips = masterEnabled && setting.enabled;
              const customMinutes = setting.selectedMinutes.filter(
                (m) => !(PRESET_MINUTES as readonly number[]).includes(m),
              );

              return (
                <View key={prayer}>
                  {index > 0 && (
                    <View
                      style={[styles.separator, { backgroundColor: theme.backgroundSelected }]}
                    />
                  )}

                  <View style={[styles.row, styles.prayerRow]}>
                    <ThemedText type="default">{PRAYER_LABELS[prayer]}</ThemedText>
                    <Switch
                      value={setting.enabled}
                      onValueChange={() => handlePrayerToggle(prayer)}
                      trackColor={{ true: '#22c55e', false: theme.backgroundSelected }}
                      thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
                    />
                  </View>

                  {showChips && (
                    <View style={styles.chipsRow}>
                      {PRESET_MINUTES.map((min) => {
                        const selected = setting.selectedMinutes.includes(min);
                        return (
                          <Pressable
                            key={min}
                            style={[
                              styles.chip,
                              { backgroundColor: selected ? '#22c55e' : theme.backgroundSelected },
                            ]}
                            onPress={() => toggleMinute(prayer, min)}>
                            <ThemedText
                              type="small"
                              style={selected ? styles.chipTextOn : undefined}>
                              {min}min
                            </ThemedText>
                          </Pressable>
                        );
                      })}

                      {customMinutes.map((min) => (
                        <Pressable
                          key={min}
                          style={[styles.chip, { backgroundColor: '#22c55e' }]}
                          onPress={() => toggleMinute(prayer, min)}>
                          <ThemedText type="small" style={styles.chipTextOn}>
                            {min}min ×
                          </ThemedText>
                        </Pressable>
                      ))}

                      <Pressable
                        style={[styles.chip, { backgroundColor: theme.backgroundSelected }]}
                        onPress={() => openCustomModal(prayer)}>
                        <ThemedText type="small">Custom</ThemedText>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </ThemedView>
        </View>
      </ScrollView>

      {/* Custom minute modal */}
      <Modal
        visible={customTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={closeCustomModal}>
        <Pressable style={styles.backdrop} onPress={closeCustomModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.kav}>
            <Pressable
              style={[styles.modalBox, { backgroundColor: theme.backgroundElement }]}
              onPress={() => {}}>
              <ThemedText type="default" style={styles.modalTitle}>
                알림 시간 직접 입력
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.modalHint}>
                기도 전 몇 분 (1–60)
              </ThemedText>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: theme.backgroundSelected,
                    color: theme.text,
                    borderColor: theme.backgroundSelected,
                  },
                ]}
                value={customInput}
                onChangeText={(t) => setCustomInput(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="20"
                placeholderTextColor={theme.textSecondary}
                autoFocus
              />
              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.modalBtn, { backgroundColor: theme.backgroundSelected }]}
                  onPress={closeCustomModal}>
                  <ThemedText type="small">취소</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.modalBtn, styles.confirmBtn]}
                  onPress={confirmCustom}>
                  <ThemedText type="small" style={styles.confirmText}>
                    확인
                  </ThemedText>
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { flexGrow: 1 },
  inner: { maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' },
  pageTitle: { marginBottom: Spacing.four },
  card: {
    borderRadius: Spacing.three,
    marginBottom: Spacing.three,
    overflow: 'hidden',
  },
  timesHeader: { paddingBottom: 0 },
  locationLabel: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  timeValue: { fontWeight: '600' },
  prayerCard: {
    borderRadius: Spacing.three,
    overflow: 'hidden',
    paddingVertical: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  masterLabel: { fontWeight: '600' },
  prayerRow: {},
  separator: { height: StyleSheet.hairlineWidth, marginHorizontal: Spacing.three },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: 20,
  },
  chipTextOn: { color: '#ffffff', fontWeight: '600' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  kav: { width: '100%', alignItems: 'center' },
  modalBox: {
    width: '100%',
    maxWidth: 320,
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  modalTitle: { fontWeight: '600', textAlign: 'center' },
  modalHint: { textAlign: 'center' },
  modalInput: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 20,
    textAlign: 'center',
    borderWidth: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  confirmBtn: { backgroundColor: '#22c55e' },
  confirmText: { color: '#ffffff', fontWeight: '600' },
});
