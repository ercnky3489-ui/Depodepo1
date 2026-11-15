import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'BOOKFLIX',
  slug: 'bookflix',
  scheme: 'bookflix',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  backgroundColor: '#080B0A',
  icon: './assets/icon.png',
  ios: {
    bundleIdentifier: 'app.bookflix',
    supportsTablet: false,
    usesAppleSignIn: true,
    infoPlist: {
      NSCameraUsageDescription: 'Kitap eklerken ISBN barkodunu okumak için kameraya erişim gerekiyor.',
      NSPhotoLibraryUsageDescription: 'Profil fotoğrafı seçmek için fotoğraflarına erişim gerekiyor.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'app.bookflix',
    adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#080B0A' },
    permissions: ['CAMERA'],
  },
  plugins: [
    'expo-router',
    'expo-apple-authentication',
    'expo-font',
    ['expo-splash-screen', { image: './assets/splash.png', resizeMode: 'contain', imageWidth: 200, backgroundColor: '#080B0A' }],
    ['expo-notifications', { color: '#00E5A0' }],
    ['expo-camera', { cameraPermission: 'Kitap eklerken ISBN barkodunu okumak için kameraya erişim gerekiyor.' }],
  ],
  experiments: { typedRoutes: true },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    eas: { projectId: process.env.EAS_PROJECT_ID },
    imdbEnabled: process.env.EXPO_PUBLIC_IMDB_ENABLED === 'true',
    kvkkVersion: 'kvkk-2026-11',
  },
};

export default config;
