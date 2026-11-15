// Kurulum 1/2: kullanıcı adı, profil ve KVKK rızaları. Zorunlu işleme ile isteğe bağlı rızalar ayrıdır.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, T } from '../../src/components/ui';
import { useAuth } from '../../src/lib/auth';
import { errorMessage, KVKK_VERSION, supabase } from '../../src/lib/supabase';
import { color, space } from '../../src/theme/tokens';
import { inputStyle } from '../../src/theme/inputs';

const USERNAME = /^[a-zA-Z0-9_.]{3,24}$/;

export default function OnboardingProfile() {
  const { refreshProfile } = useAuth();
  const qc = useQueryClient();
  const [username, setUsername] = useState('');
  const [debounced, setDebounced] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [kvkk, setKvkk] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(username), 350);
    return () => clearTimeout(t);
  }, [username]);

  const available = useQuery({
    queryKey: ['usernameAvailable', debounced],
    enabled: USERNAME.test(debounced),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('username_available', { p_username: debounced });
      if (error) throw error;
      return data as boolean;
    },
  });

  const formatOk = USERNAME.test(username);
  const hint = !username ? '3–24 karakter: harf, rakam, nokta ve alt çizgi.'
    : !formatOk ? 'Yalnızca harf, rakam, nokta ve alt çizgi; en az 3 karakter.'
    : available.isFetching || debounced !== username ? 'Kontrol ediliyor…'
    : available.data ? 'Kullanılabilir.' : 'Bu kullanıcı adı alınmış.';
  const canContinue = formatOk && debounced === username && available.data === true && kvkk;

  const submit = async () => {
    setBusy(true); setError(null);
    const { error: e } = await supabase.rpc('complete_onboarding', {
      p_username: username, p_display_name: displayName, p_bio: bio,
      p_kvkk_version: KVKK_VERSION, p_analytics: analytics, p_marketing: marketing,
    });
    setBusy(false);
    if (e) { setError(errorMessage(e)); return; }
    await refreshProfile();
    qc.invalidateQueries();
    router.replace('/taste');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: space[4], gap: space[4] }} keyboardShouldPersistTaps="handled">
          <T v="overline" c={color.primary}>1 / 2</T>
          <T v="displayLg">Profilini oluştur</T>

          <View style={{ gap: space[2] }}>
            <T v="label">Kullanıcı adı</T>
            <TextInput value={username} onChangeText={(t) => setUsername(t.trim())} autoCapitalize="none" autoCorrect={false}
              placeholder="aysekara" placeholderTextColor={color.textFaint} accessibilityLabel="Kullanıcı adı" style={inputStyle} />
            <T v="caption" c={formatOk && available.data ? color.primary : formatOk && available.data === false ? color.danger : color.textMuted}>{hint}</T>
          </View>
          <View style={{ gap: space[2] }}>
            <T v="label">Görünen ad</T>
            <TextInput value={displayName} onChangeText={setDisplayName} maxLength={60} placeholder="Ayşe Kara"
              placeholderTextColor={color.textFaint} accessibilityLabel="Görünen ad" style={inputStyle} />
          </View>
          <View style={{ gap: space[2] }}>
            <T v="label">Kısa biyografi</T>
            <TextInput value={bio} onChangeText={setBio} maxLength={280} multiline placeholder="Gece okuru, pazar sinemacısı."
              placeholderTextColor={color.textFaint} accessibilityLabel="Kısa biyografi" style={[inputStyle, { height: 96, paddingTop: 14, textAlignVertical: 'top' }]} />
          </View>

          <View style={{ gap: space[3], marginTop: space[2] }}>
            <Consent value={kvkk} onChange={setKvkk} title="KVKK Aydınlatma Metni'ni okudum (zorunlu)"
              body="Hesabın, paylaşımların ve kullanım verilerin hizmetin sunulması için işlenir." link={() => WebBrowser.openBrowserAsync('https://bookflix.app/kvkk')} />
            <Consent value={analytics} onChange={setAnalytics} title="Anonim kullanım analitiği (isteğe bağlı)"
              body="Uygulamayı geliştirmek için hangi ekranların kullanıldığını ölçmemize izin ver." />
            <Consent value={marketing} onChange={setMarketing} title="Bülten ve öneriler (isteğe bağlı)"
              body="Yeni özellikler ve haftalık seçkiler hakkında e-posta al." />
          </View>
          {error ? <T v="caption" c={color.danger}>{error}</T> : null}
          <Button title="Devam et" onPress={submit} disabled={!canContinue} loading={busy} style={{ marginTop: space[2] }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Consent({ value, onChange, title, body, link }: { value: boolean; onChange: (v: boolean) => void; title: string; body: string; link?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: space[3], alignItems: 'flex-start', backgroundColor: color.surface, borderRadius: 16, padding: space[4], borderWidth: 1, borderColor: color.border }}>
      <View style={{ flex: 1 }}>
        <T v="label">{title}</T>
        <T v="caption" c={color.textMuted} style={{ marginTop: 4 }}>{body}</T>
        {link ? <Pressable onPress={link} accessibilityRole="link" hitSlop={8}><T v="caption" c={color.primary} style={{ marginTop: 6 }}>Metni oku</T></Pressable> : null}
      </View>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={title} trackColor={{ true: color.primary, false: color.borderStrong }} thumbColor={color.text} />
    </View>
  );
}
