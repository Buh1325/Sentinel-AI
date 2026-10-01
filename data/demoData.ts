import { CommunityPost, Incident, SafetyNotification } from '../lib/types';

export const DEMO_REGION = {
  latitude: -26.2041,
  longitude: 28.0473,
  latitudeDelta: 0.055,
  longitudeDelta: 0.055,
};

const agoMinutes = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000).toISOString();
const agoHours = (hours: number) => agoMinutes(hours * 60);
const agoDays = (days: number) => agoHours(days * 24);

/**
 * Session-only sample reports placed around the device on startup.
 * They are deliberately close together so the frequency colouring and
 * 2 km Safety Mode can be demonstrated immediately without saving fake rows.
 */
export function createNearbyDemoIncidents(location: { latitude: number; longitude: number }): Incident[] {
  const lat = location.latitude;
  const lon = location.longitude;
  const samples: Array<{
    id: string;
    category: Incident['category'];
    description: string;
    latOffset: number;
    lonOffset: number;
    minutesAgo: number;
    severity: Incident['severity'];
  }> = [
    {
      id: 'demo-nearby-1',
      category: 'Robbery',
      description: 'Demo report: phone robbery reported near the current area.',
      latOffset: 0.0026,
      lonOffset: 0.0018,
      minutesAgo: 24,
      severity: 'high',
    },
    {
      id: 'demo-nearby-2',
      category: 'Hijacking',
      description: 'Demo report: vehicle hijacking observation used to showcase Sentinel hotspot awareness.',
      latOffset: 0.0035,
      lonOffset: 0.0024,
      minutesAgo: 76,
      severity: 'high',
    },
    {
      id: 'demo-nearby-3',
      category: 'Suspicious activity',
      description: 'Demo report: repeated suspicious activity observed in the same surrounding area.',
      latOffset: 0.0030,
      lonOffset: 0.0035,
      minutesAgo: 160,
      severity: 'medium',
    },
  ];

  return samples.map((sample) => {
    const incidentAt = agoMinutes(sample.minutesAgo);
    return {
      id: sample.id,
      category: sample.category,
      description: sample.description,
      latitude: lat + sample.latOffset,
      longitude: lon + sample.lonOffset,
      severity: sample.severity,
      status: 'unverified',
      incident_at: incidentAt,
      created_at: incidentAt,
      source: 'demo-nearby',
      visibility: 'public',
      image_visibility: 'private',
      video_visibility: 'private',
      location_label: 'Near your current location · demo data',
    };
  });
}

export const demoIncidents: Incident[] = [
  {
    id: 'demo-1',
    category: 'Hijacking',
    description: 'Community report of a hijacking near a major intersection. Sample data only.',
    latitude: -26.1988,
    longitude: 28.0422,
    severity: 'high',
    status: 'corroborated',
    incident_at: agoMinutes(38),
    created_at: agoMinutes(32),
    source: 'demo',
    visibility: 'public',
    image_visibility: 'private',
    video_visibility: 'private',
    location_label: 'Johannesburg CBD demo area',
  },
  {
    id: 'demo-2',
    category: 'Robbery',
    description: 'Reported phone robbery near a pedestrian route. Sample data only.',
    latitude: -26.2108,
    longitude: 28.0528,
    severity: 'high',
    status: 'unverified',
    incident_at: agoMinutes(72),
    created_at: agoMinutes(66),
    source: 'demo',
    visibility: 'public',
    image_visibility: 'private',
    video_visibility: 'private',
    location_label: 'Pedestrian route demo area',
  },
  {
    id: 'demo-3',
    category: 'Suspicious activity',
    description: 'Multiple community observations of suspicious activity. Sample data only.',
    latitude: -26.201,
    longitude: 28.058,
    severity: 'medium',
    status: 'corroborated',
    incident_at: agoHours(3),
    created_at: agoHours(2.8),
    source: 'demo',
    visibility: 'public',
    image_visibility: 'private',
    video_visibility: 'private',
    location_label: 'Transport corridor demo area',
  },
  {
    id: 'demo-4',
    category: 'Kidnapping',
    description: 'Historical demo incident used to show time-aware risk context.',
    latitude: -26.216,
    longitude: 28.039,
    severity: 'high',
    status: 'official',
    incident_at: agoHours(20),
    created_at: agoHours(19.5),
    source: 'demo',
    visibility: 'public',
    image_visibility: 'private',
    video_visibility: 'private',
    location_label: 'Southern demo area',
  },
  {
    id: 'demo-5',
    category: 'Break-In',
    description: 'Residential break-in observation used for map frequency demonstration.',
    latitude: -26.1947,
    longitude: 28.0358,
    severity: 'medium',
    status: 'community-verified',
    incident_at: agoDays(1),
    created_at: agoDays(1),
    source: 'demo',
    visibility: 'public',
    image_visibility: 'private',
    video_visibility: 'private',
    location_label: 'Residential demo area',
  },
  {
    id: 'demo-6',
    category: 'Robbery',
    description: 'Second recent observation in the same general corridor to create an amber activity zone.',
    latitude: -26.1959,
    longitude: 28.0371,
    severity: 'medium',
    status: 'unverified',
    incident_at: agoDays(2),
    created_at: agoDays(2),
    source: 'demo',
    visibility: 'public',
    image_visibility: 'private',
    video_visibility: 'private',
    location_label: 'Residential demo area',
  },
  {
    id: 'demo-7',
    category: 'Assault',
    description: 'Sample assault report retained for recent-area context.',
    latitude: -26.2234,
    longitude: 28.0605,
    severity: 'high',
    status: 'unverified',
    incident_at: agoDays(4),
    created_at: agoDays(4),
    source: 'demo',
    visibility: 'public',
    image_visibility: 'private',
    video_visibility: 'private',
    location_label: 'Eastern demo area',
  },
  {
    id: 'demo-8',
    category: 'Other',
    description: 'Older incident retained so the grey historical map state can be demonstrated.',
    latitude: -26.226,
    longitude: 28.044,
    severity: 'low',
    status: 'official',
    incident_at: agoDays(12),
    created_at: agoDays(12),
    source: 'demo',
    visibility: 'public',
    image_visibility: 'private',
    video_visibility: 'private',
    location_label: 'Historical demo area',
  },
];

export const demoNotifications: SafetyNotification[] = [
  {
    id: 'notice-1',
    title: 'Safety context available',
    message: 'Sentinel can explain why an incident may be relevant to your current journey.',
    type: 'safety',
    created_at: agoMinutes(15),
  },
];

export const communityPosts: CommunityPost[] = [
  {
    id: 'post-1',
    title: 'Community safety notice',
    body: 'Use well-lit routes, remain aware of your surroundings, and use verified emergency channels when immediate assistance is required.',
    tag: 'Safety',
    created_at: agoMinutes(60),
  },
  {
    id: 'post-2',
    title: 'Verified-source placeholder',
    body: 'Official police or municipal announcements are clearly marked and separated from community observations.',
    tag: 'Official',
    created_at: agoHours(5),
  },
  {
    id: 'post-3',
    title: 'Community observation',
    body: 'Residents reported repeated suspicious activity near a transport corridor. Unverified observations remain labelled.',
    tag: 'Community',
    created_at: agoHours(7),
  },
];
