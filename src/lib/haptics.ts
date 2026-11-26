import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Tasarım sistemindeki eşleme: Hareket ve dokunma tablosu.
// Web'de expo-haptics çalışmaz; orada tarayıcının titreşim özelliği kullanılır (Android'de çalışır,
// iPhone'da Safari web sayfalarına titreşim izni vermediği için sessizce atlanır).
const web = Platform.OS === 'web' && typeof navigator !== 'undefined';
const vibrate = (p: number | number[]) => { try { if (web && 'vibrate' in navigator) navigator.vibrate(p); } catch { /* izin yok */ } };
const run = (native: () => Promise<void>, pattern: number | number[]) => () => { if (web) { vibrate(pattern); return Promise.resolve(); } return native().catch(() => undefined); };

export const haptic = {
  like: run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 10),
  save: run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 10),
  follow: run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 18),
  status: run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 18),
  success: run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), [20, 40, 30]),
  error: run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error), [40, 30, 40]),
  select: run(() => Haptics.selectionAsync(), 6),
  page: run(() => Haptics.selectionAsync(), 8),
  streak: run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), [30, 60, 30, 60, 50]),
};
