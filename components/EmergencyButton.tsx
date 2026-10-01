import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function EmergencyButton({
  loading,
  onPress,
}: {
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable disabled={loading} onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <View style={styles.iconCircle}><Text style={styles.icon}>!</Text></View>
      <View style={styles.copy}>
        <Text style={styles.title}>{loading ? 'CAPTURING LOCATION…' : 'EMERGENCY DISTRESS'}</Text>
        <Text style={styles.subtitle}>Hackathon test flow · no responder is contacted</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#B9342E', borderRadius: 20, padding: 18, gap: 14 },
  pressed: { opacity: 0.84 },
  iconCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  icon: { color: '#B9342E', fontSize: 26, fontWeight: '900' },
  copy: { flex: 1 },
  title: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  subtitle: { color: '#FFD9D7', marginTop: 3, fontSize: 11 },
});
