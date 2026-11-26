// Arama: kitap, yazar, film, dizi ve kullanıcı ayrı kapsamlarda.
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { ActivityIndicator, Alert, FlatList, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { importGoogleBook, useAuthorSearch, useCatalogSearch, useGoogleBooksSearch, usePeopleSearch, type GoogleBookHit } from '../src/api/social';
import { IconBack, IconCamera, IconSearch } from '../src/components/icons';
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

// Türkçe karakterleri sadeleştirip karşılaştır (katalogdaki ile Google sonucunu eşlemek için)
const norm = (t: string) => t.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').replace(/[^a-z0-9]+/g, ' ').trim();

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
  // Katalogda olmayan (özellikle Türkçe) kitaplar için Google Books sonuçları, listenin altında
  const showGoogle = (scope === 'all' || scope === 'book') && q.length >= 3 && !catalog.isFetching;
  const google = useGoogleBooksSearch(q, showGoogle);
  const known = useMemo(() => new Set((catalog.data ?? []).map((m) => norm(m.title))), [catalog.data]);
  const googleHits = (google.data ?? []).filter((g) => !known.has(norm(g.title)));
  const [opening, setOpening] = useState<string | null>(null);
  const openGoogle = async (g: GoogleBookHit) => {
    setOpening(g.google_id);
    try { router.push(`/media/${await importGoogleBook(g.google_id)}`); }
    catch { Alert.alert('Kitap eklenemedi', 'Google Books şu an yanıt vermiyor. Biraz sonra tekrar dene ya da ISBN ile ekle.'); }
    finally { setOpening(null); }
  };
  const googleSection = showGoogle ? (
    <View style={{ marginTop: space[6] }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: space[2] }}>
        <T v="overline" c={color.textMuted}>Google Books'tan</T>
        <T v="caption" c={color.textFaint}>Dokununca kataloğa eklenir</T>
      </View>
      {google.isFetching ? <Loading /> : google.isError ? (
        <T v="bodySm" c={color.textMuted}>Google Books şu an yanıt vermiyor. Kitabı ISBN ile ekleyebilirsin.</T>
      ) : googleHits.length === 0 ? (
        <T v="bodySm" c={color.textMuted}>Google Books'ta da başka sonuç yok.</T>
      ) : googleHits.map((g) => (
        <Pressable key={g.google_id} onPress={() => openGoogle(g)} disabled={!!opening} accessibilityRole="button"
          accessibilityLabel={`${g.title}, ${g.authors.join(', ')}. Google Books'tan kataloğa ekle ve aç`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 72, borderBottomWidth: 1, borderBottomColor: color.border, opacity: opening && opening !== g.google_id ? 0.5 : 1 }}>
          {g.cover_url ? <Image source={{ uri: g.cover_url }} style={{ width: 40, height: 60, borderRadius: 4, backgroundColor: color.surface }} contentFit="cover" />
            : <View style={{ width: 40, height: 60, borderRadius: 4, backgroundColor: color.surface }} />}
          <View style={{ flex: 1 }}>
            <T v="label" style={{ fontSize: 15 }} numberOfLines={2}>{g.title}</T>
            <T v="caption" c={color.textMuted} numberOfLines={1} style={{ marginTop: 3 }}>{[g.authors.join(', '), g.publisher, g.year].filter(Boolean).join(' · ')}</T>
          </View>
          {opening === g.google_id ? <ActivityIndicator color={color.primary} /> : (
            <View style={{ borderWidth: 1, borderColor: color.primary, borderRadius: radius.xs + 2, paddingHorizontal: 7, paddingVertical: 3 }}>
              <T v="overline" c={color.primary} style={{ fontSize: 10 }}>EKLE</T>
            </View>
          )}
        </Pressable>
      ))}
    </View>
  ) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: space[4], paddingLeft: 6, paddingTop: space[2] }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Geri" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><IconBack /></Pressable>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, paddingHorizontal: 14, borderRadius: 16, backgroundColor: color.surface, borderWidth: 1, borderColor: color.primary }}>
          <IconSearch size={20} c={color.primary} />
          <TextInput value={text} onChangeText={setText} autoFocus placeholder="Kitap, yazar, film, dizi, kişi" placeholderTextColor={color.textFaint}
            accessibilityLabel="Ara" returnKeyType="search" style={{ flex: 1, color: color.text, fontFamily: 'Inter_500Medium', fontSize: 15 }} />
          <Pressable onPress={() => router.push({ pathname: '/compose/isbn', params: { scan: '1' } })} accessibilityRole="button"
            accessibilityLabel="ISBN barkodunu kamerayla tara" hitSlop={8} style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,229,160,0.12)' }}>
            <IconCamera size={20} />
          </Pressable>
        </View>
      </View>
      <ChipRow items={SCOPES} value={scope} onChange={setScope} counts={q.length >= 2 ? counts : undefined} />
      <FlatList
        data={q.length >= 2 ? shown : []}
        keyExtractor={(r) => r.key}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: space[4], paddingBottom: 60 }}
        ListHeaderComponent={loading ? <Loading /> : undefined}
        ListFooterComponent={shown.length && googleSection ? googleSection : undefined}
        ListEmptyComponent={q.length < 2 ? (
          <EmptyState title="Ne arıyorsun?" body="Kitap adı, yazar, ISBN, film, dizi veya kullanıcı adı yazabilirsin." />
        ) : loading ? undefined : (
          <View>
            <EmptyState title="Katalogda bulunamadı" body={showGoogle ? 'Aşağıda Google Books sonuçları var; bulamazsan ISBN ile ekleyebilirsin.' : 'Katalogda bulamadığın bir kitabı ISBN ile ekleyebilirsin.'} />
            {googleSection}
            <Button title="ISBN ile kitap ekle" kind={showGoogle ? 'secondary' : 'primary'} onPress={() => router.push('/compose/isbn')} style={{ marginTop: space[4] }} />
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
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 72, borderBottomWidth: 1, borderBottomColor: color.border }}>
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
