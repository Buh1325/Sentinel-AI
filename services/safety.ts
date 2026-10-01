import { Incident } from '../lib/types';

type Coords = { latitude: number; longitude: number };

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function distanceKm(a: Coords, b: Coords) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function findRelevantIncidents(
  location: Coords,
  incidents: Incident[],
  radiusKm = 1.5,
  hoursBack = 12,
) {
  const cutoff = Date.now() - hoursBack * 60 * 60 * 1000;

  return incidents
    .map((incident) => ({
      incident,
      distanceKm: distanceKm(location, incident),
    }))
    .filter(
      ({ incident, distanceKm: distance }) =>
        distance <= radiusKm && new Date(incident.created_at).getTime() >= cutoff,
    )
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
