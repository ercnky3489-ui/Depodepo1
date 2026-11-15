// İnceleme: puan (1–10), başlık, metin, spoiler. Taslak cihazda saklanır.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCreateReview } from '../../src/api/content';
import { useLibraryEntry } from '../../src/api/media';
import { IconBack } from '../../src/components/icons';
import { Button, Cover, Loading, T } from '../../src/components/ui';
import { effectiveLength } from '../../src/lib/format';
import { haptic } from '../../src/lib/haptics';
import { errorMessage, supabase } from '../../src/lib/supabase';
import { charsUntilXp, WITHHELD_TEXT } from '../../src/lib/xp';
import { inputStyle } from '../../src/theme/inputs';
import { color, space } from '../../src/theme/tokens';

export default function ComposeReview() {
  const { mediaId, episodeId } = useLocalSearchParams<{ mediaId: string; episodeId?: string }>();
  const create = useCreateReview();
  const entry = useLibraryEntry(mediaId);
  const media = useQuery({
    queryKey: ['composeMedia', mediaId, 'review'],
    queryFn: async () => (await supabase.from('media_items').select('id, title, kind, cover_path').eq('id', mediaId).single()).data!,
  });
  const draftKey = `draft:review:${mediaId}:${episodeId ?? ''}`;
  const [rating, setRating] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [spoiler, setSpoiler] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(draftKey).then((v) => {
      if (!v) return;
      const d = JSON.parse(v) as { rating: number | null; title: string; body: string; spoiler: boolean };
      setRating(d.rating); setTitle(d.title); setBody(d.body); setSpoiler(d.spoiler);
    });
  }, [draftKey]);
  useEffect(() => { if (entry.data?.rating && rating === null) setRating(entry.data.rating); }, [entry.data, rating]);
  useEffect(() => {
    const t = setTimeout(() => { AsyncStorage.setItem(draftKey, JSON.stringify({ rating, title, body, spoiler })); }, 500);
    return () => clearTimeout(t);
  }, [draftKey, rating, title, body, spoiler]);

  if (!media.data) return <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}><Loading /></SafeAreaView>;
  const m = media.data;
  const kindKey = episodeId ? 'episodeReview' : 'review';
  const left = charsUntilXp(effectiveLength(body), kindKey);
  const xp = episodeId ? 25 : 60;
  const needsStatus = !episodeId && (m.kind === 'movie' ? entry.data?.status !== 'completed' : !entry.data || !['in_progress', 'completed'].includes(entry.data.status));

  const submit = () => {
    if (!rating) return;
    create.mutate({ media_id: m.id, episode_id: episodeId ?? null, title: title.trim() || null, body, rating, has_spoiler: spoiler }, {
      onSuccess: (res) => {
        AsyncStorage.removeItem(draftKey);
        const msg = res.xp > 0 ? `+${res.xp} XP kazandın.` : res.withheld_reason ? WITHHELD_TEXT[res.withheld_reason] ?? '' : '';
        Alert.alert('İnceleme yayınlandı', msg);
        router.dismissTo(`/review/${res.id}`);
      },
      onError: (e) => Alert.alert('Yayınlanamadı', errorMessage(e)),
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: space[4], gap: space[4] }} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Geri" style={{ width: 44, height: 44, justifyContent: 'center' }}><IconBack /></Pressable>
          <View style={{ flexDirection: 'row', gap: space[3], alignItems: 'center' }}>
            <Cover id={m.id} path={m.cover_path} width={40} />
            <View><T v="overline" c={color.accent}>{episodeId ? 'BÖLÜM İNCELEMESİ' : 'İNCELEME'}</T><T v="titleSm">{m.title}</T></View>
          </View>
          <View>
            <T v="label">Puanın</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space[2] }}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <Pressable key={n} onPress={() => { haptic.select(); setRating(n); }} accessibilityRole="radio" accessibilityState={{ selected: rating === n }} accessibilityLabel={`${n} puan`}
                  style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1,
                    borderColor: rating === n ? color.primary : color.border, backgroundColor: rating === n ? color.primary : color.surface }}>
                  <T v="label" c={rating === n ? color.onPrimary : color.text} style={{ fontFamily: 'Inter_800ExtraBold' }}>{n}</T>
                </Pressable>
              ))}
            </View>
          </View>
          <TextInput value={title} onChangeText={(t) => setTitle(t.slice(0, 140))} placeholder="Başlık (isteğe bağlı)" placeholderTextColor={color.textFaint}
            accessibilityLabel="Başlık" style={[inputStyle, { fontFamily: 'Fraunces_600SemiBold', fontSize: 18 }]} />
          <TextInput value={body} onChangeText={setBody} multiline placeholder="Ne düşündün?" placeholderTextColor={color.textFaint}
            accessibilityLabel="İnceleme metni" style={[inputStyle, { height: 240, paddingTop: 14, textAlignVertical: 'top', lineHeight: 22 }]} />
          <T v="caption" c={left ? color.textMuted : color.primary}>{left ? `XP için ${left} karakter daha (şartsız da yayınlayabilirsin)` : `+${xp} XP için hazır`}</T>
          {needsStatus ? <T v="caption" c={color.metalGold}>{m.kind === 'book' ? WITHHELD_TEXT.not_read : WITHHELD_TEXT.not_watched}</T> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}><T v="label">Spoiler içeriyor</T><T v="caption" c={color.textMuted}>Varsayılan olarak bulanık gösterilir</T></View>
            <Switch value={spoiler} onValueChange={setSpoiler} accessibilityLabel="Spoiler içeriyor" trackColor={{ true: color.accent, false: color.borderStrong }} />
          </View>
          <Button title="Yayınla" onPress={submit} disabled={!rating || !body.trim()} loading={create.isPending} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
