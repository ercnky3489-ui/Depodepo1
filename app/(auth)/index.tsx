import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, T } from '../../src/components/ui';
import { signInWithApple, signInWithGoogle } from '../../src/lib/auth';
import { color, space } from '../../src/theme/tokens';

export default function Welcome() {
  const [busy, setBusy] = useState<'google' | null>(null);

  const apple = async () => {
    try {
      await signInWithApple();
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code !== 'ERR_REQUEST_CANCELED') Alert.alert('Apple ile giriş yapılamadı', 'Lütfen tekrar dene.');
    }
  };

  const google = async () => {
    setBusy('google');
    try {
      await signInWithGoogle();
    } catch {
      Alert.alert('Google ile giriş yapılamadı', 'Lütfen tekrar dene.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg, paddingHorizontal: space[6] }}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <T style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 44, letterSpacing: -1.4 }}>
          BOOK<T style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 44, letterSpacing: -1.4, textShadowColor: 'rgba(0,229,160,0.55)', textShadowRadius: 14 }} c={color.primary}>FLIX</T>
        </T>
        <T v="titleMd" style={{ marginTop: space[4] }}>Okuduklarını ve izlediklerini paylaş.</T>
        <T v="body" c={color.textMuted} style={{ marginTop: space[2] }}>
          Alıntılar, incelemeler ve listelerle zevkine yakın okurları ve izleyicileri bul.
        </T>
      </View>
      <View style={{ gap: space[3], paddingBottom: space[6] }}>
        {Platform.OS === 'ios' ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={14}
            style={{ height: 50 }}
            onPress={apple}
          />
        ) : null}
        <Button title="Google ile devam et" kind="secondary" onPress={google} loading={busy === 'google'} />
        <Button title="E-posta ile devam et" kind="secondary" onPress={() => router.push('/(auth)/email')} />
        <T v="caption" c={color.textFaint} style={{ textAlign: 'center', marginTop: space[2] }}>
          Devam ederek Kullanım Koşulları'nı kabul etmiş olursun. Kişisel verilerin KVKK Aydınlatma Metni'ne göre işlenir.
        </T>
      </View>
    </SafeAreaView>
  );
}
