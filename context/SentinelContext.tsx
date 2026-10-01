// context/SentinelContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  Incident,
  IncidentCategory,
  IncidentSeverity,
  NewsItem,
  Profile,
  Visibility,
} from '../lib/types';
import { createNearbyDemoIncidents, demoIncidents, DEMO_REGION } from '../data/demoData';
import { getCurrentLocation } from '../lib/location';
import { fetchSACrimeNews } from '../services/news';
import { SACity, nearestSACity } from '../lib/saRegions';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'emergency' | 'safety' | 'info';
  created_at: string;
}

type NewIncident = {
  category: IncidentCategory;
  description: string;
  latitude: number;
  longitude: number;
  incident_at: string;
  location_label?: string | null;
  visibility: Visibility;
  image_uri?: string | null;
  video_uri?: string | null;
  image_visibility: Visibility;
  video_visibility: Visibility;
};

interface SentinelContextValue {
  // Auth
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  authLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    meta: { full_name?: string; phone_number?: string }
  ) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;

  // Incidents
  incidents: Incident[];
  addIncident: (input: NewIncident) => Promise<{ incident: Incident; synced: boolean }>;

  // Notifications
  notifications: NotificationItem[];
  addNotification: (n: Omit<NotificationItem, 'id' | 'created_at'>) => void;

  // Location + News
  currentCity: SACity | null;
  news: NewsItem[];
  newsLoading: boolean;
  refreshNews: () => Promise<void>;
}

const SentinelContext = createContext<SentinelContextValue | null>(null);

function normalizeIncident(incident: Incident): Incident {
  return {
    ...incident,
    incident_at: incident.incident_at ?? incident.created_at,
    visibility: incident.visibility ?? 'public',
    image_visibility: incident.image_visibility ?? 'private',
    video_visibility: incident.video_visibility ?? 'private',
    image_uri: incident.image_uri ?? null,
    video_uri: incident.video_uri ?? null,
    location_label: incident.location_label ?? null,
  };
}

function mergeIncidents(current: Incident[], incoming: Incident[]): Incident[] {
  const byId = new Map<string, Incident>();
  for (const item of current) byId.set(item.id, normalizeIncident(item));
  for (const item of incoming) byId.set(item.id, normalizeIncident(item));
  return [...byId.values()].sort(
    (a, b) =>
      new Date(b.incident_at ?? b.created_at).getTime() -
      new Date(a.incident_at ?? a.created_at).getTime(),
  );
}

