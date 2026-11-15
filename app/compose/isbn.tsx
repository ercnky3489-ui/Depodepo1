// ISBN ile kitap ekleme: barkod tara veya yaz; katalogda/kaynaklarda yoksa elle ekle (moderasyona düşer).
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconBack } from '../../src/components/icons';
import { Button, T } from '../../src/components/ui';
import { haptic } from '../../src/lib/haptics';
import { errorMessage, supabase } from '../../src/lib/supabase';
import { inputStyle } from '../../src/theme/inputs';
import { color, radius, space } from '../../src/theme/tokens';

function toIsbn13(raw: string): string | null {
  const s = raw.replace(/[\s-]/g, '').toUpperCase();
  if (/^\d{13}$/.test(s)) return s;
  if (/^\d{9}[\dX]$/.test(s)) {
    const core = `978${s.slice(0, 9)}`;
    const sum = core.split('').reduce((a, ch, i) => a + Number(ch) * (i % 2 ? 3 : 1), 0);
    return core + ((10 - (sum % 10)) % 10);
  }
  return null;
}

export default function IsbnAdd() {
  const [perm, requestPerm] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [isbn, setIsbn] = useState('');
  const [manual, setManual] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [pages, setPages] = useState('');
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);

  const lookup = async (raw: string) => {
    const code = toIsbn13(raw);
    if (!code) { Alert.alert('Geçersiz ISBN', '10 veya 13 haneli ISBN gir.'); return; }
    setIsbn(code); setBusy(true);
    // Önce BOOKFLIX baskılarında (okurların eklediği baskılar dahil), sonra harici kaynaklarda ara.
    const local = await supabase.rpc('find_by_isbn', { p_isbn: code });
    const own = !local.error ? (local.data ?? [])[0] as { media_id: string } | undefined : undefined;
    if (own) { setBusy(false); haptic.success(); router.replace(`/media/${own.media_id}`); return; }
    const { data, error } = await supabase.functions.invoke('catalog-search', { body: { q: code, kind: 'book' } });
    setBusy(false);
    const hit = !error ? (data?.results ?? [])[0] : null;
    if (hit) { haptic.success(); router.replace(`/media/${hit.id}`); }
    else setManual(true);
  };

  const addManual = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc('add_user_book', {
      p_title: title, p_author: author, p_isbn13: isbn || null, p_page_count: pages ? Number(pages) : null, p_year: null,
    });
    setBusy(false);
    if (error) { Alert.alert('Eklenemedi', errorMessage(error)); return; }
    Alert.alert('Kitap eklendi', 'Kitap moderasyon onayından sonra herkese görünecek; sen hemen kütüphanene ekleyebilirsin.');
    router.replace(`/media/${data as string}`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: space[4], gap: space[4] }} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Geri" style={{ width: 44, height: 44, justifyContent: 'center' }}><IconBack /></Pressable>
          <T v="displayLg">ISBN ile kitap ekle</T>
          {!manual ? (
            <>
              {scanning && perm?.granted ? (
                <View style={{ height: 260, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: color.primary }}>
                  <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['ean13'] }}
                    onBarcodeScanned={({ data }) => {
                      if (locked.current) return;
                      locked.current = true; setScanning(false); haptic.select(); lookup(data).finally(() => { locked.current = false; });
                    }} />
                </View>
              ) : (
                <Button title="Barkodu tara" kind="tonal" onPress={async () => {
                  const p = perm?.granted ? perm : await requestPerm();
                  if (p.granted) setScanning(true); else Alert.alert('Kamera izni gerekli', 'Ayarlardan kamera iznini açabilir veya ISBN\'i elle yazabilirsin.');
                }} />
              )}
              <T v="caption" c={color.textMuted} style={{ textAlign: 'center' }}>veya</T>
              <TextInput value={isbn} onChangeText={setIsbn} keyboardType="number-pad" placeholder="978…" placeholderTextColor={color.textFaint}
                accessibilityLabel="ISBN numarası" style={[inputStyle, { letterSpacing: 2 }]} />
              <Button title="Ara" onPress={() => lookup(isbn)} disabled={isbn.replace(/\D/g, '').length < 10} loading={busy} />
            </>
          ) : (
            <>
              <T v="body" c={color.textMuted}>{isbn ? `${isbn} hiçbir kaynakta bulunamadı.` : ''} Bilgileri gir; kitap moderasyon onayından sonra herkese görünür.</T>
              <TextInput value={title} onChangeText={setTitle} placeholder="Kitap adı" placeholderTextColor={color.textFaint} accessibilityLabel="Kitap adı" style={inputStyle} />
              <TextInput value={author} onChangeText={setAuthor} placeholder="Yazar" placeholderTextColor={color.textFaint} accessibilityLabel="Yazar" style={inputStyle} />
              <TextInput value={pages} onChangeText={(t) => setPages(t.replace(/\D/g, '').slice(0, 5))} keyboardType="number-pad" placeholder="Sayfa sayısı"
                placeholderTextColor={color.textFaint} accessibilityLabel="Sayfa sayısı" style={inputStyle} />
              <Button title="Kitabı ekle" onPress={addManual} disabled={!title.trim() || author.trim().length < 2} loading={busy} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
