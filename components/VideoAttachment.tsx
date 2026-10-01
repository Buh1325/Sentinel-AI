import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurTargetView, BlurView } from 'expo-blur';
import { useVideoPlayer, VideoView } from 'expo-video';

type Props = {
  uri: string;
  community?: boolean;
  label?: string;
};

export default function VideoAttachment({ uri, community = false, label = 'Video attachment' }: Props) {
  const [revealed, setRevealed] = useState(!community);
  const blurTarget = useRef<View | null>(null);
  const player = useVideoPlayer({ uri }, (instance) => {
    instance.loop = false;
  });

  useEffect(() => {
    if (community && !revealed) player.pause();
  }, [community, revealed, player]);

  return (
    <View style={styles.wrap}>
      <BlurTargetView ref={blurTarget} style={styles.target}>
        <VideoView
          player={player}
          style={styles.video}
          contentFit="cover"
          nativeControls={revealed}
          surfaceType="textureView"
          fullscreenOptions={{ enable: true }}
        />
      </BlurTargetView>

      {community && !revealed ? (
        <BlurView
          blurTarget={blurTarget}
          intensity={100}
          tint="dark"
          blurMethod="dimezisBlurViewSdk31Plus"
          style={styles.blur}
        >
          <Pressable style={styles.cover} onPress={() => setRevealed(true)}>
            <Text style={styles.coverIcon}>▶</Text>
            <Text style={styles.coverTitle}>Sensitive video hidden</Text>
            <Text style={styles.coverText}>Tap once to reveal and enable playback</Text>
          </Pressable>
        </BlurView>
      ) : community ? (
        <Pressable
          style={styles.reblur}
          onPress={() => {
            player.pause();
            setRevealed(false);
          }}
        >
          <Text style={styles.reblurText}>Blur again</Text>
        </Pressable>
      ) : (
        <View style={styles.previewTag}><Text style={styles.previewTagText}>{label}</Text></View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 190, borderRadius: 14, overflow: 'hidden', backgroundColor: '#071D27', marginTop: 10, position: 'relative' },
  target: { flex: 1, backgroundColor: '#071D27' },
  video: { width: '100%', height: '100%', backgroundColor: '#071D27' },
  blur: { ...StyleSheet.absoluteFillObject },
  cover: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(7,29,39,0.58)', padding: 20 },
  coverIcon: { color: '#FFFFFF', fontSize: 32, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.65)', textShadowRadius: 4 },
  coverTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 15, marginTop: 7, textShadowColor: 'rgba(0,0,0,0.65)', textShadowRadius: 4 },
  coverText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12, marginTop: 4, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.65)', textShadowRadius: 4 },
  reblur: { position: 'absolute', right: 8, top: 8, backgroundColor: 'rgba(7,29,39,0.86)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  reblurText: { color: '#FFFFFF', fontWeight: '900', fontSize: 10 },
  previewTag: { position: 'absolute', left: 8, top: 8, backgroundColor: 'rgba(7,29,39,0.80)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  previewTagText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
});
