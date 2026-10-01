import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function EmergencyButton({
  loading,
  recording,
  onPress,
}: {
  loading?: boolean;
  recording?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={loading}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Activate emergency distress mode"
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <View style={styles.iconCircle}><Text style={styles.icon}>!</Text></View>
      <View style={styles.copy}>
        <Text style={styles.kicker}>{recording ? '● AUDIO RECORDING ACTIVE' : 'EMERGENCY'}</Text>
        <Text style={styles.title}>{loading ? 'ACTIVATING…' : 'PRESS FOR HELP'}</Text>
        <Text style={styles.subtitle}>Captures your location and starts an emergency audio recording after confirmation.</Text>
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
    minHeight: 122,
    shadowColor: '#7F1D1D',
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  pressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  icon: { color: '#B91C1C', fontSize: 38, lineHeight: 42, fontWeight: '900' },
  copy: { flex: 1 },
  kicker: { color: '#FECACA', fontSize: 10, fontWeight: '900', letterSpacing: 0.8, marginBottom: 3 },
  title: { color: '#FFFFFF', fontSize: 23, lineHeight: 27, fontWeight: '900' },
  subtitle: { color: '#FEE2E2', marginTop: 6, fontSize: 11, lineHeight: 15, fontWeight: '600' },
});
