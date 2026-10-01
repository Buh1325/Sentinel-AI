import { useCallback, useEffect, useRef, useState } from 'react';
import { useSentinel } from '../context/SentinelContext';
import { Coords, getCurrentLocation, watchLocation } from '../lib/location';
import { findRelevantIncidents } from '../services/safety';

const IDLE_TEXT = 'Start Safety Mode to check current location context.';

/**
 * Foreground live Safety Mode. Lives above the screens so it keeps running
 * while the user moves between tabs.
 */
export function useSafetyMode() {
  const { incidents, addNotification } = useSentinel();
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState(IDLE_TEXT);

  const stopWatching = useRef<null | (() => void)>(null);
  const lastLocation = useRef<Coords | null>(null);
  const alerted = useRef(new Set<string>());
  const incidentsRef = useRef(incidents);
  incidentsRef.current = incidents;

  const evaluate = useCallback(
    (location: Coords) => {
      lastLocation.current = location;
      const relevant = findRelevantIncidents(location, incidentsRef.current);
      const nearest = relevant[0];

      if (!nearest) {
        setText('No recent incident reports found within 2 km of your current location.');
        return;
      }

      const count = relevant.length;
      setText(
        `${count} recent report${count === 1 ? '' : 's'} within 2 km. Nearest: ${nearest.incident.category}, ${nearest.distanceKm.toFixed(1)} km away.`,
      );

      const fresh = relevant.filter(({ incident }) => !alerted.current.has(incident.id));
      if (fresh.length) {
        fresh.forEach(({ incident }) => alerted.current.add(incident.id));
        const top = fresh[0]!;
        addNotification({
          title: 'Proactive safety context',
          message: `${fresh.length === 1 ? 'A recent report' : `${fresh.length} recent reports`} near you. Nearest: ${top.incident.category} (${top.incident.status}), ${top.distanceKm.toFixed(1)} km away.`,
          type: 'safety',
        });
      }
    },
    [addNotification],
  );

  const stop = useCallback(() => {
    stopWatching.current?.();
    stopWatching.current = null;
    lastLocation.current = null;
    setActive(false);
    setText(IDLE_TEXT);
  }, []);

  const start = useCallback(async () => {
    setBusy(true);
    try {
      const first = await getCurrentLocation();
      alerted.current.clear();
      evaluate(first);
      stopWatching.current = await watchLocation(evaluate);
      setActive(true);
    } catch (error) {
      setActive(false);
      setText(
        `${error instanceof Error ? error.message : 'Location was unavailable.'} You can still use "Demo route alert" below to present the concept.`,
      );
    } finally {
      setBusy(false);
    }
  }, [evaluate]);

  // A new report arriving while Safety Mode is on is re-checked against the last known position.
  useEffect(() => {
    if (active && lastLocation.current) evaluate(lastLocation.current);
  }, [incidents, active, evaluate]);

  useEffect(() => () => stopWatching.current?.(), []);

  const showDemoAlert = useCallback(() => {
    setActive(true);
    setText('DEMO ROUTE ALERT: A recent hijacking report intersects the selected route context. Compare alternatives or continue with awareness.');
    addNotification({
      title: 'Route context alert · demo',
      message: 'Recent hijacking reports overlap the selected demo journey. This is not a prediction of crime.',
      type: 'safety',
    });
  }, [addNotification]);

  return { active, busy, text, start, stop, showDemoAlert };
}
