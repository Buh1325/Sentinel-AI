// components/LoginScreen.tsx
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSentinel } from '../context/SentinelContext';

const colors = {
  ink: '#071D27',
  muted: '#61727C',
  bg: '#F4F7F8',
  card: '#FFFFFF',
  teal: '#087B78',
  tealDark: '#075D5B',
  line: '#DFE7EB',
  red: '#B9342E',
};

interface Props {
  onSwitchToSignUp: () => void;
  onSkip: () => void;
}

export function LoginScreen({ onSwitchToSignUp, onSkip }: Props) {
  const { signIn } = useSentinel();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Enter both email and password.');
      return;
    }
    setBusy(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      Alert.alert('Sign in failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.wrap}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>S</Text>
          </View>
          <View>
            <Text style={styles.brand}>SENTINEL</Text>
            <Text style={styles.brandSub}>Personal Safety Intelligence</Text>
          </View>
        </View>

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>
          Sign in to sync your profile, incidents and safety preferences.
        </Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          placeholderTextColor="#98A5AC"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
          style={styles.input}
          placeholderTextColor="#98A5AC"
        />

        <Pressable style={styles.primary} onPress={submit} disabled={busy}>
          <Text style={styles.primaryText}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Text>
        </Pressable>
        {busy ? <ActivityIndicator color={colors.teal} style={{ marginTop: 12 }} /> : null}

        <Pressable style={styles.ghost} onPress={onSwitchToSignUp}>
          <Text style={styles.ghostText}>Don't have an account? Create one</Text>
        </Pressable>

        <Pressable style={styles.skip} onPress={onSkip}>
          <Text style={styles.skipText}>Continue as demo (no cloud sync)</Text>
        </Pressable>

        <Text style={styles.legal}>
          Your password is hashed with bcrypt server-side. Session tokens are stored in
          the device's encrypted keychain.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  wrap: { padding: 24, paddingTop: 60, paddingBottom: 60 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 30 },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: { color: '#FFFFFF', fontWeight: '900', fontSize: 20 },
  brand: { color: colors.ink, fontWeight: '900', letterSpacing: 2, fontSize: 18 },
  brandSub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  title: { fontSize: 28, fontWeight: '900', color: colors.ink },
  subtitle: { color: colors.muted, marginTop: 6, marginBottom: 24, lineHeight: 20 },
  label: {
    color: colors.ink,
    fontWeight: '900',
    marginBottom: 8,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    color: colors.ink,
    fontSize: 15,
    marginBottom: 16,
  },
  primary: {
    backgroundColor: colors.teal,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  ghost: { paddingVertical: 14, alignItems: 'center' },
  ghostText: { color: colors.tealDark, fontWeight: '800' },
  skip: { paddingVertical: 10, alignItems: 'center' },
  skipText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  legal: { color: '#98A5AC', fontSize: 10, marginTop: 24, lineHeight: 15, textAlign: 'center' },
});