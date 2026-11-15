// Profil kapağı: yavaş hareketli (Ken Burns) görsel ya da palet. Avatar bunun üstüne binen bir katmanda.
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { resolveCover } from '../lib/covers';
import { color } from '../theme/tokens';

export function ProfileCover({ path, height = 200 }: { path: string | null | undefined; height?: number }) {
  const src = resolveCover(path);
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 16000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t]);
  const motion = useAnimatedStyle(() => ({
    transform: [{ scale: 1.1 + t.value * 0.08 }, { translateX: -14 + t.value * 28 }, { translateY: -6 + t.value * 10 }],
  }));
  return (
    <View style={{ height, overflow: 'hidden', backgroundColor: color.bg }}>
      <Animated.View style={[StyleSheet.absoluteFill, motion]}>
        {src.kind === 'image' ? (
          <Image source={{ uri: src.uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} accessibilityIgnoresInvertColors />
        ) : (
          <LinearGradient colors={[...src.colors]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        )}
      </Animated.View>
      <LinearGradient colors={['rgba(8,11,10,0.15)', 'rgba(8,11,10,0)', color.bg]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
    </View>
  );
}
