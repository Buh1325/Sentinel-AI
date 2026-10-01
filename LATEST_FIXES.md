# Sentinel latest fixes

This build adds the requested emergency, map, location-picker and community-video changes.

## Emergency control
- Moved to the top of Home.
- Larger touch target for faster access.
- After an explicit confirmation, Sentinel captures GPS and requests microphone access.
- If microphone permission is granted, it starts a visible ambient-audio recording.
- Recording status and elapsed time are shown on screen, with a Stop control.
- Audio recording is not covert and does not continue in the background in this Expo Go build.

## Maps
- Main Safety Map uses Leaflet + OpenStreetMap in a WebView.
- Report-location picker also uses Leaflet + OpenStreetMap.
- Users can search an area, tap the map, drag the marker, or use current GPS.
- This removes the native Google Maps/API-key dependency that caused black maps on Android.

## Community video privacy
- Public incident videos begin obscured on Community.
- Tap the cover to reveal and enable playback.
- Tap `Blur again` to re-hide the video.
