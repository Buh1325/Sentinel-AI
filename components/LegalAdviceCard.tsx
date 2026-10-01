// components/LegalAdviceCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LegalAdvice, IncidentCategory } from '../lib/types';
import { getLegalAdvice } from '../services/legalAdvice';

const colors = {
  ink: '#071D27',
  muted: '#61727C',
  card: '#FFFFFF',
  teal: '#087B78',
  tealDark: '#075D5B',
  line: '#DFE7EB',
  red: '#B9342E',
};

export function LegalAdviceCard({ category }: { category: IncidentCategory }) {
  const advice: LegalAdvice = getLegalAdvice(category);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>SA Law & Safety Guidance</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{category}</Text>
        </View>
      </View>

      <Text style={styles.lawTitle}>{advice.legislation_title}</Text>
      <Text style={styles.lawCitation}>{advice.legislation_citation}</Text>
      <Text style={styles.summary}>{advice.summary}</Text>

      <Text style={styles.sectionTitle}>Immediate actions</Text>
      {advice.immediate_actions.map((step, i) => (
        <View key={i} style={styles.stepRow}>
          <Text style={styles.stepIndex}>{i + 1}.</Text>
          <Text style={styles.stepText}>{step}</Text>
        </View>
      ))}

      {advice.resolution_pattern ? (
        <>
          <Text style={styles.sectionTitle}>How similar cases resolved</Text>
          <Text style={styles.summary}>{advice.resolution_pattern}</Text>
        </>
      ) : null}

      <Text style={styles.disclaimer}>
        Informational only. This is not legal advice. Consult an attorney or Legal Aid SA (0800 110 110).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#EEF4F5',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.teal,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  header: { color: colors.ink, fontWeight: '900', fontSize: 14 },
  badge: {
    backgroundColor: colors.tealDark,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  lawTitle: { color: colors.ink, fontWeight: '800', fontSize: 14, marginTop: 4 },
  lawCitation: { color: colors.tealDark, fontSize: 11, fontWeight: '700', marginTop: 2 },
  summary: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 8 },
  sectionTitle: {
    color: colors.ink,
    fontWeight: '900',
    fontSize: 12,
    marginTop: 14,
    marginBottom: 6,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  stepRow: { flexDirection: 'row', marginBottom: 6 },
  stepIndex: { color: colors.tealDark, fontWeight: '900', width: 22, fontSize: 13 },
  stepText: { color: colors.ink, fontSize: 13, flex: 1, lineHeight: 19 },
  disclaimer: {
    color: '#98A5AC',
    fontSize: 10,
    marginTop: 14,
    fontStyle: 'italic',
  },
});