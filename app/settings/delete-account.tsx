// Hesap silme (App Store 5.1.1(v), Google Play hesap silme politikası, KVKK).
// Hesap hemen devre dışı kalır; kimlik, profil, içerik ve dosyalar 30 gün içinde kalıcı silinir.
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconBack } from '../../src/components/icons';
import { Button, Card, T } from '../../src/components/ui';
import { signOut, useAuth } from '../../src/lib/auth';
import { errorMessage, supabase } from '../../src/lib/supabase';
import { inputStyle } from '../../src/theme/inputs';
import { color, space } from '../../src/theme/tokens';

export default function DeleteAccount() {
  const { session, profile } = useAuth();
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const isApple = session?.user.app_metadata?.provider === 'apple' || (session?.user.app_metadata?.providers ?? []).includes('apple');

  const run = async () => {
    setBusy(true);
    try {
      let appleCode: string | undefined;
      if (isApple && Platform.OS === 'ios') {
        // Apple, silmede token iptali ister: kullanıcıdan yeniden onay alınır.
        const cred = await AppleAuthentication.signInAsync({ requestedScopes: [] });
        appleCode = cred.authorizationCode ?? undefined;
      }
      const { data, error } = await supabase.functions.invoke('account-delete', { body: { apple_authorization_code: appleCode } });
      if (error) throw error;
      const date = new Date(data.purge_after).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
      Alert.alert('Hesabın silinmek üzere', `Hesabın devre dışı bırakıldı. Tüm verilerin en geç ${date} tarihinde kalıcı olarak silinecek.`);
      await signOut();
    } catch (e) {
      if ((e as { code?: string }).code !== 'ERR_REQUEST_CANCELED') Alert.alert('Silme başlatılamadı', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Geri" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: space[2] }}><IconBack /></Pressable>
      <ScrollView contentContainerStyle={{ padding: space[4], gap: space[4] }} keyboardShouldPersistTaps="handled">
        <T v="displayLg">Hesabı sil</T>
        <Card style={{ gap: space[2] }}>
          <T v="label">Silinecekler</T>
          {['Profilin, kullanıcı adın ve fotoğrafın', 'Tüm alıntıların, incelemelerin, yorumların ve listelerin', 'Kitaplığın, izleme geçmişin, puanların', 'XP, seviye ve rozetlerin', 'Takip ilişkilerin ve bildirimlerin'].map((x) => (
            <T key={x} v="bodySm" c={color.textSoft}>• {x}</T>
          ))}
        </Card>
        <T v="bodySm" c={color.textMuted}>
          Hesabın hemen devre dışı kalır ve içeriklerin kimseye görünmez. Kalıcı silme 30 gün içinde tamamlanır; bu işlem geri alınamaz.
          Yasal saklama zorunluluğu olan kayıtlar (ör. şikayet kayıtları) mevzuatın öngördüğü süre boyunca anonim olarak tutulabilir.
        </T>
        <View style={{ gap: space[2] }}>
          <T v="label">Onaylamak için kullanıcı adını yaz: @{profile?.username}</T>
          <TextInput value={confirm} onChangeText={setConfirm} autoCapitalize="none" accessibilityLabel="Kullanıcı adı onayı" style={inputStyle} />
        </View>
        <Button title="Hesabımı kalıcı olarak sil" kind="danger" onPress={run} disabled={confirm.replace('@', '') !== profile?.username} loading={busy} />
      </ScrollView>
    </SafeAreaView>
  );
}
