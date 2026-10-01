import { supabase } from '../lib/supabase';
import { Incident } from '../lib/types';

function fromRow(row: Record<string, unknown>): Incident {
  const createdAt = String(row.created_at);
  return {
    id: String(row.id),
    category: row.category as Incident['category'],
    description: String(row.description),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    severity: (row.severity as Incident['severity']) ?? 'medium',
    status: (row.status as Incident['status']) ?? 'unverified',
    created_at: createdAt,
    incident_at: row.incident_at ? String(row.incident_at) : createdAt,
    source: String(row.source ?? 'community'),
    city: row.city ? String(row.city) : undefined,
    province: row.province ? String(row.province) : undefined,
    confidence: row.confidence == null ? undefined : Number(row.confidence),
    visibility: (row.visibility as Incident['visibility']) ?? 'public',
    location_label: row.location_label ? String(row.location_label) : null,
    image_uri: row.image_uri ? String(row.image_uri) : null,
    video_uri: row.video_uri ? String(row.video_uri) : null,
    image_visibility: (row.image_visibility as Incident['image_visibility']) ?? 'private',
    video_visibility: (row.video_visibility as Incident['video_visibility']) ?? 'private',
  };
}

export async function persistIncident(incident: Incident): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase.from('incidents').insert({
    id: incident.id,
    category: incident.category,
    description: incident.description,
    latitude: incident.latitude,
    longitude: incident.longitude,
    severity: incident.severity,
    status: incident.status,
    created_at: incident.created_at,
    incident_at: incident.incident_at ?? incident.created_at,
    source: incident.source ?? 'community',
    city: incident.city ?? null,
    province: incident.province ?? null,
    confidence: incident.confidence ?? 1,
    visibility: incident.visibility ?? 'public',
    location_label: incident.location_label ?? null,
    image_uri: incident.image_uri ?? null,
    video_uri: incident.video_uri ?? null,
    image_visibility: incident.image_visibility ?? 'private',
    video_visibility: incident.video_visibility ?? 'private',
  });

  if (error) {
    console.warn('Supabase incident insert failed; local state is still active.', error.message);
    return false;
  }
  return true;
}

export async function fetchIncidents(): Promise<Incident[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.warn('Supabase incident fetch failed; using local data.', error.message);
    return [];
  }
  return (data ?? []).map(fromRow);
}

/** Live inserts from other devices. Returns an unsubscribe function. */
export function subscribeToIncidents(onInsert: (incident: Incident) => void): () => void {
  const client = supabase;
  if (!client) return () => {};

  const channel = client
    .channel('incidents-feed')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'incidents' }, (payload) =>
      onInsert(fromRow(payload.new as Record<string, unknown>)),
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
