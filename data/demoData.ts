import { CommunityPost, Incident, SafetyNotification } from '../lib/types';

export const DEMO_REGION = {
  latitude: -26.2041,
  longitude: 28.0473,
  latitudeDelta: 0.055,
  longitudeDelta: 0.055,
};

export const demoIncidents: Incident[] = [
  {
    id: 'demo-1',
    category: 'Hijacking',
    description: 'Community report of a hijacking near a major intersection. Sample data only.',
    latitude: -26.1988,
    longitude: 28.0422,
    severity: 'high',
    status: 'corroborated',
    created_at: new Date(Date.now() - 38 * 60 * 1000).toISOString(),
    source: 'demo',
  },
  {
    id: 'demo-2',
    category: 'Robbery',
    description: 'Reported phone robbery near a pedestrian route. Sample data only.',
    latitude: -26.2108,
    longitude: 28.0528,
    severity: 'high',
    status: 'unverified',
    created_at: new Date(Date.now() - 72 * 60 * 1000).toISOString(),
    source: 'demo',
  },
  {
    id: 'demo-3',
    category: 'Suspicious activity',
    description: 'Multiple community observations of suspicious activity. Sample data only.',
    latitude: -26.201,
    longitude: 28.058,
    severity: 'medium',
    status: 'corroborated',
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    source: 'demo',
  },
  {
    id: 'demo-4',
    category: 'Kidnapping',
    description: 'Historical demo incident used to show time/category filtering.',
    latitude: -26.216,
    longitude: 28.039,
    severity: 'high',
    status: 'official',
    created_at: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
    source: 'demo',
  }
];

export const demoNotifications: SafetyNotification[] = [
  {
    id: 'notice-1',
    title: 'Safety context available',
    message: 'Sentinel can explain why an incident may be relevant to your current journey.',
    type: 'safety',
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: 'notice-2',
    title: 'Demo data active',
    message: 'All preloaded incident records are fictional hackathon demonstration data.',
    type: 'system',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  }
];

export const communityPosts: CommunityPost[] = [
  {
    id: 'post-1',
    title: 'Community safety notice',
    body: 'Use well-lit routes, remain aware of your surroundings, and use verified emergency channels when immediate assistance is required.',
    tag: 'Safety',
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post-2',
    title: 'Verified-source placeholder',
    body: 'In production, official police or municipal announcements would be clearly marked and separated from community observations.',
    tag: 'Official',
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post-3',
    title: 'Community observation',
    body: 'Residents reported repeated suspicious activity near a transport corridor. This sample shows how unverified observations remain labelled.',
    tag: 'Community',
    created_at: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
  }
];
