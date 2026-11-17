// Ayarlar: hesap, gizlilik, bildirimler, engellenenler, KVKK ve yasal, çıkış, hesap silme.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconBack } from '../../src/components/icons';
import { Button, T } from '../../src/components/ui';
import { signOut, useAuth, useUserId } from '../../src/lib/auth';
import { supabase } from '../../src/lib/supabase';
import { color, radius, space } from '../../src/theme/tokens';

type Settings = {
  notify_follows: boolean; notify_likes: boolean; notify_comments: boolean; notify_badges: boolean; notify_streak: boolean;
  hide_unwatched_spoilers: boolean; hide_page_numbers_default: boolean; show_activity_in_feed: boolean; allow_tagging: boolean;
};

export default function SettingsScreen() {
  const uid = useUserId();
  const { profile, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const s = useQuery({
    queryKey: ['settings', uid],
    queryFn: async () => (await supabase.from('user_settings').select('*').eq('user_id', uid!).single()).data as Settings,
  });
  const update = useMutation({
    mutationFn: async (patch: Partial<Settings>) => {
      const { error } = await supabase.from('user_settings').update(patch).eq('user_id', uid!);
      if (error) throw error;
    },
    onMutate: (patch) => qc.setQueryData<Settings>(['settings', uid], (old) => (old ? { ...old, ...patch } : old)),
    onError: () => qc.invalidateQueries({ queryKey: ['settings', uid] }),
  });
  const setPrivate = useMutation({
    mutationFn: async (v: boolean) => {
      const { error } = await supabase.from('profiles').update({ is_private: v }).eq('id', uid!);
      if (error) throw error;
    },
    onSuccess: () => refreshProfile(),
  });

  const toggle = (key: keyof Settings, title: string, body?: string) => (
    <Row title={title} body={body}>
      <Switch value={!!s.data?.[key]} onValueChange={(v) => update.mutate({ [key]: v })} accessibilityLabel={title} trackColor={{ true: color.primary, false: color.borderStrong }} />
    </Row>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Geri" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: space[2] }}><IconBack /></Pressable>
      <ScrollView contentContainerStyle={{ padding: space[4], paddingBottom: 60, gap: space[6] }}>
        <T v="displayLg">Ayarlar</T>

        <Group title="Hesap">
          <Link title="Profili düzenle" onPress={() => router.push('/settings/profile')} />
          <Link title="Engellenen kullanıcılar" onPress={() => router.push('/settings/blocked')} />
        </Group>

        <Group title="Gizlilik">
          <Row title="Gizli hesap" body="Paylaşımlarını ve kitaplığını yalnızca onayladığın takipçiler görür.">
            <Switch value={!!profile?.is_private} onValueChange={(v) => setPrivate.mutate(v)} accessibilityLabel="Gizli hesap" trackColor={{ true: color.primary, false: color.borderStrong }} />
          </Row>
          {toggle('show_activity_in_feed', 'Etkinliklerim akışta görünsün', 'Kapalıysa okuma ve izleme kayıtların takipçilerinin akışına düşmez.')}
          {toggle('hide_page_numbers_default', 'Alıntılarda sayfa numarasını gizle', 'Yeni alıntılarda varsayılan.')}
          {toggle('hide_unwatched_spoilers', 'İzlemediğim bölümlerin içeriklerini gizle', 'İşaretlenmemiş spoiler\'lara karşı ek koruma.')}
          {toggle('allow_tagging', 'Beni etiketleyebilsinler')}
        </Group>

        <Group title="Bildirimler">
          {toggle('notify_follows', 'Yeni takipçiler ve istekler')}
          {toggle('notify_likes', 'Beğeniler ve faydalı oylar')}
          {toggle('notify_comments', 'Yorumlar')}
          {toggle('notify_badges', 'Rozet ve seviye')}
          {toggle('notify_streak', 'Okuma serisi hatırlatmaları')}
        </Group>

        <Group title="Yasal ve KVKK">
          <Link title="KVKK Aydınlatma Metni" onPress={() => WebBrowser.openBrowserAsync('https://bookflix.app/kvkk')} />
          <Link title="Kullanım Koşulları ve Topluluk Kuralları" onPress={() => WebBrowser.openBrowserAsync('https://bookflix.app/kosullar')} />
          <Link title="Telif hakkı ihlali bildir" onPress={() => WebBrowser.openBrowserAsync('https://bookflix.app/telif')} />
          <Link title="Verilerimin kopyasını iste" onPress={() => Linking.openURL(`mailto:kvkk@bookflix.app?subject=${encodeURIComponent('KVKK veri talebi')}&body=${encodeURIComponent(`Kullanıcı: @${profile?.username}`)}`)} />
          <Link title="Hakkında ve veri kaynakları" onPress={() => WebBrowser.openBrowserAsync('https://bookflix.app/hakkinda')} />
        </Group>

        <Button title="Çıkış yap" kind="secondary" onPress={signOut} />
        <Button title="Hesabı sil" kind="danger" onPress={() => router.push('/settings/delete-account')} />
        <T v="caption" c={color.textFaint} style={{ textAlign: 'center' }}>
          Film ve dizi bilgileri TMDB API'si ile sağlanır; bu ürün TMDB tarafından onaylanmamıştır. Kitap bilgileri Open Library ve Google Books'tan alınır.
        </T>
      </ScrollView>
    </SafeAreaView>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: space[2] }}>
      <T v="overline" c={color.textMuted}>{title.toLocaleUpperCase('tr-TR')}</T>
      <View style={{ backgroundColor: color.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: color.border, overflow: 'hidden' }}>{children}</View>
    </View>
  );
}

function Row({ title, body, children }: { title: string; body?: string; children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[4], borderBottomWidth: 1, borderBottomColor: color.border }}>
      <View style={{ flex: 1 }}><T v="label" style={{ fontSize: 14 }}>{title}</T>{body ? <T v="caption" c={color.textMuted} style={{ marginTop: 2 }}>{body}</T> : null}</View>
      {children}
    </View>
  );
}

function Link({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [{ padding: space[4], minHeight: 52, borderBottomWidth: 1, borderBottomColor: color.border }, pressed && { backgroundColor: color.surfaceHover }]}>
      <T v="label" style={{ fontSize: 14 }}>{title}</T>
    </Pressable>
  );
}