export function SentinelProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [incidents, setIncidents] = useState<Incident[]>(demoIncidents.map(normalizeIncident));
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [currentCity, setCurrentCity] = useState<SACity | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  const mountedRef = useRef(true);
  const nearbyDemoSeeded = useRef(false);

  // -------------------------------------------------------------------------
  // Auth: restore session
  // -------------------------------------------------------------------------
  useEffect(() => {
    mountedRef.current = true;
    if (!isSupabaseConfigured || !supabase) {
      setAuthLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (!mountedRef.current) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    return () => {
      mountedRef.current = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Load profile when user changes
  useEffect(() => {
    if (!user || !supabase) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (!cancelled) setProfile((data as Profile) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // -------------------------------------------------------------------------
  // Demo seeding: 3 recent reports within 2 km of the current device.
  // These are session-only and are never uploaded to Supabase.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (nearbyDemoSeeded.current) return;
    nearbyDemoSeeded.current = true;
    let cancelled = false;

    (async () => {
      let location = { latitude: DEMO_REGION.latitude, longitude: DEMO_REGION.longitude };
      try {
        location = await getCurrentLocation();
      } catch {
        // The demo region keeps the app useful if GPS is unavailable or denied.
      }
      if (cancelled) return;
      const nearby = createNearbyDemoIncidents(location);
      setIncidents((prev) => mergeIncidents(prev, nearby));
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // -------------------------------------------------------------------------
  // Load incidents from Supabase on mount / login
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error || !data || cancelled) return;
      setIncidents((prev) => mergeIncidents(prev, data as Incident[]));
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  // Realtime incident subscription. RLS controls which private reports can be read.
  useEffect(() => {
    if (!supabase) return;
    const sb = supabase;

    const channel = sb
      .channel('public:incidents')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'incidents' },
        (payload) => {
          const next = normalizeIncident(payload.new as Incident);
          setIncidents((prev) => mergeIncidents(prev, [next]));
          if (next.visibility !== 'private') {
            setNotifications((prev) => [
              {
                id: `rt-${next.id}`,
                title: 'New incident reported',
                message: `${next.category} (${next.severity}) — ${next.description}`,
                type: 'safety',
                created_at: next.created_at,
              },
              ...prev,
            ]);
          }
        }
      )
      .subscribe();

    return () => {
      void sb.removeChannel(channel);
    };
  }, [session?.user?.id]);

  // -------------------------------------------------------------------------
  // Auth actions
  // -------------------------------------------------------------------------
  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      meta: { full_name?: string; phone_number?: string }
    ) => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: meta },
      });
      if (error) throw error;
    },
    []
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<Profile>) => {
      if (!supabase || !user) throw new Error('Not signed in.');
      const { error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', user.id);
      if (error) throw error;
      setProfile((prev) => (prev ? { ...prev, ...patch } : prev));
    },
    [user]
  );

  // -------------------------------------------------------------------------
  // Notifications
  // -------------------------------------------------------------------------
  const addNotification = useCallback(
    (n: Omit<NotificationItem, 'id' | 'created_at'>) => {
      setNotifications((prev) => [
        {
          ...n,
          id: `n-${Date.now()}-${Math.random()}`,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    },
    []
  );

  // -------------------------------------------------------------------------
  // Incidents
  // -------------------------------------------------------------------------
  const addIncident = useCallback(
    async (input: NewIncident) => {
      const city = nearestSACity(input.latitude, input.longitude);
      const createdAt = new Date().toISOString();
      const local: Incident = normalizeIncident({
        id: `local-${Date.now()}`,
        category: input.category,
        severity: (input.category === 'Hijacking' || input.category === 'Kidnapping'
          ? 'high'
          : 'medium') as IncidentSeverity,
        status: 'unverified',
        description: input.description,
        latitude: input.latitude,
        longitude: input.longitude,
        city: city.name,
        province: city.province,
        confidence: 1.0,
        source: 'community',
        created_at: createdAt,
        incident_at: input.incident_at,
        location_label: input.location_label ?? null,
        visibility: input.visibility,
        image_uri: input.image_uri ?? null,
        video_uri: input.video_uri ?? null,
        image_visibility: input.image_uri ? input.image_visibility : 'private',
        video_visibility: input.video_uri ? input.video_visibility : 'private',
      });

      setIncidents((prev) => mergeIncidents(prev, [local]));
      addNotification({
        title: 'Your report was recorded',
        message:
          input.visibility === 'public'
            ? `${input.category} — public and currently unverified.`
            : `${input.category} — private. It stays off public map/community views but remains available to your safety intelligence.`,
        type: 'safety',
      });

      if (!supabase) return { incident: local, synced: false };

      const { data, error } = await supabase
        .from('incidents')
        .insert({
          category: input.category,
          description: input.description,
          latitude: input.latitude,
          longitude: input.longitude,
          city: city.name,
          province: city.province,
          severity: local.severity,
          status: 'unverified',
          source: 'community',
          reporter_id: user?.id ?? null,
          incident_at: input.incident_at,
          location_label: input.location_label ?? null,
          visibility: input.visibility,
          image_uri: input.image_uri ?? null,
          video_uri: input.video_uri ?? null,
          image_visibility: input.image_uri ? input.image_visibility : 'private',
          video_visibility: input.video_uri ? input.video_visibility : 'private',
        })
        .select()
        .single();

      if (error || !data) {
        if (error) console.warn('[incidents] cloud sync failed; local report remains available:', error.message);
        return { incident: local, synced: false };
      }

      const remote = normalizeIncident(data as Incident);
      setIncidents((prev) => {
        const withoutLocal = prev.filter((p) => p.id !== local.id);
        return mergeIncidents(withoutLocal, [remote]);
      });
      return { incident: remote, synced: true };
    },
    [addNotification, user?.id]
  );

  // -------------------------------------------------------------------------
  // Location + News
  // -------------------------------------------------------------------------
  const refreshNews = useCallback(async () => {
    setNewsLoading(true);
    try {
      const loc = await getCurrentLocation();
      const city = nearestSACity(loc.latitude, loc.longitude);
      setCurrentCity(city);
      const { items } = await fetchSACrimeNews({
        latitude: loc.latitude,
        longitude: loc.longitude,
      });
      setNews(items);
    } catch (e) {
      console.warn('[news] refresh failed', e);
    } finally {
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshNews().catch(() => {});
  }, [refreshNews]);

  const value = useMemo<SentinelContextValue>(
    () => ({
      session,
      user,
      profile,
      authLoading,
      signIn,
      signUp,
      signOut,
      updateProfile,
      incidents,
      addIncident,
      notifications,
      addNotification,
      currentCity,
      news,
      newsLoading,
      refreshNews,
    }),
    [
      session,
      user,
      profile,
      authLoading,
      signIn,
      signUp,
      signOut,
      updateProfile,
      incidents,
      addIncident,
      notifications,
      addNotification,
      currentCity,
      news,
      newsLoading,
      refreshNews,
    ]
  );

  return <SentinelContext.Provider value={value}>{children}</SentinelContext.Provider>;
}

export function useSentinel(): SentinelContextValue {
  const ctx = useContext(SentinelContext);
  if (!ctx) throw new Error('useSentinel must be used within a SentinelProvider');
  return ctx;
}
