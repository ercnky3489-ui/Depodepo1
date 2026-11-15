// Arama: kitap, yazar, film, dizi ve kullanıcı ayrı kapsamlarda.
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthorSearch, useCatalogSearch, usePeopleSearch } from '../src/api/social';
import { IconBack, IconSearch } from '../src/components/icons';
import { Avatar, Button, ChipRow, Cover, EmptyState, Loading, T } from '../src/components/ui';
import { color, radius, space } from '../src/theme/tokens';

const SCOPES = [
  { id: 'all', label: 'Tümü' }, { id: 'book', label: 'Kitap' }, { id: 'author', label: 'Yazar' },
  { id: 'movie', label: 'Film' }, { id: 'series', label: 'Dizi' }, { id: 'user', label: 'Kullanıcı' },
] as const;
type Scope = (typeof SCOPES)[number]['id'];

type Row =
  | { key: string; type: 'media'; id: string; kind: 'book' | 'movie' | 'series'; title: string; sub: string; cover: string | null }
  | { key: string; type: 'author'; id: string; title: string; sub: string; photo: string | null }
  | { key: string; type: 'user'; id: string; title: string; sub: string; avatar: string | null };

const TAG = { book: ['KİTAP', color.primary], movie: ['FİLM', color.accent], series: ['DİZİ', color.accent], author: ['YAZAR', color.textSoft], user: ['KİŞİ', color.metalBronze] } as const;

export default function Search() {
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  useEffect(() => { const t = setTimeout(() => setQ(text.trim()), 300); return () => clearTimeout(t); }, [text]);

  const catalog = useCatalogSearch(q, null);
  const authors = useAuthorSearch(q);
  const people = usePeopleSearch(q);

  const rows = useMemo<Row[]>(() => {
    const media: Row[] = (catalog.data ?? []).map((m) => ({ key: `m${m.id}`, type: 'media', id: m.id, kind: m.kind, title: m.title,
      sub: [m.subtitle, m.year].filter(Boolean).join(' · '), cover: m.cover_path }));
    const a: Row[] = (authors.data ?? []).map((x) => ({ key: `a${x.id}`, type: 'author', id: x.id, title: x.name, sub: `${x.work_count} kitap`, photo: x.photo_path }));
    const u: Row[] = (people.data ?? []).map((x) => ({ key: `u${x.id}`, type: 'user', id: x.id, title: `@${x.username}`, sub: `${x.display_name ?? ''} · Seviye ${x.level}`, avatar: x.avatar_path }));
    return [...media, ...a, ...u];
  }, [catalog.data, authors.data, people.data]);

  const inScope = (r: Row, s: Scope) => s === 'all' || (s === 'author' ? r.type === 'author' : s === 'user' ? r.type === 'user' : r.type === 'media' && r.kind === s);
  const counts = Object.fromEntries(SCOPES.map((s) => [s.id, rows.filter((r) => inScope(r, s.id)).length])) as Record<Scope, number>;
  const shown = rows.filter((r) => inScope(r, scope));
  const loading = catalog.isFetching || authors.isFetching || people.isFetching;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: space[4], paddingLeft: 6, paddingTop: space[2] }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Geri" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><IconBack /></Pressable>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, paddingHorizontal: 14, borderRadius: 16, backgroundColor: color.surface, borderWidth: 1, borderColor: color.primary }}>
          <IconSearch size={20} c={color.primary} />
          <TextInput value={text} onChangeText={setText} autoFocus placeholder="Kitap, yazar, film, dizi, kişi" placeholderTextColor={color.textFaint}
            accessibilityLabel="Ara" returnKeyType="search" style={{ flex: 1, color: color.text, fontFamily: 'Inter_500Medium', fontSize: 15 }} />
        </View>
      </View>
      <ChipRow items={SCOPES} value={scope} onChange={setScope} counts={q.length >= 2 ? counts : undefined} />
      <FlatList
        data={q.length >= 2 ? shown : []}
        keyExtractor={(r) => r.key}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: space[4], paddingBottom: 60 }}
        ListHeaderComponent={loading ? <Loading /> : null}
        ListEmptyComponent={q.length < 2 ? (
          <EmptyState title="Ne arıyorsun?" body="Kitap adı, yazar, ISBN, film, dizi veya kullanıcı adı yazabilirsin." />
        ) : loading ? null : (
          <View>
            <EmptyState title="Bu kapsamda sonuç yok" body="Katalogda bulamadığın bir kitabı ISBN ile ekleyebilirsin." />
            <Button title="ISBN ile kitap ekle" onPress={() => router.push('/compose/isbn')} />
          </View>
        )}
        renderItem={({ item: r }) => {
          const tag = TAG[r.type === 'media' ? r.kind : r.type];
          return (
            <Pressable accessibilityRole="link" accessibilityLabel={`${r.title}, ${tag[0].toLocaleLowerCase('tr-TR')}`}
              onPress={() => {
                if (r.type === 'author') { setText(r.title); setScope('book'); return; } // yazarın kitaplarını listeler
                router.push(r.type === 'user' ? `/user/${r.id}` : `/media/${r.id}`);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 72, borderBottomWidth: 1, borderBottomColor: '#141D19' }}>
              {r.type === 'media' ? <Cover id={r.id} path={r.cover} width={40} />
                : <Avatar name={r.title.replace('@', '')} path={r.type === 'author' ? r.photo : r.avatar} size={48} />}
              <View style={{ flex: 1 }}>
                <T v="label" style={{ fontSize: 15 }} numberOfLines={1}>{r.title}</T>
                <T v="caption" c={color.textMuted} numberOfLines={1} style={{ marginTop: 3 }}>{r.sub}</T>
              </View>
              <View style={{ borderWidth: 1, borderColor: tag[1], borderRadius: radius.xs + 2, paddingHorizontal: 7, paddingVertical: 3 }}>
                <T v="overline" c={tag[1]} style={{ fontSize: 10 }}>{tag[0]}</T>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}
