// App.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import EmergencyButton from './components/EmergencyButton';
import IncidentCard from './components/IncidentCard';
import LocationPicker from './components/LocationPicker';
import VideoAttachment from './components/VideoAttachment';
import SafetyMap from './components/SafetyMap';
import Pill from './components/Pill';
import { SentinelProvider, useSentinel } from './context/SentinelContext';
import { communityPosts, DEMO_REGION } from './data/demoData';
import { ensureLocationPermission, getCurrentLocation } from './lib/location';
import { useSafetyMode } from './hooks/useSafetyMode';
import { IncidentCategory, Visibility } from './lib/types';
import { runAgent, AgentResult } from './services/agent';
import { createTestEmergencyAlert } from './services/emergency';
import { SplashScreen } from './components/SplashScreen';
import { LoginScreen } from './components/LoginScreen';
import { SignUpScreen } from './components/SignUpScreen';
import { CategorizationDemo } from './components/CategorizationDemo';
import { LegalAdviceCard } from './components/LegalAdviceCard';
import { hotspotColor, recentFrequency } from './services/hotspots';

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

const twoDigits = (value: number) => String(value).padStart(2, '0');
const localDateValue = (date = new Date()) => `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`;
const localTimeValue = (date = new Date()) => `${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`;

function incidentDateTimeIso(dateText: string, timeText: string): string {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText.trim());
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(timeText.trim());
  if (!dateMatch) throw new Error('Enter the incident date as YYYY-MM-DD.');
  if (!timeMatch) throw new Error('Enter the incident time as HH:MM, for example 21:45.');

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) throw new Error('Enter a valid 24-hour incident time.');

  const value = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    value.getFullYear() !== year ||
    value.getMonth() !== month - 1 ||
    value.getDate() !== day ||
    value.getHours() !== hour ||
    value.getMinutes() !== minute
  ) throw new Error('Enter a valid incident date and time.');

  if (value.getTime() > Date.now() + 5 * 60 * 1000) throw new Error('The incident time cannot be in the future.');
  return value.toISOString();
}

function PrivacyChoice({
  value,
  onChange,
  publicLabel,
  privateLabel,
}: {
  value: Visibility;
  onChange: (value: Visibility) => void;
  publicLabel: string;
  privateLabel: string;
}) {
  return (
    <View style={styles.privacyChoiceRow}>
      <Pressable onPress={() => onChange('public')} style={[styles.privacyChoice, value === 'public' && styles.privacyChoiceActive]}>
        <Text style={[styles.privacyChoiceTitle, value === 'public' && styles.privacyChoiceTitleActive]}>Public</Text>
        <Text style={[styles.privacyChoiceText, value === 'public' && styles.privacyChoiceTextActive]}>{publicLabel}</Text>
      </Pressable>
      <Pressable onPress={() => onChange('private')} style={[styles.privacyChoice, value === 'private' && styles.privacyChoiceActive]}>
        <Text style={[styles.privacyChoiceTitle, value === 'private' && styles.privacyChoiceTitleActive]}>Private</Text>
        <Text style={[styles.privacyChoiceText, value === 'private' && styles.privacyChoiceTextActive]}>{privateLabel}</Text>
      </Pressable>
    </View>
  );
}

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

      <Text style={styles.emergencyTopLabel}>Emergency assistance</Text>
      <EmergencyPanel />

      <View style={styles.hero}>
        <Pill label="PERSONAL SAFETY INTELLIGENCE" tone="success" />
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

      <Text style={styles.footnote}>
        Preloaded records are fictional sample data. Sentinel does not replace police, medical, or private emergency services.
      </Text>
    </ScrollView>
  );
}

