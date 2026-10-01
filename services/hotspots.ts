import { Incident } from '../lib/types';
import { distanceKm } from './safety';

export const HOTSPOT_DAYS = 7;
export const HOTSPOT_RADIUS_KM = 0.75;

export type HotspotLevel = 'older' | 'green' | 'amber' | 'red';

export function incidentTimestamp(incident: Incident): number {
  return new Date(incident.incident_at ?? incident.created_at).getTime();
}

export function recentFrequency(
  incident: Incident,
  incidents: Incident[],
  now = Date.now(),
): number {
  const cutoff = now - HOTSPOT_DAYS * 24 * 60 * 60 * 1000;
  if (incidentTimestamp(incident) < cutoff) return 0;

  return incidents.filter((other) => {
    if (incidentTimestamp(other) < cutoff) return false;
    return distanceKm(incident, other) <= HOTSPOT_RADIUS_KM;
  }).length;
}

export function hotspotLevel(count: number): HotspotLevel {
  if (count >= 3) return 'red';
  if (count === 2) return 'amber';
  if (count === 1) return 'green';
  return 'older';
}

export function hotspotColor(count: number): string {
  const level = hotspotLevel(count);
  if (level === 'red') return '#DC2626';
  if (level === 'amber') return '#F59E0B';
  if (level === 'green') return '#22C55E';
  return '#64748B';
}
