// lib/types.ts

// ---------------------------------------------------------------------------
// Incidents
// ---------------------------------------------------------------------------
export type IncidentCategory =
  | 'Robbery'
  | 'Hijacking'
  | 'Kidnapping'
  | 'Suspicious activity'
  | 'Assault'
  | 'Domestic Dispute'
  | 'Break-In'
  | 'Other';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export type IncidentStatus =
  | 'unverified'
  | 'corroborated'
  | 'community-verified'
  | 'official';

export interface Incident {
  id: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  status: IncidentStatus;
  description: string;
  latitude: number;
  longitude: number;
  city?: string;
  province?: string;
  confidence?: number;
  source?: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------
export interface Profile {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  home_province: string | null;
}

// ---------------------------------------------------------------------------
// Legal advice
// ---------------------------------------------------------------------------
export interface LegalAdvice {
  id: string;
  category: IncidentCategory;
  legislation_title: string;
  legislation_citation: string;
  summary: string;
  immediate_actions: string[];
  resolution_pattern: string | null;
}

// ---------------------------------------------------------------------------
// Community feed
// ---------------------------------------------------------------------------
export type CommunityPostTag = 'Official' | 'Community' | 'Safety';

export interface CommunityPost {
  id: string;
  title: string;
  body: string;
  tag: CommunityPostTag;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Notifications (in-app alert feed)
// ---------------------------------------------------------------------------
export type NotificationKind = 'emergency' | 'safety' | 'info' | 'system';

export interface SafetyNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationKind;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Emergency alerts
// ---------------------------------------------------------------------------
export interface EmergencyAlert {
  id: string;
  latitude: number;
  longitude: number;
  created_at: string;
  status?: string;
  synced?: boolean;
}

// ---------------------------------------------------------------------------
// News
// ---------------------------------------------------------------------------
export interface ClassifierStep {
  step: string;
  detail: string;
  result: string;
}

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  published_at: string;
  city?: string;
  province?: string;
  image_url?: string;
  category?: IncidentCategory;
  severity?: IncidentSeverity;
  confidence?: number;
  extracted_location?: string;
  classifier_steps?: ClassifierStep[];
}