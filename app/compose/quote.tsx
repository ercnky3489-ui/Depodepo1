// Alıntı: kitapta sayfa numarası (gizlenebilir), film/dizide sahne notu. 600 karakter sınırı (telif).
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCreateQuote } from '../../src/api/content';
import { IconBack } from '../../src/components/icons';
import { Button, Cover, Loading, T } from '../../src/components/ui';
import { effectiveLength } from '../../src/lib/format';
import { errorMessage, supabase } from '../../src/lib/supabase';
import { useUserId } from '../../src/lib/auth';
import { charsUntilXp, WITHHELD_TEXT } from '../../src/lib/xp';
import { inputStyle } from '../../src/theme/inputs';
import { PhotoQuote } from '../../src/features/quote/PhotoQuote';
import { color, space } from '../../src/theme/tokens';

export default function ComposeQuote() {
  const { mediaId } = useLocalSearchParams<{ mediaId: string }>();
  const uid = useUserId();
  const create = useCreateQuote();
  const media = useQuery({
    queryKey: ['composeMedia', mediaId],
    queryFn: async () => {
      const [{ data: m }, { data: s }] = await Promise.all([
        supabase.from('media_items').select('id, title, kind, cover_path').eq('id', mediaId).single(),
        supabase.from('user_settings').select('hide_page_numbers_default').eq('user_id', uid!).maybeSingle(),
      ]);
      return { m: m!, hideDefault: !!s?.hide_page_numbers_default };
    },
  });
  const [body, setBody] = useState('');
  const [page, setPage] = useState('');
  const [hidePage, setHidePage] = useState<boolean | null>(null);
  const [scene, setScene] = useState('');
  const [spoiler, setSpoiler] = useState(false);

  if (media.isLoading || !media.data) return <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}><Loading /></SafeAreaView>;
  const m = media.data.m;
  const isBook = m.kind === 'book';
  const hide = hidePage ?? media.data.hideDefault;
  const left = charsUntilXp(effectiveLength(body), 'quote');

  const submit = () => {
    create.mutate({
      media_id: m.id, body, has_spoiler: spoiler,
      page_number: isBook && page ? Number(page) : null, hide_page: isBook ? hide : false,
      scene_note: !isBook ? scene.trim() || null : null,
    }, {
      onSuccess: (res) => {
        const msg = res.xp > 0 ? `+${res.xp} XP kazandın.` : res.withheld_reason ? WITHHELD_TEXT[res.withheld_reason] ?? '' : '';
        Alert.alert('Alıntı paylaşıldı', msg);
        router.dismissTo(`/quote/${res.id}`);
      },
      onError: (e) => Alert.alert('Paylaşılamadı', errorMessage(e)),
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: space[4], gap: space[4] }} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Geri" style={{ width: 44, height: 44, justifyContent: 'center' }}><IconBack /></Pressable>
          <View style={{ flexDirection: 'row', gap: space[3], alignItems: 'center' }}>
            <Cover id={m.id} path={m.cover_path} width={40} />
            <View><T v="overline" c={color.primary}>ALINTI</T><T v="titleSm">{m.title}</T></View>
          </View>
          {isBook ? <PhotoQuote onPick={(t) => setBody((b) => (b ? `${b} ${t}` : t).slice(0, 600))} /> : null}
          <TextInput value={body} onChangeText={(t) => setBody(t.slice(0, 600))} multiline autoFocus placeholder={isBook ? 'Sayfadaki cümleyi yaz…' : 'Repliği yaz…'}
            placeholderTextColor={color.textFaint} accessibilityLabel="Alıntı metni"
            style={[inputStyle, { height: 180, paddingTop: 14, textAlignVertical: 'top', fontFamily: 'Fraunces_400Regular', fontSize: 18 }]} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T v="caption" c={left ? color.textMuted : color.primary}>{left ? `XP için ${left} karakter daha` : '+20 XP için hazır'}</T>
            <T v="caption" c={color.textMuted}>{body.length} / 600</T>
          </View>
          {isBook ? (
            <View style={{ flexDirection: 'row', gap: space[3], alignItems: 'center' }}>
              <TextInput value={page} onChangeText={(t) => setPage(t.replace(/\D/g, '').slice(0, 5))} keyboardType="number-pad" placeholder="Sayfa"
                placeholderTextColor={color.textFaint} accessibilityLabel="Sayfa numarası" style={[inputStyle, { width: 110 }]} />
              <T v="label" style={{ flex: 1 }}>Sayfa numarasını gizle</T>
              <Switch value={hide} onValueChange={setHidePage} accessibilityLabel="Sayfa numarasını gizle" trackColor={{ true: color.primary, false: color.borderStrong }} />
            </View>
          ) : (
            <TextInput value={scene} onChangeText={(t) => setScene(t.slice(0, 200))} placeholder={m.kind === 'series' ? 'Sahne notu: 2. Sezon 3. Bölüm, iskele sahnesi' : 'Sahne notu: son istasyon, 1:41:20'}
              placeholderTextColor={color.textFaint} accessibilityLabel="Sahne notu" style={inputStyle} />
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}><T v="label">Spoiler içeriyor</T><T v="caption" c={color.textMuted}>Başkalarına bulanık gösterilir</T></View>
            <Switch value={spoiler} onValueChange={setSpoiler} accessibilityLabel="Spoiler içeriyor" trackColor={{ true: color.accent, false: color.borderStrong }} />
          </View>
          <Button title="Paylaş" onPress={submit} disabled={!body.trim()} loading={create.isPending} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
