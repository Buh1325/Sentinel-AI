import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const HOLD_MS = 3000;

export default function EmergencyButton({
  loading,
  recording,
  onHoldComplete,
}: {
  loading?: boolean;
  recording?: boolean;
  onHoldComplete: () => void;
}) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const startedAt = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const firedRef = useRef(false);
  const disabled = Boolean(loading || recording);

  function clearTicker() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  useEffect(() => () => clearTicker(), []);

  function beginHold() {
    if (disabled) return;
    firedRef.current = false;
    startedAt.current = Date.now();
    setHolding(true);
    setProgress(0);
    clearTicker();
    intervalRef.current = setInterval(() => {
      const next = Math.min(1, (Date.now() - startedAt.current) / HOLD_MS);
      setProgress(next);
    }, 50);
  }

  function cancelHold() {
    clearTicker();
    setHolding(false);
    if (!firedRef.current) setProgress(0);
  }

  function completeHold() {
    if (disabled || firedRef.current) return;
    firedRef.current = true;
    clearTicker();
    setProgress(1);
    setHolding(false);
    onHoldComplete();
  }

  const remaining = Math.max(0, 3 - Math.floor(progress * 3));
  const title = recording
    ? 'EMERGENCY ACTIVE'
    : loading
      ? 'ACTIVATING…'
      : holding
        ? `KEEP HOLDING · ${remaining}s`
        : 'HOLD FOR HELP';

  return (
    <Pressable
      disabled={disabled}
      onPressIn={beginHold}
      onPressOut={cancelHold}
      onLongPress={completeHold}
      delayLongPress={HOLD_MS}
      accessibilityRole="button"
      accessibilityLabel="Hold for three seconds to activate emergency distress mode"
      accessibilityHint="Release before three seconds to cancel"
      style={({ pressed }) => [styles.button, pressed && !disabled && styles.pressed, disabled && styles.disabled]}
    >
      <View style={styles.iconCircle}><Text style={styles.icon}>!</Text></View>
      <View style={styles.copy}>
        <Text style={styles.kicker}>{recording ? '● AUDIO RECORDING ACTIVE' : 'EMERGENCY'}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          {recording
            ? 'Your emergency session is active and the microphone is recording.'
            : 'Hold continuously for 3 seconds. Release early to cancel.'}
        </Text>
        {!recording && !loading ? (
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B91C1C',
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 20,
    gap: 16,
    minHeight: 128,
    shadowColor: '#7F1D1D',
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.995 }] },
  disabled: { opacity: 0.88 },
  iconCircle: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  icon: { color: '#B91C1C', fontSize: 40, lineHeight: 44, fontWeight: '900' },
  copy: { flex: 1 },
  kicker: { color: '#FECACA', fontSize: 10, fontWeight: '900', letterSpacing: 0.8, marginBottom: 3 },
  title: { color: '#FFFFFF', fontSize: 23, lineHeight: 27, fontWeight: '900' },
  subtitle: { color: '#FEE2E2', marginTop: 6, fontSize: 11, lineHeight: 15, fontWeight: '600' },
  track: { height: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden', marginTop: 11 },
  fill: { height: '100%', backgroundColor: '#FFFFFF', borderRadius: 999 },
});
