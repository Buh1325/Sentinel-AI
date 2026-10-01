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
import { Incident, IncidentCategory, IncidentSeverity, NewsItem, Profile } from '../lib/types';
import { demoIncidents } from '../data/demoData';
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
  addIncident: (input: {
    category: IncidentCategory;
    description: string;
    latitude: number;
    longitude: number;
  }) => Promise<{ incident: Incident; synced: boolean }>;

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

export function SentinelProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [incidents, setIncidents] = useState<Incident[]>(demoIncidents);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [currentCity, setCurrentCity] = useState<SACity | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  const mountedRef = useRef(true);

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
      const remote = data as Incident[];
      setIncidents((prev) => {
        const merged = [...remote];
        for (const d of prev) if (!merged.find((m) => m.id === d.id)) merged.push(d);
        return merged;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

    // Realtime incident subscription
  useEffect(() => {
    if (!supabase) return;
    const sb = supabase; // capture non-null ref for closure

    const channel = sb
      .channel('public:incidents')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'incidents' },
        (payload) => {
          const next = payload.new as Incident;
          setIncidents((prev) => {
            if (prev.find((p) => p.id === next.id)) return prev;
            return [next, ...prev];
          });
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
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
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
  // Incidents
  // -------------------------------------------------------------------------
  const addIncident = useCallback(
    async (input: {
      category: IncidentCategory;
      description: string;
      latitude: number;
      longitude: number;
    }) => {
      const city = nearestSACity(input.latitude, input.longitude);
      const local: Incident = {
        id: `local-${Date.now()}`,
        category: input.category,
        severity: 'medium' as IncidentSeverity,
        status: 'unverified',
        description: input.description,
        latitude: input.latitude,
        longitude: input.longitude,
        city: city.name,
        province: city.province,
        confidence: 1.0,
        source: 'community',
        created_at: new Date().toISOString(),
      };

      setIncidents((prev) => [local, ...prev]);
      addNotification({
        title: 'Your report was recorded',
        message: `${input.category} — visible on the map as unverified.`,
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
          severity: 'medium',
          status: 'unverified',
          source: 'community',
          reporter_id: user?.id ?? null,
        })
        .select()
        .single();

      if (error || !data) return { incident: local, synced: false };
      const remote = data as Incident;
      setIncidents((prev) => {
        const withoutLocal = prev.filter((p) => p.id !== local.id);
        if (withoutLocal.find((p) => p.id === remote.id)) return withoutLocal;
        return [remote, ...withoutLocal];
      });
      return { incident: remote, synced: true };
    },
    [user?.id]
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

  // Location + News
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