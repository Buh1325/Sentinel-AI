// App.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import EmergencyButton from './components/EmergencyButton';
import IncidentCard from './components/IncidentCard';
import Pill from './components/Pill';
import { SentinelProvider, useSentinel } from './context/SentinelContext';
import { communityPosts, DEMO_REGION } from './data/demoData';
import { ensureLocationPermission, getCurrentLocation } from './lib/location';
import { useSafetyMode } from './hooks/useSafetyMode';
import { IncidentCategory } from './lib/types';
import { runAgent, AgentResult } from './services/agent';
import { createTestEmergencyAlert } from './services/emergency';
import { SplashScreen } from './components/SplashScreen';
import { LoginScreen } from './components/LoginScreen';
import { SignUpScreen } from './components/SignUpScreen';
import { CategorizationDemo } from './components/CategorizationDemo';
import { LegalAdviceCard } from './components/LegalAdviceCard';

const colors = {
  ink: '#071D27',
  muted: '#61727C',
  bg: '#F4F7F8',
  card: '#FFFFFF',
  teal: '#087B78',
  tealDark: '#075D5B',
  red: '#B9342E',
  line: '#DFE7EB',
};

type Screen = 'Home' | 'Map' | 'Report' | 'Agent' | 'Alerts' | 'Community' | 'News' | 'Classify';
type Focus = { latitude: number; longitude: number } | null;
type Go = (screen: Screen, focus?: Focus) => void;
type SafetyMode = ReturnType<typeof useSafetyMode>;

const categories: IncidentCategory[] = [
  'Robbery',
  'Hijacking',
  'Kidnapping',
  'Suspicious activity',
  'Assault',
  'Domestic Dispute',
  'Break-In',
  'Other',
];

// ============================================================================
// Shared UI
// ============================================================================

function Header({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <View style={styles.header}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.pageTitle}>{title}</Text>
      {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

// ============================================================================
// Screens
// ============================================================================

function HomeScreen({ go, safety }: { go: Go; safety: SafetyMode }) {
  const { incidents, profile } = useSentinel();
  const { active: safetyMode, busy: checking, text: safetyText } = safety;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.brandRow}>
        <View style={styles.brandMark}><Text style={styles.brandMarkText}>S</Text></View>
        <View>
          <Text style={styles.brand}>SENTINEL</Text>
          <Text style={styles.brandSub}>
            {profile?.full_name ? `Signed in as ${profile.full_name}` : 'Personal Safety Intelligence'}
          </Text>
        </View>
      </View>

      <View style={styles.hero}>
        <Pill label="HACKATHON PROTOTYPE" tone="success" />
        <Text style={styles.heroTitle}>Know what matters around you — before it becomes your problem.</Text>
        <Text style={styles.heroText}>
          Sentinel combines community reports, live SA crime news, location context and
          proactive safety guidance.
        </Text>
        <View style={styles.heroActions}>
          <Pressable style={styles.primaryButton} onPress={() => go('Report')}>
            <Text style={styles.primaryButtonText}>Report incident</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => go('Map')}>
            <Text style={styles.secondaryButtonText}>Open map</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>Safety Mode</Text>
        <Pill label={safetyMode ? 'ACTIVE' : 'READY'} tone={safetyMode ? 'success' : 'neutral'} />
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Context, not just pins</Text>
        <Text style={styles.cardBody}>{safetyText}</Text>
        <View style={styles.stackGap}>
          <Pressable style={styles.primaryButton} disabled={checking} onPress={safetyMode ? safety.stop : safety.start}>
            <Text style={styles.primaryButtonText}>
              {checking ? 'Checking location…' : safetyMode ? 'Stop Safety Mode' : 'Start Safety Mode'}
            </Text>
          </Pressable>
          <Pressable style={styles.ghostButton} onPress={safety.showDemoAlert}>
            <Text style={styles.ghostButtonText}>Demo route alert</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.metricRow}>
        <View style={styles.metric}><Text style={styles.metricValue}>{incidents.length}</Text><Text style={styles.metricLabel}>visible reports</Text></View>
        <View style={styles.metric}><Text style={styles.metricValue}>{incidents.filter((x) => x.status !== 'unverified').length}</Text><Text style={styles.metricLabel}>corroborated / official</Text></View>
      </View>

      <Text style={styles.sectionTitle}>AI Classification</Text>
      <Pressable style={styles.card} onPress={() => go('Classify')}>
        <Text style={styles.cardTitle}>See the AI categorise a live report →</Text>
        <Text style={styles.cardBody}>
          Watch raw text move through category, severity, location, and confidence extraction.
        </Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Emergency</Text>
      <EmergencyPanel />
      <Text style={styles.footnote}>
        Preloaded records are fictional sample data. Do not use this hackathon build as an emergency service.
      </Text>
    </ScrollView>
  );
}

