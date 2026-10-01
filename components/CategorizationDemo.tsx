// components/CategorizationDemo.tsx
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { classifyIncident, ClassificationResult } from '../services/agent';
import { getLegalAdvice } from '../services/legalAdvice';

const colors = {
  ink: '#071D27',
  muted: '#61727C',
  bg: '#F4F7F8',
  card: '#FFFFFF',
  teal: '#087B78',
  tealDark: '#075D5B',
  line: '#DFE7EB',
  red: '#B9342E',
  amber: '#D88915',
  green: '#1F8A57',
};

const SAMPLES = [
  'Armed robbery at a petrol station in Sandton, suspects fled in a white Golf.',
  'Three men attempted to hijack a vehicle near the N1 offramp in Centurion.',
  'Suspicious individuals loitering outside a primary school in Mitchells Plain.',
  'Domestic dispute reported on a residential street in Pietermaritzburg.',
  'Housebreak at a business park in Umhlanga, laptops stolen.',
  'They grabbed her outside the shops, threw her in the car and drove off.',
  'Some guys pulled me out my Polo and left with the car.',
  'They cornered him and took his phone and wallet before running away.',
];

function severityColor(sev: string) {
  switch (sev) {
    case 'critical': return colors.red;
    case 'high': return '#C5592F';
    case 'medium': return colors.amber;
    default: return colors.green;
  }
}

export function CategorizationDemo() {
  const [text, setText] = useState(SAMPLES[0]!);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [busy, setBusy] = useState(false);

  const legal = useMemo(
    () => (result ? getLegalAdvice(result.category) : null),
    [result]
  );

  const run = useCallback(async () => {
    setBusy(true);
    try {
      const r = await classifyIncident(text, { useAI: true });
      setResult(r);
    } finally {
      setBusy(false);
    }
  }, [text]);

  return (
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Live AI Categorization</Text>
      <Text style={styles.subtitle}>
        Watch raw text pass through the Sentinel classifier step-by-step.
      </Text>

      <Text style={styles.label}>Raw news / report text</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        style={styles.input}
        placeholder="Paste or type a crime report…"
        placeholderTextColor="#98A5AC"
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.samplesRow}
      >
        {SAMPLES.map((s, i) => (
          <Pressable key={i} onPress={() => setText(s)} style={styles.sampleChip}>
            <Text style={styles.sampleText} numberOfLines={1}>
              {s.slice(0, 32)}…
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable style={styles.primary} onPress={run} disabled={busy}>
        <Text style={styles.primaryText}>
          {busy ? 'Classifying…' : 'Run classifier'}
        </Text>
      </Pressable>

      {busy ? <ActivityIndicator color={colors.teal} style={{ marginTop: 12 }} /> : null}

      {result ? (
        <View style={styles.resultWrap}>
          <View style={styles.modeRow}>
            <Text style={[styles.modeBadge, result.mode === 'ai' ? styles.modeBadgeAI : styles.modeBadgeFallback]}>
              {result.mode === 'ai' ? 'AI SEMANTIC' : 'ON-DEVICE FALLBACK'}
            </Text>
            {result.note ? <Text style={styles.modeNote}>{result.note}</Text> : null}
          </View>
          <View style={styles.metaGrid}>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Category</Text>
              <Text style={styles.metaValue}>{result.category}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Severity</Text>
              <Text style={[styles.metaValue, { color: severityColor(result.severity) }]}>
                {result.severity.toUpperCase()}
              </Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Confidence</Text>
              <Text style={styles.metaValue}>
                {(result.confidence * 100).toFixed(0)}%
              </Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Location</Text>
              <Text style={styles.metaValue}>{result.extracted_location ?? '—'}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Step-by-step trace</Text>
          {result.steps.map((s, i) => (
            <View key={i} style={styles.stepRow}>
              <Text style={styles.stepIndex}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepName}>{s.step}</Text>
                <Text style={styles.stepDetail}>{s.detail}</Text>
                <Text style={styles.stepResult} numberOfLines={2}>
                  → {s.result}
                </Text>
              </View>
            </View>
          ))}

          {legal ? (
            <>
              <Text style={styles.sectionTitle}>Mapped legal advice</Text>
              <View style={styles.legalBox}>
                <Text style={styles.legalTitle}>{legal.legislation_title}</Text>
                <Text style={styles.legalCitation}>{legal.legislation_citation}</Text>
              </View>
            </>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, paddingBottom: 40 },
  title: { color: colors.ink, fontSize: 22, fontWeight: '900' },
  subtitle: { color: colors.muted, marginTop: 6, marginBottom: 18, lineHeight: 19 },
  label: { color: colors.ink, fontWeight: '900', marginBottom: 8, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' },
  input: {
    minHeight: 120,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    color: colors.ink,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  samplesRow: { gap: 8, paddingVertical: 12 },
  sampleChip: {
    backgroundColor: '#E6ECEF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sampleText: { color: '#53646E', fontSize: 11, fontWeight: '700' },
  primary: {
    backgroundColor: colors.teal,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryText: { color: '#FFFFFF', fontWeight: '900' },
  resultWrap: { marginTop: 22 },
  modeRow: { marginBottom: 14 },
  modeBadge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  modeBadgeAI: { backgroundColor: '#087B78' },
  modeBadgeFallback: { backgroundColor: '#52636D' },
  modeNote: { marginTop: 7, color: colors.muted, fontSize: 11, lineHeight: 16 },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  metaCell: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  metaLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  metaValue: { color: colors.ink, fontSize: 16, fontWeight: '900', marginTop: 4 },
  sectionTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 6,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  stepIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.tealDark,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '900',
    fontSize: 12,
    overflow: 'hidden',
  },
  stepName: { color: colors.ink, fontWeight: '900', fontSize: 13 },
  stepDetail: { color: colors.muted, fontSize: 11, marginTop: 3 },
  stepResult: { color: colors.tealDark, fontSize: 12, marginTop: 4, fontWeight: '700' },
  legalBox: {
    backgroundColor: '#EEF4F5',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: colors.teal,
  },
  legalTitle: { color: colors.ink, fontWeight: '800', fontSize: 13 },
  legalCitation: { color: colors.tealDark, fontSize: 11, fontWeight: '700', marginTop: 3 },
});