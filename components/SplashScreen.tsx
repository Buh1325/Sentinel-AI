// components/SplashScreen.tsx
import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { Image } from 'expo-image';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
  durationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  durationMs = 2500,
}) => {
  useEffect(() => {
    const timer = setTimeout(onFinish, durationMs);
    return () => clearTimeout(timer);
  }, [onFinish, durationMs]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/anilogo.gif')}
        style={styles.gif}
        contentFit="contain"
        autoplay
      />
      <Text style={styles.tagline}>Personal Safety Intelligence</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#071D27',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gif: {
    width: width * 0.65,
    height: height * 0.35,
  },
  tagline: {
    color: '#BFD0D8',
    fontSize: 12,
    letterSpacing: 3,
    fontWeight: '700',
    marginTop: 20,
    textTransform: 'uppercase',
  },
});