function MapScreen({ focus }: { focus: Focus }) {
  const { incidents } = useSentinel();
  const [selected, setSelected] = useState<IncidentCategory | 'All'>('All');
  const [canShowUser, setCanShowUser] = useState(false);
  const [locating, setLocating] = useState(false);
  const mapRef = useRef<MapView>(null);
  const visible = useMemo(
    () => (selected === 'All' ? incidents : incidents.filter((x) => x.category === selected)),
    [incidents, selected]
  );

  useEffect(() => {
    ensureLocationPermission().then(() => setCanShowUser(true)).catch(() => setCanShowUser(false));
  }, []);

  useEffect(() => {
    if (focus) mapRef.current?.animateToRegion({ ...focus, latitudeDelta: 0.012, longitudeDelta: 0.012 }, 500);
  }, [focus]);

  async function centreOnMe() {
    setLocating(true);
    try {
      const me = await getCurrentLocation();
      setCanShowUser(true);
      mapRef.current?.animateToRegion({ ...me, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 500);
    } catch (error) {
      Alert.alert('Location unavailable', error instanceof Error ? error.message : 'Unable to determine your location.');
    } finally {
      setLocating(false);
    }
  }

  return (
    <View style={styles.flex}>
      <View style={styles.mapHeader}>
        <Header eyebrow="COMMUNITY INTELLIGENCE" title="Safety map" subtitle="Reports are observations, not proof of criminal activity." />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {(['All', ...categories] as const).map((category) => (
            <Pressable key={category} onPress={() => setSelected(category)} style={[styles.filter, selected === category && styles.filterActive]}>
              <Text style={[styles.filterText, selected === category && styles.filterTextActive]}>{category}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={focus ? { ...focus, latitudeDelta: 0.012, longitudeDelta: 0.012 } : DEMO_REGION}
        showsUserLocation={canShowUser}
        showsMyLocationButton={false}
      >
        {visible.map((incident) => (
          <Marker
            key={incident.id}
            coordinate={{ latitude: incident.latitude, longitude: incident.longitude }}
            title={incident.category}
            description={`${incident.status} · ${incident.description}`}
            pinColor={incident.severity === 'high' || incident.severity === 'critical' ? '#B9342E' : '#D88915'}
          />
        ))}
      </MapView>
      <Pressable style={styles.locateButton} onPress={centreOnMe} disabled={locating}>
        <Text style={styles.locateText}>{locating ? '…' : '◎'}</Text>
      </Pressable>
      <View style={styles.mapLegend}>
        <Text style={styles.mapLegendText}>{visible.length} visible report{visible.length === 1 ? '' : 's'} · sample + session data</Text>
      </View>
    </View>
  );
}

function ReportScreen({ go }: { go: Go }) {
  const { addIncident } = useSentinel();
  const [category, setCategory] = useState<IncidentCategory>('Robbery');
  const [description, setDescription] = useState('');
  const [coords, setCoords] = useState({ latitude: DEMO_REGION.latitude, longitude: DEMO_REGION.longitude });
  const [busy, setBusy] = useState(false);

  async function useLocation() {
    try {
      const location = await getCurrentLocation();
      setCoords(location);
      Alert.alert('Location added', 'Your current coordinates will be used for this demo report.');
    } catch {
      Alert.alert('Location unavailable', 'Keeping the demo map location.');
    }
  }

  async function submit() {
    if (!description.trim()) {
      Alert.alert('Add a description', 'Briefly describe what was observed.');
      return;
    }
    setBusy(true);
    try {
      const { incident, synced } = await addIncident({
        category,
        description: description.trim(),
        ...coords,
      });
      setDescription('');
      Alert.alert(
        'Report recorded',
        synced
          ? 'The report is marked unverified, is visible on the map, and was saved to the cloud.'
          : 'The report is marked unverified and is visible on the map in this session (not saved to the cloud).',
        [
          { text: 'View map', onPress: () => go('Map', { latitude: incident.latitude, longitude: incident.longitude }) },
          { text: 'OK' },
        ],
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Header eyebrow="OBSERVE · RECORD · REVIEW" title="Report an incident" subtitle="Do not submit real victim identities or allegations in this hackathon build." />
        <Text style={styles.inputLabel}>Incident category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRowNoPad}>
          {categories.map((item) => (
            <Pressable key={item} onPress={() => setCategory(item)} style={[styles.filter, category === item && styles.filterActive]}>
              <Text style={[styles.filterText, category === item && styles.filterTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.inputLabel}>What did you observe?</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Example: I witnessed a phone robbery near the intersection…"
          multiline
          style={styles.textArea}
          placeholderTextColor="#98A5AC"
        />

        <Text style={styles.inputLabel}>Report location</Text>
        <View style={styles.locationCard}>
          <Text style={styles.coords}>{coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}</Text>
          <Pressable onPress={useLocation}><Text style={styles.link}>Use my current location</Text></Pressable>
        </View>

        <LegalAdviceCard category={category} />

        <Pressable style={styles.primaryButton} disabled={busy} onPress={submit}>
          <Text style={styles.primaryButtonText}>{busy ? 'Recording…' : 'Submit report'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AlertsScreen() {
  const { notifications } = useSentinel();
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Header eyebrow="PROACTIVE SIGNALS" title="Alerts" subtitle="Why you are being warned matters as much as the warning itself." />
      {notifications.length === 0 ? (
        <Text style={styles.cardBody}>No alerts yet.</Text>
      ) : null}
      {notifications.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Pill label={item.type} tone={item.type === 'emergency' ? 'danger' : item.type === 'safety' ? 'warning' : 'info'} />
          </View>
          <Text style={styles.cardBody}>{item.message}</Text>
          <Text style={styles.meta}>{new Date(item.created_at).toLocaleString()}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function CommunityScreen() {
  const { incidents } = useSentinel();
  const [selected, setSelected] = useState<IncidentCategory | null>(null);

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Header eyebrow="NEWS + COMMUNITY" title="Safety feed" subtitle="Official, community and safety content are deliberately labelled differently." />
      {communityPosts.map((post) => (
        <View key={post.id} style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.cardTitle}>{post.title}</Text>
            <Pill label={post.tag} tone={post.tag === 'Official' ? 'success' : post.tag === 'Community' ? 'warning' : 'info'} />
          </View>
          <Text style={styles.cardBody}>{post.body}</Text>
          <Text style={styles.meta}>{new Date(post.created_at).toLocaleString()}</Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Latest incident records</Text>
          {incidents.slice(0, 3).map((incident) => (
        <Pressable
          key={incident.id}
          onPress={() => setSelected(incident.category)}
        >
          <IncidentCard incident={incident} />
        </Pressable>
      ))}

      {selected ? (
        <>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Legal guidance for {selected}</Text>
            <Pressable onPress={() => setSelected(null)}>
              <Text style={styles.link}>Close</Text>
            </Pressable>
          </View>
          <LegalAdviceCard category={selected} />
        </>
      ) : null}
    </ScrollView>
  );
}

function NewsScreen() {
  const { news, newsLoading, refreshNews, currentCity } = useSentinel();

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Header
        eyebrow="LIVE SA CRIME FEED"
        title="Local safety news"
        subtitle={
          currentCity
            ? `Filtered for ${currentCity.name}, ${currentCity.province}`
            : 'Based on your GPS location'
        }
      />
      <Pressable style={styles.ghostButton} onPress={refreshNews} disabled={newsLoading}>
        <Text style={styles.ghostButtonText}>
          {newsLoading ? 'Refreshing…' : 'Refresh feed'}
        </Text>
      </Pressable>
      {newsLoading ? <ActivityIndicator color={colors.teal} style={{ marginTop: 12 }} /> : null}
      {news.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            {item.category ? <Pill label={item.category} tone="info" /> : null}
          </View>
          <Text style={styles.cardBody} numberOfLines={4}>{item.description}</Text>
          <View style={styles.newsMetaRow}>
            <Text style={styles.meta}>
              {item.source} · {new Date(item.published_at).toLocaleString()}
            </Text>
            {item.severity ? (
              <Text style={[styles.meta, { color: item.severity === 'high' || item.severity === 'critical' ? colors.red : colors.tealDark, fontWeight: '800' }]}>
                {item.severity.toUpperCase()}
              </Text>
            ) : null}
          </View>
          {item.confidence != null ? (
            <Text style={styles.meta}>
              Category confidence: {(item.confidence * 100).toFixed(0)}%
            </Text>
          ) : null}
        </View>
      ))}
      {!newsLoading && news.length === 0 ? (
        <Text style={styles.cardBody}>No SA crime news found for your area right now.</Text>
      ) : null}
    </ScrollView>
  );
}

function ClassifyScreen() {
  return <CategorizationDemo />;
}

function EmergencyPanel() {
  const { addNotification } = useSentinel();
  const [loading, setLoading] = useState(false);
  const [lastAlert, setLastAlert] = useState<string | null>(null);

  async function trigger() {
    Alert.alert(
      'Test emergency flow',
      'This hackathon prototype does not contact SAPS, private security, medical services, or any other responder.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue test',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const { alert, synced } = await createTestEmergencyAlert();
              const message = `Test alert recorded at ${new Date(alert.created_at).toLocaleTimeString()} · ${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}${synced ? ' · saved to cloud' : ' · saved on this device only'}`;
              setLastAlert(message);
              addNotification({ title: 'Test emergency event recorded', message, type: 'emergency' });
            } catch (error) {
              Alert.alert('Unable to capture location', error instanceof Error ? error.message : 'Unknown error');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  }

  return (
    <View style={styles.stackGap}>
      <EmergencyButton loading={loading} onPress={trigger} />
      {lastAlert ? (
        <View style={styles.noticeBox}>
          <Text style={styles.noticeTitle}>Latest test event</Text>
          <Text style={styles.noticeText}>{lastAlert}</Text>
        </View>
      ) : null}
    </View>
  );
}

const DEFAULT_QUESTION = 'Give me a safety briefing for where I am right now.';

function AgentScreen({ safety }: { safety: SafetyMode }) {
  const { incidents, addNotification } = useSentinel();
  const [question, setQuestion] = useState(DEFAULT_QUESTION);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AgentResult | null>(null);
  const incidentsRef = useRef(incidents);
  incidentsRef.current = incidents;

  async function ask() {
    setRunning(true);
    try {
      const outcome = await runAgent(question.trim() || DEFAULT_QUESTION, {
        getLocation: getCurrentLocation,
        getIncidents: () => incidentsRef.current,
        notify: (title, message) => addNotification({ title, message, type: 'safety' }),
      });
      setResult(outcome);
    } catch (error) {
      Alert.alert('Agent failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setRunning(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Header eyebrow="AGENTIC SAFETY ASSISTANT" title="Sentinel Agent" subtitle="Reads your GPS and nearby reports, then explains what is relevant. It cannot contact responders." />
        <TextInput value={question} onChangeText={setQuestion} multiline style={[styles.textArea, styles.agentInput]} placeholderTextColor="#98A5AC" />
        <View style={styles.agentActions}>
          <Pressable style={styles.primaryButton} disabled={running} onPress={ask}>
            <Text style={styles.primaryButtonText}>{running ? 'Agent working…' : 'Ask Sentinel'}</Text>
          </Pressable>
        </View>
        {safety.active ? <Text style={styles.footnote}>Live Safety Mode is on: new nearby reports will also notify you.</Text> : null}
        {result ? (
          <View style={styles.card}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.cardTitle}>Briefing</Text>
              <Pill label={result.mode === 'ai' ? 'AI AGENT' : 'ON-DEVICE'} tone={result.mode === 'ai' ? 'success' : 'info'} />
            </View>
            <Text style={styles.cardBody}>{result.text}</Text>
            {result.note ? <Text style={styles.meta}>{result.note}</Text> : null}
            {result.steps.length ? (
              <View style={styles.noticeBox}>
                <Text style={styles.noticeTitle}>What the agent did</Text>
                {result.steps.map((step, index) => (
                  <Text key={index} style={styles.noticeText} numberOfLines={3}>
                    {index + 1}. {step.tool} → {step.result}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ============================================================================
// Navigation shell
// ============================================================================

const TAB_ICONS: Record<Screen, string> = {
  Home: '⌂',
  Map: '◎',
  Report: '+',
  Agent: '✦',
  Alerts: '!',
  Community: '◌',
  News: '📰',
  Classify: '⚙',
};

function MainApp({ onSignOut }: { onSignOut: () => void }) {
  const [screen, setScreen] = useState<Screen>('Home');
  const [mapFocus, setMapFocus] = useState<Focus>(null);
  const safety = useSafetyMode();

  const go: Go = (next, focus) => {
    if (focus !== undefined) setMapFocus(focus);
    setScreen(next);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.flex}>
        <View style={styles.flex}>
          {screen === 'Home' && <HomeScreen go={go} safety={safety} />}
          {screen === 'Map' && <MapScreen focus={mapFocus} />}
          {screen === 'Report' && <ReportScreen go={go} />}
          {screen === 'Agent' && <AgentScreen safety={safety} />}
          {screen === 'Alerts' && <AlertsScreen />}
          {screen === 'Community' && <CommunityScreen />}
          {screen === 'News' && <NewsScreen />}
          {screen === 'Classify' && <ClassifyScreen />}
        </View>
        <View style={styles.tabBar}>
          {(Object.keys(TAB_ICONS) as Screen[]).map((item) => (
            <Pressable key={item} onPress={() => setScreen(item)} style={styles.tab}>
              <Text style={[styles.tabIcon, screen === item && styles.tabActive]}>{TAB_ICONS[item]}</Text>
              <Text numberOfLines={1} style={[styles.tabText, screen === item && styles.tabActive]}>{item}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

// ============================================================================
// Auth gate
// ============================================================================

function AuthGate({ onSignedIn }: { onSignedIn: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  return mode === 'login' ? (
    <LoginScreen
      onSwitchToSignUp={() => setMode('signup')}
      onSkip={onSignedIn}
    />
  ) : (
    <SignUpScreen onSwitchToLogin={() => setMode('login')} />
  );
}

function Root() {
  const { authLoading, user } = useSentinel();
  const [showSplash, setShowSplash] = useState(true);
  const [skipAuth, setSkipAuth] = useState(false);

  const shouldShowAuth = !user && !skipAuth;

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (authLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.teal} size="large" />
        <Text style={styles.loadingText}>Restoring session…</Text>
      </View>
    );
  }

  if (shouldShowAuth) {
    return <AuthGate onSignedIn={() => setSkipAuth(true)} />;
  }

  return <MainApp onSignOut={() => setSkipAuth(false)} />;
}

export default function App() {
  return (
    <SentinelProvider>
      <Root />
    </SentinelProvider>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, gap: 12 },
  loadingText: { color: colors.muted, fontWeight: '700' },
  scrollContent: { padding: 20, paddingBottom: 36 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 18 },
  brandMark: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: '#FFFFFF', fontWeight: '900', fontSize: 20 },
  brand: { color: colors.ink, fontWeight: '900', letterSpacing: 2, fontSize: 18 },
  brandSub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  header: { marginBottom: 18 },
  eyebrow: { color: colors.teal, fontWeight: '900', fontSize: 11, letterSpacing: 1.4 },
  pageTitle: { color: colors.ink, fontWeight: '900', fontSize: 30, marginTop: 4 },
  pageSubtitle: { color: colors.muted, marginTop: 6, lineHeight: 20 },
  hero: { backgroundColor: colors.ink, padding: 22, borderRadius: 24, marginBottom: 22 },
  heroTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 28, lineHeight: 33, marginTop: 16 },
  heroText: { color: '#BFD0D8', lineHeight: 20, marginTop: 10 },
  heroActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  primaryButton: { backgroundColor: colors.teal, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center', flex: 1 },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '900' },
  secondaryButton: { backgroundColor: '#173945', borderWidth: 1, borderColor: '#2E5662', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center', flex: 1 },
  secondaryButtonText: { color: '#E7F2F4', fontWeight: '800' },
  ghostButton: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16, alignItems: 'center' },
  ghostButtonText: { color: colors.tealDark, fontWeight: '800' },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '900', marginTop: 6, marginBottom: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 17, marginBottom: 14, borderWidth: 1, borderColor: colors.line },
  cardTitle: { color: colors.ink, fontWeight: '900', fontSize: 16, flex: 1 },
  cardBody: { color: colors.muted, lineHeight: 20, marginTop: 8 },
  metricRow: { flexDirection: 'row', gap: 12, marginVertical: 18 },
  metric: { flex: 1, borderRadius: 18, backgroundColor: '#E5F2F1', padding: 16 },
  metricValue: { fontSize: 27, fontWeight: '900', color: colors.tealDark },
  metricLabel: { color: '#526F70', fontSize: 11, marginTop: 3 },
  stackGap: { gap: 10 },
  footnote: { color: '#82919A', fontSize: 11, lineHeight: 16, marginTop: 14 },
  mapHeader: { backgroundColor: colors.bg, paddingTop: 16 },
  filterRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 12 },
  filterRowNoPad: { gap: 8, paddingBottom: 8 },
  filter: { borderRadius: 999, backgroundColor: '#E6ECEF', paddingHorizontal: 13, paddingVertical: 8 },
  filterActive: { backgroundColor: colors.ink },
  filterText: { color: '#53646E', fontSize: 12, fontWeight: '800' },
  filterTextActive: { color: '#FFFFFF' },
  map: { flex: 1 },
  mapLegend: { position: 'absolute', bottom: 16, left: 16, right: 16, backgroundColor: 'rgba(7,29,39,0.90)', padding: 12, borderRadius: 14 },
  mapLegendText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12, textAlign: 'center' },
  inputLabel: { color: colors.ink, fontWeight: '900', marginTop: 10, marginBottom: 8 },
  textArea: { minHeight: 140, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 15, textAlignVertical: 'top', color: colors.ink, fontSize: 15 },
  locationCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 15, marginBottom: 14 },
  coords: { color: colors.ink, fontWeight: '800' },
  link: { color: colors.teal, fontWeight: '900', marginTop: 8 },
  noticeBox: { backgroundColor: '#EEF4F5', borderRadius: 14, padding: 14, marginVertical: 10 },
  noticeTitle: { color: colors.ink, fontWeight: '900', fontSize: 13 },
  noticeText: { color: colors.muted, lineHeight: 18, fontSize: 12, marginTop: 4 },
  meta: { color: '#87959D', fontSize: 11, marginTop: 10 },
  newsMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tabBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: colors.line, paddingVertical: 8, paddingHorizontal: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 3 },
  tabIcon: { color: '#89979E', fontSize: 19, fontWeight: '900' },
  tabText: { color: '#89979E', fontSize: 9, fontWeight: '700', marginTop: 2 },
  tabActive: { color: colors.tealDark },
  locateButton: { position: 'absolute', right: 16, bottom: 76, width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, elevation: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  locateText: { color: colors.tealDark, fontSize: 22, fontWeight: '900' },
  agentInput: { minHeight: 90 },
  agentActions: { flexDirection: 'row', gap: 10, marginVertical: 14 },
});
