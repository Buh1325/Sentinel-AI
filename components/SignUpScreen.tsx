// components/SignUpScreen.tsx
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
};

interface Props {
  onSwitchToLogin: () => void;
}

export function SignUpScreen({ onSwitchToLogin }: Props) {
  const { signUp } = useSentinel();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!fullName.trim() || !email.trim() || password.length < 6) {
      Alert.alert(
        'Check your details',
        'Full name, email and a password of at least 6 characters are required.'
      );
      return;
    }
    setBusy(true);
    try {
      await signUp(email.trim(), password, {
        full_name: fullName.trim(),
        phone_number: phone.trim(),
      });
      Alert.alert('Account created', 'You are now signed in.');
    } catch (e) {
      Alert.alert('Sign up failed', e instanceof Error ? e.message : 'Unknown error');
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
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>
          Your personal information is encrypted in transit and at rest.
        </Text>

        <Text style={styles.label}>Full name</Text>
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          style={styles.input}
          placeholder="Thandi Mokoena"
          placeholderTextColor="#98A5AC"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor="#98A5AC"
        />

        <Text style={styles.label}>Phone (optional)</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          style={styles.input}
          placeholder="+27 ..."
          placeholderTextColor="#98A5AC"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          placeholder="At least 6 characters"
          placeholderTextColor="#98A5AC"
        />

        <Pressable style={styles.primary} onPress={submit} disabled={busy}>
          <Text style={styles.primaryText}>
            {busy ? 'Creating account…' : 'Create account'}
          </Text>
        </Pressable>
        {busy ? <ActivityIndicator color={colors.teal} style={{ marginTop: 12 }} /> : null}

        <Pressable style={styles.ghost} onPress={onSwitchToLogin}>
          <Text style={styles.ghostText}>Already have an account? Sign in</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  wrap: { padding: 24, paddingTop: 60, paddingBottom: 60 },
  title: { fontSize: 26, fontWeight: '900', color: colors.ink },
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
});