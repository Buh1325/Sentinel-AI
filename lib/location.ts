import * as Location from 'expo-location';

export type Coords = { latitude: number; longitude: number };

const FIX_TIMEOUT_MS = 12000;

function toCoords(position: Location.LocationObject): Coords {
  return { latitude: position.coords.latitude, longitude: position.coords.longitude };
}

export async function ensureLocationPermission(): Promise<void> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.status === 'granted') return;

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission was not granted. Enable it in your phone settings and try again.');
  }
}

/**
 * One-shot GPS fix. Never hangs: gives up after FIX_TIMEOUT_MS and falls back
 * to the last known position (indoors / emulators often can't get a fresh fix).
 */
export async function getCurrentLocation(): Promise<Coords> {
  await ensureLocationPermission();

  if (!(await Location.hasServicesEnabledAsync())) {
    throw new Error('Location services are switched off. Turn on GPS and try again.');
  }

  try {
    const fresh = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('GPS fix timed out.')), FIX_TIMEOUT_MS),
      ),
    ]);
    return toCoords(fresh);
  } catch (error) {
    const lastKnown = await Location.getLastKnownPositionAsync();
    if (lastKnown) return toCoords(lastKnown);
    throw error instanceof Error ? error : new Error('Unable to determine your location.');
  }
}

/** Foreground-only live updates (used by Safety Mode). Call the returned function to stop. */
export async function watchLocation(onChange: (coords: Coords) => void): Promise<() => void> {
  await ensureLocationPermission();

  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 100,
      timeInterval: 15000,
    },
    (position) => onChange(toCoords(position)),
  );

  return () => subscription.remove();
}