function MapScreen({ focus }: { focus: Focus }) {
  const { incidents } = useSentinel();
  const [selected, setSelected] = useState<IncidentCategory | 'All'>('All');
  const [locating, setLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [center, setCenter] = useState<{ latitude: number; longitude: number }>(
    focus ?? { latitude: DEMO_REGION.latitude, longitude: DEMO_REGION.longitude },
  );

  // Privacy rule: private reports never expose an individual marker/location publicly.
  const publicIncidents = useMemo(
    () => incidents.filter((incident) => incident.visibility !== 'private'),
    [incidents],
  );
  const visible = useMemo(
    () => (selected === 'All' ? publicIncidents : publicIncidents.filter((x) => x.category === selected)),
    [publicIncidents, selected],
  );

  const mapMarkers = useMemo(
    () => visible.map((incident) => {
      const frequency = recentFrequency(incident, publicIncidents);
      const frequencyText = frequency === 0
        ? 'Older than 7 days'
        : `${frequency} report${frequency === 1 ? '' : 's'} within ~750 m in the last 7 days`;
      return {
        id: incident.id,
        latitude: incident.latitude,
        longitude: incident.longitude,
        color: hotspotColor(frequency),
        title: incident.category,
        description: `${frequencyText} · ${incident.status}${incident.location_label ? ` · ${incident.location_label}` : ''}`,
      };
    }),
    [visible, publicIncidents],
  );

  useEffect(() => {
    let cancelled = false;
    ensureLocationPermission()
      .then(() => getCurrentLocation())
      .then((location) => {
        if (cancelled) return;
        setUserLocation(location);
        if (!focus) setCenter(location);
      })
      .catch(() => setUserLocation(null));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (focus) setCenter(focus);
  }, [focus?.latitude, focus?.longitude]);

  async function centreOnMe() {
    setLocating(true);
    try {
      const me = await getCurrentLocation();
      setUserLocation(me);
      setCenter(me);
    } catch (error) {
      Alert.alert('Location unavailable', error instanceof Error ? error.message : 'Unable to determine your location.');
    } finally {
      setLocating(false);
    }
  }

  return (
    <View style={styles.flex}>
      <View style={styles.mapHeader}>
        <Header
          eyebrow="COMMUNITY INTELLIGENCE"
          title="Safety map"
          subtitle="Marker colour reflects recent public report frequency in the surrounding area."
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {(['All', ...categories] as const).map((category) => (
            <Pressable key={category} onPress={() => setSelected(category)} style={[styles.filter, selected === category && styles.filterActive]}>
              <Text style={[styles.filterText, selected === category && styles.filterTextActive]}>{category}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.frequencyLegend}>
          <Text style={styles.frequencyLegendTitle}>MAP COLOUR KEY · LAST 7 DAYS</Text>
          <View style={styles.frequencyLegendRow}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} /><Text style={styles.legendText}>1 report</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} /><Text style={styles.legendText}>2 reports</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} /><Text style={styles.legendText}>3+ reports</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#64748B' }]} /><Text style={styles.legendText}>Older</Text></View>
          </View>
          <Text style={styles.frequencyLegendNote}>
            Frequency uses public reports within roughly 750 m and the last 7 days. It shows report activity, not certainty that a crime will occur.
          </Text>
        </View>
      </View>

      <View style={styles.mapWebFrame}>
        <SafetyMap center={center} markers={mapMarkers} userLocation={userLocation} zoom={14} />
      </View>

      <Pressable style={styles.locateButton} onPress={centreOnMe} disabled={locating}>
        <Text style={styles.locateText}>{locating ? '…' : '◎'}</Text>
      </Pressable>
      <View style={styles.mapLegend}>
        <Text style={styles.mapLegendText}>{visible.length} public report{visible.length === 1 ? '' : 's'} shown · private reports remain available to Safety Mode and Sentinel AI</Text>
      </View>
    </View>
  );
}

