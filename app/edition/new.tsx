import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isbnValid, useAddEdition, useSearchPublishers } from '../../src/api/editions';
import { IconBack } from '../../src/components/icons';
import { Button, T } from '../../src/components/ui';
import { errorMessage } from '../../src/lib/supabase';
import { inputStyle } from '../../src/theme/inputs';
import { color, space } from '../../src/theme/tokens';

export default function NewEdition() {
  const { mediaId, title, isbn: isbnParam } = useLocalSearchParams<{ mediaId: string; title?: string; isbn?: string }>();
  const add = useAddEdition(mediaId);
  const [publisher, setPublisher] = useState('');
  const [translator, setTranslator] = useState('');
  const [year, setYear] = useState('');
  const [pages, setPages] = useState('');
  const [isbn, setIsbn] = useState(isbnParam ?? '');
  const [focus, setFocus] = useState(false);
  const sugg = useSearchPublishers(focus ? publisher : '');

  const save = () => {
    if (publisher.trim().length < 2) { Alert.alert('Eksik bilgi', 'Yayınevi adını yaz.'); return; }
    if (isbn.trim() && !isbnValid(isbn)) { Alert.alert('ISBN geçersiz', 'Arka kapaktaki 13 haneli numarayı kontrol et.'); return; }
    add.mutate({ publisher: publisher.trim(), translator: translator.trim(), year: Number(year) || null, pageCount: Number(pages) || null, isbn: isbn.trim() }, {
      onSuccess: () => { Alert.alert('Teşekkürler', 'Baskı eklendi. Moderatör onayından sonra herkes görecek; sen hemen seçebilirsin.'); router.back(); },
      onError: (e) => Alert.alert('Eklenemedi', errorMessage(e)),
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Geri" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: space[2] }}><IconBack /></Pressable>
      <ScrollView contentContainerStyle={{ padding: space[4], gap: space[4] }} keyboardShouldPersistTaps="handled">
        <View>
          <T v="displayLg">Baskı ekle</T>
          {title ? <T v="body" c={color.textMuted} style={{ marginTop: 4 }}>{title}</T> : null}
        </View>
        <View style={{ gap: space[2] }}>
          <T v="label">Yayınevi *</T>
          <TextInput value={publisher} onChangeText={setPublisher} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)}
            maxLength={80} placeholder="ör. Yapı Kredi Yayınları" placeholderTextColor={color.textFaint} accessibilityLabel="Yayınevi" style={inputStyle} />
          {focus && sugg.data?.length ? sugg.data.map((p) => (
            <Pressable key={p.id} onPress={() => { setPublisher(p.name); setFocus(false); }} accessibilityRole="button" style={{ paddingVertical: 8 }}>
              <T v="label" c={color.accent}>{p.name}</T><T v="caption" c={color.textMuted}>{p.book_count} kitap</T>
            </Pressable>
          )) : null}
        </View>
        <View style={{ flexDirection: 'row', gap: space[3] }}>
          <View style={{ flex: 1, gap: space[2] }}>
            <T v="label">Baskı yılı</T>
            <TextInput value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4} accessibilityLabel="Baskı yılı" style={inputStyle} />
          </View>
          <View style={{ flex: 1, gap: space[2] }}>
            <T v="label">Sayfa</T>
            <TextInput value={pages} onChangeText={setPages} keyboardType="number-pad" maxLength={5} accessibilityLabel="Sayfa sayısı" style={inputStyle} />
          </View>
        </View>
        <View style={{ gap: space[2] }}>
          <T v="label">Çevirmen</T>
          <TextInput value={translator} onChangeText={setTranslator} maxLength={80} placeholder="Çeviri değilse boş bırak" placeholderTextColor={color.textFaint} accessibilityLabel="Çevirmen" style={inputStyle} />
        </View>
        <View style={{ gap: space[2] }}>
          <T v="label">ISBN</T>
          <TextInput value={isbn} onChangeText={setIsbn} keyboardType="number-pad" maxLength={17} placeholder="Arka kapaktaki 13 haneli numara" placeholderTextColor={color.textFaint} accessibilityLabel="ISBN" style={inputStyle} />
        </View>
        <T v="caption" c={color.textFaint}>Kapağı, baskıyı ekledikten sonra kitap sayfasındaki “+ Kapak ekle” ile kendi çektiğin fotoğrafla ekleyebilirsin.</T>
        <Button title="Baskıyı ekle" onPress={save} loading={add.isPending} />
      </ScrollView>
    </SafeAreaView>
  );
}
