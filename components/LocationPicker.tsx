import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { getCurrentLocation } from '../lib/location';

type Coords = { latitude: number; longitude: number };

type SearchResult = {
  display_name: string;
  lat: string;
  lon: string;
};

type Props = {
  value: Coords;
  label?: string | null;
  onChange: (location: Coords, label: string) => void;
};

async function reverseGeocode(coords: Coords): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(String(coords.latitude))}&lon=${encodeURIComponent(String(coords.longitude))}&zoom=18&addressdetails=1`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'Accept-Language': 'en', 'User-Agent': 'Sentinel/1.0' },
    });
    if (!response.ok) throw new Error('reverse geocoding failed');
    const data = (await response.json()) as { display_name?: string };
    return data.display_name?.trim() || `Selected location (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`;
  } catch {
    return `Selected location (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`;
  }
}

function mapHtml(value: Coords) {
  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>html,body,#map{height:100%;width:100%;margin:0;background:#e7eef0}.leaflet-control-attribution{font-size:8px!important}</style>
</head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const start=[${value.latitude},${value.longitude}];
const map=L.map('map').setView(start,16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);
const marker=L.marker(start,{draggable:true}).addTo(map);
function send(latlng){window.ReactNativeWebView.postMessage(JSON.stringify({type:'location',latitude:latlng.lat,longitude:latlng.lng}));}
map.on('click',e=>{marker.setLatLng(e.latlng);send(e.latlng);});
marker.on('dragend',()=>send(marker.getLatLng()));
setTimeout(()=>map.invalidateSize(),150);
</script></body></html>`;
}

export default function LocationPicker({ value, label, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const html = useMemo(() => mapHtml(value), [value.latitude, value.longitude]);

  async function search() {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setMessage('Type at least 3 characters to search.');
      return;
    }

    setSearching(true);
    setMessage(null);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=za&limit=5&q=${encodeURIComponent(trimmed)}`;
      const response = await fetch(url, {
        headers: { Accept: 'application/json', 'Accept-Language': 'en', 'User-Agent': 'Sentinel/1.0' },
      });
      if (!response.ok) throw new Error('search service unavailable');
      const data = (await response.json()) as SearchResult[];
      setResults(data);
      if (!data.length) setMessage('No matching South African location found. Try a suburb, street, landmark or area name.');
    } catch {
      setMessage('Location search is unavailable right now. You can still tap the map or use your current location.');
    } finally {
      setSearching(false);
    }
  }

  async function selectCoords(coords: Coords, preferredLabel?: string) {
    const nextLabel = preferredLabel ?? (await reverseGeocode(coords));
    onChange(coords, nextLabel);
    setResults([]);
    setMessage(null);
  }

  async function useCurrent() {
    setLocating(true);
    setMessage(null);
    try {
      const coords = await getCurrentLocation();
      const readable = await reverseGeocode(coords);
      onChange(coords, readable || 'Current location');
    } catch {
      setMessage('Unable to read your current location. Check Android location permission and GPS.');
    } finally {
      setLocating(false);
    }
  }

  function handleMapMessage(event: WebViewMessageEvent) {
    try {
      const data = JSON.parse(event.nativeEvent.data) as { type?: string; latitude?: number; longitude?: number };
      if (data.type !== 'location' || typeof data.latitude !== 'number' || typeof data.longitude !== 'number') return;
      void selectCoords({ latitude: data.latitude, longitude: data.longitude });
    } catch {
      // Ignore malformed messages from the embedded map.
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.selectedLabel}>Selected incident location</Text>
      <Text style={styles.selectedValue} numberOfLines={2}>{label || 'Pinned location'}</Text>

      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => void search()}
          placeholder="Search suburb, street, landmark or area"
          placeholderTextColor="#94A3AA"
          style={styles.searchInput}
          returnKeyType="search"
        />
        <Pressable style={styles.searchButton} onPress={() => void search()} disabled={searching}>
          {searching ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.searchButtonText}>Search</Text>}
        </Pressable>
      </View>

      {results.length ? (
        <View style={styles.resultsBox}>
          {results.map((item, index) => (
            <Pressable
              key={`${item.lat}-${item.lon}-${index}`}
              style={[styles.resultItem, index < results.length - 1 && styles.resultDivider]}
              onPress={() => void selectCoords({ latitude: Number(item.lat), longitude: Number(item.lon) }, item.display_name)}
            >
              <Text style={styles.resultText} numberOfLines={2}>{item.display_name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <View style={styles.mapFrame}>
        <WebView
          key={`${value.latitude.toFixed(5)}-${value.longitude.toFixed(5)}`}
          originWhitelist={['*']}
          source={{ html }}
          javaScriptEnabled
          domStorageEnabled
          onMessage={handleMapMessage}
          onLoadStart={() => setMapLoading(true)}
          onLoadEnd={() => setMapLoading(false)}
          style={styles.map}
        />
        {mapLoading ? (
          <View style={styles.mapLoading} pointerEvents="none">
            <ActivityIndicator color="#087B78" />
            <Text style={styles.mapLoadingText}>Loading map…</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.mapHelp}>Tap the map or drag the pin. Sentinel stores coordinates internally, but you only need to choose the place visually.</Text>
      <Pressable style={styles.currentButton} onPress={() => void useCurrent()} disabled={locating}>
        <Text style={styles.currentButtonText}>{locating ? 'Getting location…' : 'Use my current location'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#DFE7EB', padding: 14, marginBottom: 14 },
  selectedLabel: { color: '#61727C', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.7 },
  selectedValue: { color: '#071D27', fontWeight: '900', fontSize: 14, marginTop: 5, lineHeight: 19 },
  searchRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  searchInput: { flex: 1, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: '#DFE7EB', paddingHorizontal: 12, color: '#071D27', backgroundColor: '#FAFCFC' },
  searchButton: { minWidth: 78, minHeight: 48, borderRadius: 12, backgroundColor: '#087B78', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  searchButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },
  resultsBox: { borderWidth: 1, borderColor: '#DFE7EB', borderRadius: 12, marginTop: 8, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  resultItem: { paddingHorizontal: 12, paddingVertical: 11 },
  resultDivider: { borderBottomWidth: 1, borderBottomColor: '#EEF2F4' },
  resultText: { color: '#324B58', fontSize: 12, lineHeight: 17 },
  message: { color: '#7A8A92', fontSize: 11, lineHeight: 15, marginTop: 8 },
  mapFrame: { height: 240, borderRadius: 14, overflow: 'hidden', marginTop: 12, borderWidth: 1, borderColor: '#D7E1E5', backgroundColor: '#E9EFF1' },
  map: { flex: 1, backgroundColor: '#E9EFF1' },
  mapLoading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#EEF3F5' },
  mapLoadingText: { color: '#61727C', fontSize: 11, fontWeight: '700' },
  mapHelp: { color: '#7A8A92', fontSize: 10, marginTop: 7, lineHeight: 14 },
  currentButton: { marginTop: 10, borderRadius: 12, backgroundColor: '#E5F2F1', paddingVertical: 12, alignItems: 'center' },
  currentButtonText: { color: '#075D5B', fontWeight: '900', fontSize: 12 },
});