function ReportScreen({ go }: { go: Go }) {
  const { addIncident } = useSentinel();
  const [category, setCategory] = useState<IncidentCategory>('Robbery');
  const [description, setDescription] = useState('');
  const [incidentDate, setIncidentDate] = useState(() => localDateValue());
  const [incidentTime, setIncidentTime] = useState(() => localTimeValue());
  const [location, setLocation] = useState({ latitude: DEMO_REGION.latitude, longitude: DEMO_REGION.longitude });
  const [locationLabel, setLocationLabel] = useState('Loading current location…');
  const locationEdited = useRef(false);
  const [busy, setBusy] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [reportVisibility, setReportVisibility] = useState<Visibility>('private');
  const [imageVisibility, setImageVisibility] = useState<Visibility>('private');
  const [videoVisibility, setVideoVisibility] = useState<Visibility>('private');

  useEffect(() => {
    let cancelled = false;
    getCurrentLocation()
      .then((current) => {
        if (cancelled || locationEdited.current) return;
        setLocation(current);
        setLocationLabel('Current location');
      })
      .catch(() => {
        if (!cancelled && !locationEdited.current) setLocationLabel('Johannesburg demo region');
      });
    return () => { cancelled = true; };
  }, []);

  function setReportPrivacy(value: Visibility) {
    setReportVisibility(value);
    if (value === 'private') {
      setImageVisibility('private');
      setVideoVisibility('private');
    }
  }

  async function addImage(source: 'library' | 'camera') {
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Camera permission required', 'Allow camera access to take a photo for the report.');
          return;
        }
      }
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.75 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.75 });
      if (!result.canceled && result.assets[0]?.uri) setImageUri(result.assets[0].uri);
    } catch (error) {
      Alert.alert('Unable to add image', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  async function addVideo(source: 'library' | 'camera') {
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Camera permission required', 'Allow camera access to record a video for the report.');
          return;
        }
      }
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['videos'], videoMaxDuration: 60 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'] });
      if (!result.canceled && result.assets[0]?.uri) setVideoUri(result.assets[0].uri);
    } catch (error) {
      Alert.alert('Unable to add video', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  async function submit() {
    if (!description.trim()) {
      Alert.alert('Add a description', 'Briefly describe what was observed.');
      return;
    }

    let incidentAt: string;
    try {
      incidentAt = incidentDateTimeIso(incidentDate, incidentTime);
    } catch (error) {
      Alert.alert('Check incident time', error instanceof Error ? error.message : 'Enter a valid incident date and time.');
      return;
    }

    setBusy(true);
    try {
      const { incident, synced } = await addIncident({
        category,
        description: description.trim(),
        latitude: location.latitude,
        longitude: location.longitude,
        incident_at: incidentAt,
        location_label: locationLabel,
        visibility: reportVisibility,
        image_uri: imageUri,
        video_uri: videoUri,
        image_visibility: reportVisibility === 'private' ? 'private' : (imageUri ? imageVisibility : 'private'),
        video_visibility: reportVisibility === 'private' ? 'private' : (videoUri ? videoVisibility : 'private'),
      });

      const wasPublic = reportVisibility === 'public';
      setDescription('');
      setImageUri(null);
      setVideoUri(null);
      setReportVisibility('private');
      setImageVisibility('private');
      setVideoVisibility('private');
      const now = new Date();
      setIncidentDate(localDateValue(now));
      setIncidentTime(localTimeValue(now));

      const storageText = synced ? 'saved to the cloud' : 'kept in this app session';
      Alert.alert(
        'Report recorded',
        wasPublic
          ? `The report is public and currently unverified. It was ${storageText}.`
          : `The report is private and will not appear on the public map or Community feed. Sentinel can still use it in your Safety Mode and AI safety deliberations. It was ${storageText}.`,
        wasPublic
          ? [
              { text: 'View map', onPress: () => go('Map', { latitude: incident.latitude, longitude: incident.longitude }) },
              { text: 'OK' },
            ]
          : [{ text: 'OK' }],
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Header
          eyebrow="OBSERVE · RECORD · REVIEW"
          title="Report an incident"
          subtitle="Choose what Sentinel may share publicly. Private reports remain available to your safety intelligence without exposing the report or location on public views."
        />

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

        <View style={styles.fieldRow}>
          <View style={styles.fieldHalf}>
            <Text style={styles.inputLabel}>Incident date</Text>
            <TextInput
              value={incidentDate}
              onChangeText={setIncidentDate}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              style={styles.compactInput}
              placeholderTextColor="#98A5AC"
            />
          </View>
          <View style={styles.fieldHalf}>
            <Text style={styles.inputLabel}>Time of incident</Text>
            <TextInput
              value={incidentTime}
              onChangeText={setIncidentTime}
              placeholder="HH:MM"
              keyboardType="numbers-and-punctuation"
              style={styles.compactInput}
              placeholderTextColor="#98A5AC"
            />
          </View>
        </View>
        <Text style={styles.helperText}>Defaults to the current date and time. Edit it when you are reporting after leaving the situation.</Text>

        <Text style={styles.inputLabel}>Who can see this report?</Text>
        <PrivacyChoice
          value={reportVisibility}
          onChange={setReportPrivacy}
          publicLabel="Can appear on the public safety map and Community feed."
          privateLabel="Hidden from public map/feed. Still considered by your Safety Mode and Sentinel AI."
        />

        <Text style={styles.inputLabel}>Photo (optional)</Text>
        <View style={styles.imagePickerCard}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.reportImagePreview} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderIcon}>▧</Text>
              <Text style={styles.imagePlaceholderText}>Attach a photo if it helps document the incident. A photo is not required.</Text>
            </View>
          )}
          <View style={styles.imageActionRow}>
            <Pressable style={styles.imageActionButton} onPress={() => void addImage('library')}><Text style={styles.imageActionText}>Choose photo</Text></Pressable>
            <Pressable style={styles.imageActionButton} onPress={() => void addImage('camera')}><Text style={styles.imageActionText}>Take photo</Text></Pressable>
            {imageUri ? <Pressable style={styles.imageRemoveButton} onPress={() => setImageUri(null)}><Text style={styles.imageRemoveText}>Remove</Text></Pressable> : null}
          </View>
        </View>

        {imageUri ? (
          <>
            <Text style={styles.inputLabel}>Who can see this photo?</Text>
            {reportVisibility === 'private' ? (
              <View style={styles.noticeBox}><Text style={styles.noticeText}>This report is private, so its photo is private too.</Text></View>
            ) : (
              <PrivacyChoice
                value={imageVisibility}
                onChange={setImageVisibility}
                publicLabel="The photo can appear in Community, blurred until a viewer taps it."
                privateLabel="The public report can appear, but this photo will not be shown."
              />
            )}
          </>
        ) : null}

        <Text style={styles.inputLabel}>Video (optional)</Text>
        <View style={styles.imagePickerCard}>
          {videoUri ? (
            <VideoAttachment uri={videoUri} label="Selected report video" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderIcon}>▶</Text>
              <Text style={styles.imagePlaceholderText}>Attach or record a short video if it helps document the incident. Video is optional.</Text>
            </View>
          )}
          <View style={styles.imageActionRow}>
            <Pressable style={styles.imageActionButton} onPress={() => void addVideo('library')}><Text style={styles.imageActionText}>Choose video</Text></Pressable>
            <Pressable style={styles.imageActionButton} onPress={() => void addVideo('camera')}><Text style={styles.imageActionText}>Record video</Text></Pressable>
            {videoUri ? <Pressable style={styles.imageRemoveButton} onPress={() => setVideoUri(null)}><Text style={styles.imageRemoveText}>Remove</Text></Pressable> : null}
          </View>
        </View>

        {videoUri ? (
          <>
            <Text style={styles.inputLabel}>Who can see this video?</Text>
            {reportVisibility === 'private' ? (
              <View style={styles.noticeBox}><Text style={styles.noticeText}>This report is private, so its video is private too.</Text></View>
            ) : (
              <PrivacyChoice
                value={videoVisibility}
                onChange={setVideoVisibility}
                publicLabel="The video can appear in Community, blurred until a viewer taps it."
                privateLabel="The public report can appear, but this video will not be shown."
              />
            )}
          </>
        ) : null}

        <Text style={styles.inputLabel}>Incident location</Text>
        <Text style={styles.helperText}>Search an area/street, tap the map, drag the pin, or use your current location. You do not need to know coordinates.</Text>
        <LocationPicker
          value={location}
          label={locationLabel}
          onChange={(nextLocation, nextLabel) => {
            locationEdited.current = true;
            setLocation(nextLocation);
            setLocationLabel(nextLabel);
          }}
        />

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
  const publicIncidents = useMemo(
    () => incidents.filter((incident) => incident.visibility !== 'private').slice(0, 5),
    [incidents],
  );

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Header eyebrow="NEWS + COMMUNITY" title="Safety feed" subtitle="Only incident records the reporter chose to make public can appear here." />
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
      {publicIncidents.length ? publicIncidents.map((incident) => (
        <Pressable key={incident.id} onPress={() => setSelected(incident.category)}>
          <IncidentCard incident={incident} community />
        </Pressable>
      )) : (
        <View style={styles.noticeBox}><Text style={styles.noticeText}>No public incident records are available yet.</Text></View>
      )}

      {selected ? (
        <>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Legal guidance for {selected}</Text>
            <Pressable onPress={() => setSelected(null)}><Text style={styles.link}>Close</Text></Pressable>
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
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, directory: 'document' });
  const recorderState = useAudioRecorderState(recorder);

  async function startEmergencyRecording() {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Microphone permission not granted',
          'Sentinel will still capture your location, but it cannot create the emergency audio recording.',
        );
        return false;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecordingUri(null);
      return true;
    } catch (error) {
      console.warn('Unable to start emergency recording', error);
      return false;
    }
  }

  async function stopEmergencyRecording() {
    try {
      await recorder.stop();
      const uri = recorder.uri ?? null;
      setRecordingUri(uri);
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
    } catch (error) {
      Alert.alert('Unable to stop recording', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  async function activate() {
    setLoading(true);
    try {
      const recordingStarted = await startEmergencyRecording();
      const { alert, synced } = await createTestEmergencyAlert();
      const message = `Emergency mode activated at ${new Date(alert.created_at).toLocaleTimeString()} · ${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}${recordingStarted ? ' · ambient audio recording started' : ''}${synced ? ' · emergency record saved to cloud' : ' · emergency record saved on this device only'}`;
      setLastAlert(message);
      addNotification({ title: 'Emergency mode activated', message, type: 'emergency' });
    } catch (error) {
      Alert.alert('Unable to activate emergency mode', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function trigger() {
    Alert.alert(
      'Activate emergency mode?',
      'Sentinel will capture your current location and request microphone access to record ambient audio around the phone. Only activate this when you intend to record.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Activate', style: 'destructive', onPress: () => void activate() },
      ],
    );
  }

  const seconds = Math.floor((recorderState.durationMillis ?? 0) / 1000);

  return (
    <View style={styles.emergencyPanel}>
      <EmergencyButton loading={loading} recording={recorderState.isRecording} onPress={trigger} />
      {recorderState.isRecording ? (
        <View style={styles.recordingBar}>
          <View style={styles.recordingDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.recordingTitle}>Emergency audio recording</Text>
            <Text style={styles.recordingText}>Microphone active · {seconds}s · audio stays on this device until you choose what to do with it.</Text>
          </View>
          <Pressable style={styles.stopRecordingButton} onPress={() => void stopEmergencyRecording()}>
            <Text style={styles.stopRecordingText}>Stop</Text>
          </Pressable>
        </View>
      ) : recordingUri ? (
        <View style={styles.noticeBox}>
          <Text style={styles.noticeTitle}>Emergency audio saved</Text>
          <Text style={styles.noticeText}>The recording is stored on this device for this emergency session.</Text>
        </View>
      ) : null}
      {lastAlert ? (
        <View style={styles.noticeBox}>
          <Text style={styles.noticeTitle}>Latest emergency event</Text>
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
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<Screen>('Home');
  const [mapFocus, setMapFocus] = useState<Focus>(null);
  const safety = useSafetyMode();

  const go: Go = (next, focus) => {
    if (focus !== undefined) setMapFocus(focus);
    setScreen(next);
  };

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
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
        <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          {(Object.keys(TAB_ICONS) as Screen[]).map((item) => (
            <Pressable key={item} onPress={() => setScreen(item)} style={styles.tab}>
              <Text style={[styles.tabIcon, screen === item && styles.tabActive]}>{TAB_ICONS[item]}</Text>
              <Text numberOfLines={1} style={[styles.tabText, screen === item && styles.tabActive]}>{item}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
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
    <SafeAreaProvider>
      <SentinelProvider>
        <Root />
      </SentinelProvider>
    </SafeAreaProvider>
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
  scrollContent: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 34 },
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
  emergencyTopLabel: { color: colors.red, fontSize: 12, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 17, marginBottom: 14, borderWidth: 1, borderColor: colors.line },
  cardTitle: { color: colors.ink, fontWeight: '900', fontSize: 16, flex: 1 },
  cardBody: { color: colors.muted, lineHeight: 20, marginTop: 8 },
  metricRow: { flexDirection: 'row', gap: 12, marginVertical: 18 },
  metric: { flex: 1, borderRadius: 18, backgroundColor: '#E5F2F1', padding: 16 },
  metricValue: { fontSize: 27, fontWeight: '900', color: colors.tealDark },
  metricLabel: { color: '#526F70', fontSize: 11, marginTop: 3 },
  stackGap: { gap: 10 },
  emergencyPanel: { gap: 10, marginBottom: 20 },
  recordingBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF1F0', borderWidth: 1, borderColor: '#F4B7B2', borderRadius: 15, padding: 12 },
  recordingDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#DC2626' },
  recordingTitle: { color: '#7F1D1D', fontWeight: '900', fontSize: 12 },
  recordingText: { color: '#9B3B35', fontSize: 10, lineHeight: 14, marginTop: 2 },
  stopRecordingButton: { backgroundColor: '#7F1D1D', borderRadius: 10, paddingHorizontal: 13, paddingVertical: 9 },
  stopRecordingText: { color: '#FFFFFF', fontWeight: '900', fontSize: 11 },
  footnote: { color: '#82919A', fontSize: 11, lineHeight: 16, marginTop: 14 },
  mapHeader: { backgroundColor: colors.bg, paddingTop: 16 },
  filterRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 12 },
  filterRowNoPad: { gap: 8, paddingBottom: 8 },
  filter: { borderRadius: 999, backgroundColor: '#E6ECEF', paddingHorizontal: 13, paddingVertical: 8 },
  filterActive: { backgroundColor: colors.ink },
  filterText: { color: '#53646E', fontSize: 12, fontWeight: '800' },
  filterTextActive: { color: '#FFFFFF' },
  mapWebFrame: { flex: 1, minHeight: 260, backgroundColor: '#E7EEF0' },
  mapLegend: { position: 'absolute', bottom: 16, left: 16, right: 16, backgroundColor: 'rgba(7,29,39,0.90)', padding: 12, borderRadius: 14 },
  mapLegendText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12, textAlign: 'center' },
  inputLabel: { color: colors.ink, fontWeight: '900', marginTop: 10, marginBottom: 8 },
  textArea: { minHeight: 140, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 15, textAlignVertical: 'top', color: colors.ink, fontSize: 15 },
  fieldRow: { flexDirection: 'row', gap: 10 },
  fieldHalf: { flex: 1 },
  compactInput: { minHeight: 50, backgroundColor: '#FFFFFF', borderRadius: 13, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 13, paddingVertical: 11, color: colors.ink, fontSize: 14 },
  helperText: { color: '#7A8A92', fontSize: 10, lineHeight: 14, marginTop: 6, marginBottom: 8 },
  imagePickerCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 12, marginBottom: 14 },
  reportImagePreview: { width: '100%', height: 210, borderRadius: 13, backgroundColor: '#E7ECEF' },
  imagePlaceholder: { minHeight: 125, borderRadius: 13, backgroundColor: '#EEF3F5', alignItems: 'center', justifyContent: 'center', padding: 20 },
  imagePlaceholderIcon: { color: colors.tealDark, fontSize: 34, fontWeight: '800' },
  imagePlaceholderText: { color: colors.muted, textAlign: 'center', lineHeight: 18, marginTop: 8, fontSize: 12 },
  imageActionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  imageActionButton: { backgroundColor: '#E5F2F1', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 13 },
  imageActionText: { color: colors.tealDark, fontWeight: '900', fontSize: 12 },
  imageRemoveButton: { backgroundColor: '#FCE8E6', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 13 },
  imageRemoveText: { color: colors.red, fontWeight: '900', fontSize: 12 },
  privacyChoiceRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  privacyChoice: { flex: 1, borderWidth: 1, borderColor: colors.line, backgroundColor: '#FFFFFF', borderRadius: 15, padding: 13, minHeight: 98 },
  privacyChoiceActive: { borderColor: colors.teal, backgroundColor: '#E5F2F1' },
  privacyChoiceTitle: { color: colors.ink, fontWeight: '900', fontSize: 14 },
  privacyChoiceTitleActive: { color: colors.tealDark },
  privacyChoiceText: { color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 5 },
  privacyChoiceTextActive: { color: '#315E60' },
  frequencyLegend: { backgroundColor: '#FFFFFF', marginHorizontal: 16, marginBottom: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 11 },
  frequencyLegendTitle: { color: colors.ink, fontSize: 10, fontWeight: '900', letterSpacing: 0.8, marginBottom: 8 },
  frequencyLegendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 11, height: 11, borderRadius: 6, borderWidth: 1, borderColor: '#FFFFFF' },
  legendText: { color: '#465A65', fontSize: 10, fontWeight: '800' },
  frequencyLegendNote: { color: '#788991', fontSize: 9, lineHeight: 13, marginTop: 7 },
  locationCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 15, marginBottom: 14 },
  coords: { color: colors.ink, fontWeight: '800' },
  link: { color: colors.teal, fontWeight: '900', marginTop: 8 },
  noticeBox: { backgroundColor: '#EEF4F5', borderRadius: 14, padding: 14, marginVertical: 10 },
  noticeTitle: { color: colors.ink, fontWeight: '900', fontSize: 13 },
  noticeText: { color: colors.muted, lineHeight: 18, fontSize: 12, marginTop: 4 },
  meta: { color: '#87959D', fontSize: 11, marginTop: 10 },
  newsMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tabBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10, paddingHorizontal: 4, minHeight: 84 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 62, paddingVertical: 5, paddingHorizontal: 1 },
  tabIcon: { color: '#89979E', fontSize: 26, lineHeight: 29, fontWeight: '900' },
  tabText: { color: '#89979E', fontSize: 10, fontWeight: '800', marginTop: 3 },
  tabActive: { color: colors.tealDark },
  locateButton: { position: 'absolute', right: 16, bottom: 76, width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, elevation: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  locateText: { color: colors.tealDark, fontSize: 22, fontWeight: '900' },
  agentInput: { minHeight: 90 },
  agentActions: { flexDirection: 'row', gap: 10, marginVertical: 14 },
});
