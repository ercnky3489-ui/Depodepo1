import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconBack } from '../../src/components/icons';
import { Button, T } from '../../src/components/ui';
import { sendEmailCode, verifyEmailCode } from '../../src/lib/auth';
import { color, space } from '../../src/theme/tokens';
import { inputStyle } from '../../src/theme/inputs';

export default function EmailSignIn() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const send = async () => {
    setBusy(true); setError(null);
    try { await sendEmailCode(email.trim().toLowerCase()); setSent(true); }
    catch { setError('Kod gönderilemedi. E-posta adresini kontrol et.'); }
    finally { setBusy(false); }
  };

  const verify = async () => {
    setBusy(true); setError(null);
    try { await verifyEmailCode(email.trim().toLowerCase(), code.trim()); }
    catch { setError('Kod doğrulanamadı. Yeni kod isteyebilirsin.'); }
    finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, padding: space[4] }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Geri" style={{ width: 44, height: 44, justifyContent: 'center' }}>
          <IconBack />
        </Pressable>
        <T v="displayLg" style={{ marginTop: space[4] }}>{sent ? 'Kodu gir' : 'E-posta ile giriş'}</T>
        <T v="body" c={color.textMuted} style={{ marginTop: space[2] }}>
          {sent ? `${email} adresine 6 haneli bir kod gönderdik.` : 'Şifre yok: adresine tek kullanımlık bir kod göndereceğiz.'}
        </T>
        <View style={{ gap: space[3], marginTop: space[6] }}>
          {!sent ? (
            <TextInput value={email} onChangeText={setEmail} placeholder="ornek@eposta.com" placeholderTextColor={color.textFaint}
              autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress"
              accessibilityLabel="E-posta adresi" style={inputStyle} />
          ) : (
            <TextInput value={code} onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))} placeholder="123456" placeholderTextColor={color.textFaint}
              keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" accessibilityLabel="Doğrulama kodu"
              style={[inputStyle, { letterSpacing: 8, fontSize: 22, textAlign: 'center' }]} />
          )}
          {error ? <T v="caption" c={color.danger}>{error}</T> : null}
          {!sent
            ? <Button title="Kod gönder" onPress={send} disabled={!validEmail} loading={busy} />
            : <Button title="Giriş yap" onPress={verify} disabled={code.length !== 6} loading={busy} />}
          {sent ? <Button title="Yeni kod gönder" kind="ghost" onPress={send} /> : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
