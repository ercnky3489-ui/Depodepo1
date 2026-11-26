// Kitap kulübü odası: aynı kitabı okuyanların bölüm bölüm konuştuğu sohbet.
// "Ben şu bölümdeyim" seçimine göre daha ileri bölümlerin mesajları bulanık görünür; dokununca açılır.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMedia } from '../../src/api/media';
import { IconBack } from '../../src/components/icons';
import { Avatar, EmptyState, Loading, T } from '../../src/components/ui';
import { useUserId } from '../../src/lib/auth';
import { relativeTime } from '../../src/lib/format';
import { haptic } from '../../src/lib/haptics';
import { errorMessage, supabase } from '../../src/lib/supabase';
import { color, radius, space } from '../../src/theme/tokens';

type Msg = { id: string; user_id: string; chapter: number; body: string; created_at: string;
  author: { username: string | null; display_name: string | null; avatar_path: string | null } | null };

const key = (id: string) => `bookflix.club.chapter.${id}`;
const loadChapter = (id: string) => { try { return Math.max(0, Number(window.localStorage.getItem(key(id))) || 1); } catch { return 1; } };
const saveChapter = (id: string, n: number) => { try { window.localStorage.setItem(key(id), String(n)); } catch { /* gizli sekme */ } };

export default function Club() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const uid = useUserId();
  const qc = useQueryClient();
  const media = useMedia(id);
  const [mine, setMine] = useState(() => (Platform.OS === 'web' ? loadChapter(id) : 1));
  const [chapter, setChapter] = useState(mine);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const list = useRef<FlatList<Msg> | null>(null);

  const msgs = useQuery({
    queryKey: ['club', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('club_messages')
        .select('id, user_id, chapter, body, created_at, author:profiles!club_messages_user_id_fkey(username, display_name, avatar_path)')
        .eq('media_id', id).order('created_at', { ascending: true }).limit(300);
      if (error) throw error;
      return data as unknown as Msg[];
    },
  });

  // Yeni mesajlar canlı gelsin
  useEffect(() => {
    const ch = supabase.channel(`club:${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'club_messages', filter: `media_id=eq.${id}` }, () => qc.invalidateQueries({ queryKey: ['club', id] }))
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [id, qc]);

  useEffect(() => { if (msgs.data?.length) setTimeout(() => list.current?.scrollToEnd({ animated: true }), 80); }, [msgs.data?.length]);

  const setMyChapter = (n: number) => { const v = Math.max(0, Math.min(999, n)); setMine(v); setChapter(v); if (Platform.OS === 'web') saveChapter(id, v); haptic.select(); };
  const counts = useMemo(() => {
    const ahead = (msgs.data ?? []).filter((m) => m.chapter > mine && m.user_id !== uid).length;
    return { total: msgs.data?.length ?? 0, ahead };
  }, [msgs.data, mine, uid]);

  const send = async () => {
    const body = text.trim();
    if (!body || !uid) return;
    setSending(true);
    const { error } = await supabase.from('club_messages').insert({ media_id: id, user_id: uid, chapter, body });
    setSending(false);
    if (error) { Alert.alert('Gönderilemedi', error.message.includes('rate_limited') ? 'Biraz yavaş: dakikada en çok 10 mesaj.' : errorMessage(error)); return; }
    setText(''); haptic.like();
    qc.invalidateQueries({ queryKey: ['club', id] });
    qc.invalidateQueries({ queryKey: ['clubCount', id] });
  };

  const remove = (m: Msg) => Alert.alert('Mesajı sil', 'Bu mesaj kulüpten kaldırılsın mı?', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Sil', style: 'destructive', onPress: async () => { await supabase.from('club_messages').delete().eq('id', m.id); qc.invalidateQueries({ queryKey: ['club', id] }); } },
  ]);

  const step = (label: string, onPress: () => void, a11y: string) => (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} hitSlop={6}
      style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surfaceHover }}>
      <T style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 16, color: color.text }}>{label}</T>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 6, paddingTop: space[2] }}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace(`/media/${id}`))} accessibilityRole="button" accessibilityLabel="Geri"
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><IconBack /></Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T v="overline" c={color.primary}>Kitap kulübü</T>
            <T v="titleSm" numberOfLines={1}>{media.data?.title ?? ''}</T>
          </View>
          <T v="caption" c={color.textMuted} style={{ paddingRight: space[3] }}>{counts.total} mesaj</T>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], marginHorizontal: space[4], marginTop: space[2], padding: space[3],
          borderRadius: radius.md, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border }}>
          <View style={{ flex: 1 }}>
            <T v="label">Ben şu bölümdeyim</T>
            <T v="caption" c={color.textMuted}>{counts.ahead ? `İleri bölümlerden ${counts.ahead} mesaj gizli` : 'Sürpriz bozan mesaj yok'}</T>
          </View>
          {step('−', () => setMyChapter(mine - 1), 'Bir bölüm geri')}
          <T style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 18, color: color.text, minWidth: 34, textAlign: 'center', fontVariant: ['tabular-nums'] }}>{mine}</T>
          {step('+', () => setMyChapter(mine + 1), 'Bir bölüm ileri')}
        </View>

        <FlatList
          ref={list}
          data={msgs.data ?? []}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: space[4], gap: space[2], flexGrow: 1 }}
          ListEmptyComponent={msgs.isLoading ? <Loading /> : (
            <EmptyState title="Kulüp henüz sessiz" body="İlk mesajı sen yaz. Hangi bölümden bahsettiğini seç; daha geride olanlara sürpriz bozmamış olursun." />
          )}
          renderItem={({ item: m }) => {
            const me = m.user_id === uid;
            const hidden = !me && m.chapter > mine && !revealed.has(m.id);
            const name = m.author?.display_name ?? m.author?.username ?? 'Okur';
            return (
              <Pressable onPress={() => { if (hidden) setRevealed((s) => new Set(s).add(m.id)); }} onLongPress={() => me && remove(m)} delayLongPress={450}
                accessibilityRole={hidden ? 'button' : undefined} accessibilityLabel={hidden ? `Bölüm ${m.chapter} mesajı gizli, görmek için dokun` : undefined}
                style={{ flexDirection: me ? 'row-reverse' : 'row', gap: space[2], alignItems: 'flex-end' }}>
                {!me ? <Avatar name={name} path={m.author?.avatar_path ?? null} size={28} /> : null}
                <View style={{ maxWidth: '80%', padding: space[3], borderRadius: radius.md, gap: 4,
                  backgroundColor: me ? 'rgba(0,229,160,0.16)' : color.surface, borderWidth: 1, borderColor: me ? 'rgba(0,229,160,0.3)' : color.border }}>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    {!me ? <T v="label" style={{ fontSize: 12 }}>{name}</T> : null}
                    <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: m.chapter > mine ? 'rgba(255,184,107,0.18)' : color.surfaceHover }}>
                      <T v="caption" c={m.chapter > mine ? '#FFB86B' : color.textMuted} style={{ fontSize: 10 }}>Bölüm {m.chapter}</T>
                    </View>
                    <T v="caption" c={color.textFaint} style={{ fontSize: 10 }}>{relativeTime(m.created_at)}</T>
                  </View>
                  <T v="body" style={[{ fontSize: 14 }, hidden ? ({ filter: 'blur(6px)', userSelect: 'none' } as object) : null]}>{hidden ? m.body.replace(/\S/g, '•').slice(0, 120) : m.body}</T>
                  {hidden ? <T v="caption" c="#FFB86B">Sürpriz içerebilir · görmek için dokun</T> : null}
                </View>
              </Pressable>
            );
          }}
        />

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space[2], padding: space[3], borderTopWidth: 1, borderTopColor: color.border, backgroundColor: color.bg }}>
          <Pressable onPress={() => setChapter((c) => (c >= mine + 5 ? 0 : c + 1))} accessibilityRole="button" accessibilityLabel={`Mesajın bölümü: ${chapter}. Değiştirmek için dokun`}
            style={{ height: 44, paddingHorizontal: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surfaceHover }}>
            <T v="caption" c={color.textMuted} style={{ fontSize: 9 }}>BÖLÜM</T>
            <T v="label">{chapter}</T>
          </Pressable>
          <TextInput value={text} onChangeText={setText} placeholder={`Bölüm ${chapter} hakkında yaz…`} placeholderTextColor={color.textFaint}
            multiline maxLength={1000} accessibilityLabel="Mesaj"
            style={{ flex: 1, minHeight: 44, maxHeight: 120, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14, backgroundColor: color.surface,
              color: color.text, fontFamily: 'Inter_400Regular', fontSize: 15, borderWidth: 1, borderColor: color.border }} />
          <Pressable onPress={send} disabled={!text.trim() || sending} accessibilityRole="button" accessibilityLabel="Gönder"
            style={{ height: 44, paddingHorizontal: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: color.primary, opacity: !text.trim() || sending ? 0.5 : 1 }}>
            <T v="label" c={color.onPrimary}>Gönder</T>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
