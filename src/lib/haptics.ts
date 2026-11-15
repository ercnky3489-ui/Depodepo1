import * as Haptics from 'expo-haptics';

// Tasarım sistemindeki eşleme: Hareket ve dokunma tablosu.
export const haptic = {
  like: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  save: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  follow: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  status: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  select: () => Haptics.selectionAsync(),
};
