import { supabase } from '../lib/supabase';
import { Incident } from '../lib/types';

function fromRow(row: Record<string, unknown>): Incident {
  return {
    id: String(row.id),
    category: row.category as Incident['category'],
    description: String(row.description),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    severity: (row.severity as Incident['severity']) ?? 'medium',
    status: (row.status as Incident['status']) ?? 'unverified',
    created_at: String(row.created_at),
    source: 'community',
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
  });

  if (error) {
    console.warn('Supabase incident insert failed; local demo state is still active.', error.message);
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
