import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function Pill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'danger' | 'warning' | 'success' | 'neutral' | 'info';
}) {
  const backgroundStyle = { danger: styles.danger, warning: styles.warning, success: styles.success, neutral: styles.neutral, info: styles.info }[tone];
  const textStyle = { danger: styles.dangerText, warning: styles.warningText, success: styles.successText, neutral: styles.neutralText, info: styles.infoText }[tone];

  return (
    <View style={[styles.pill, backgroundStyle]}>
      <Text style={[styles.text, textStyle]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, alignSelf: 'flex-start' },
  text: { fontSize: 11, fontWeight: '700' },
  neutral: { backgroundColor: '#E8EEF2' },
  neutralText: { color: '#435460' },
  danger: { backgroundColor: '#FFE2E1' },
  dangerText: { color: '#A92520' },
  warning: { backgroundColor: '#FFF0D6' },
  warningText: { color: '#9A5A00' },
  success: { backgroundColor: '#DDF6EA' },
  successText: { color: '#146443' },
  info: { backgroundColor: '#DDEEFF' },
  infoText: { color: '#195A8B' },
});
