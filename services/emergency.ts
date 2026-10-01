import { getCurrentLocation } from '../lib/location';
import { supabase } from '../lib/supabase';
import { EmergencyAlert } from '../lib/types';

export type EmergencyResult = { alert: EmergencyAlert; synced: boolean };

export async function createTestEmergencyAlert(): Promise<EmergencyResult> {
  const location = await getCurrentLocation();
  const alert: EmergencyAlert = {
    id: `emergency-${Date.now()}`,
    latitude: location.latitude,
    longitude: location.longitude,
    status: 'test_triggered',
    created_at: new Date().toISOString(),
  };

  let synced = false;
  if (supabase) {
    const { error } = await supabase.from('emergency_alerts').insert(alert);
    if (error) {
      console.warn('Supabase emergency insert failed; keeping local test alert only.', error.message);
    } else {
      synced = true;
    }
  }

  return { alert, synced };
}
