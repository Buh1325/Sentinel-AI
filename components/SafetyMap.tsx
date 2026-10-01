import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

type Coords = { latitude: number; longitude: number };

export type SafetyMapMarker = {
  id: string;
  latitude: number;
  longitude: number;
  color: string;
  title: string;
  description: string;
};

type Props = {
  center: Coords;
  markers: SafetyMapMarker[];
  userLocation?: Coords | null;
  zoom?: number;
};

function buildHtml(center: Coords, markers: SafetyMapMarker[], userLocation?: Coords | null, zoom = 14) {
  const payload = JSON.stringify({ center, markers, userLocation, zoom }).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
html,body,#map{height:100%;width:100%;margin:0;padding:0;background:#e7eef0;}
.leaflet-control-attribution{font-size:9px!important;}
.sentinel-pin{width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 1px 5px rgba(0,0,0,.45);}
.user-pin{width:18px;height:18px;border-radius:50%;background:#2563EB;border:4px solid white;box-shadow:0 1px 6px rgba(0,0,0,.45);}
.popup-title{font:700 14px system-ui;color:#071D27;margin-bottom:4px;}
.popup-body{font:12px/1.35 system-ui;color:#425563;max-width:220px;}
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const data=${payload};
const map=L.map('map',{zoomControl:true}).setView([data.center.latitude,data.center.longitude],data.zoom);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  maxZoom:19,
  attribution:'© OpenStreetMap contributors'
}).addTo(map);
function esc(v){return String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));}
for(const item of data.markers){
  const icon=L.divIcon({className:'',html:'<div class="sentinel-pin" style="background:'+esc(item.color)+'"></div>',iconSize:[20,20],iconAnchor:[10,10]});
  L.marker([item.latitude,item.longitude],{icon}).addTo(map)
    .bindPopup('<div class="popup-title">'+esc(item.title)+'</div><div class="popup-body">'+esc(item.description)+'</div>');
}
if(data.userLocation){
  const userIcon=L.divIcon({className:'',html:'<div class="user-pin"></div>',iconSize:[18,18],iconAnchor:[9,9]});
  L.marker([data.userLocation.latitude,data.userLocation.longitude],{icon:userIcon,zIndexOffset:1000}).addTo(map).bindPopup('Your current location');
}
setTimeout(()=>map.invalidateSize(),150);
</script>
</body>
</html>`;
}

export default function SafetyMap({ center, markers, userLocation, zoom = 14 }: Props) {
  const [loading, setLoading] = useState(true);
  const html = useMemo(
    () => buildHtml(center, markers, userLocation, zoom),
    [center.latitude, center.longitude, markers, userLocation?.latitude, userLocation?.longitude, zoom],
  );

  return (
    <View style={styles.container}>
      <WebView
        key={`${center.latitude.toFixed(5)}-${center.longitude.toFixed(5)}-${markers.length}`}
        originWhitelist={['*']}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        style={styles.web}
      />
      {loading ? (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator size="large" color="#087B78" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E7EEF0' },
  web: { flex: 1, backgroundColor: '#E7EEF0' },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF3F5' },
});
