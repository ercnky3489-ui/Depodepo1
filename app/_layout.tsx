import { Fraunces_400Regular, Fraunces_400Regular_Italic, Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { registerPushToken } from '../src/api/social';
import { AuthProvider, useAuth } from '../src/lib/auth';
import { color } from '../src/theme/tokens';

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: true }),
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function RootNavigator() {
  const { session, ready, profile, profileLoading } = useAuth();
  const signedIn = !!session;
  const onboarded = !!profile?.onboarded_at;
  const loading = !ready || (signedIn && profileLoading);

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  useEffect(() => {
    if (session && onboarded) registerPushToken(session.user.id).catch(() => {});
  }, [session, onboarded]);

  // Bildirime dokununca ilgili ekrana git
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      const url = res.notification.request.content.data?.url as string | undefined;
      if (url?.startsWith('bookflix://')) router.push(url.replace('bookflix://', '/') as never);
    });
    return () => sub.remove();
  }, []);

  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg }, animation: 'slide_from_right' }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !onboarded}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="taste" />
        <Stack.Screen name="media/[id]" />
        <Stack.Screen name="user/[id]" />
        <Stack.Screen name="review/[id]" />
        <Stack.Screen name="quote/[id]" />
        <Stack.Screen name="list/[id]" />
        <Stack.Screen name="search" options={{ animation: 'fade' }} />
        <Stack.Screen name="compose" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_400Regular, Fraunces_400Regular_Italic, Fraunces_600SemiBold, Fraunces_700Bold,
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
  });
  if (!fontsLoaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: color.bg }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <StatusBar style="light" />
            <RootNavigator />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
