// Alıntı paylaşımı: Instagram hikâyesi görseli önizleme + paylaş / kaydet / bağlantı.
// Görsel sayfa açılınca hazırlanır; iOS Safari paylaşımı yalnızca dokunuşun hemen ardından izin verdiği için
// "Hikâyede paylaş" hazır dosyayla anında navigator.share çağırır.
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, Share, View } from 'react-native';
import { Button, T } from '../../components/ui';
import { color, radius, space } from '../../theme/tokens';
import { renderQuoteStory, type QuoteStory } from './storyImage';

export const STORY_SHARE_SUPPORTED = Platform.OS === 'web';

export function ShareQuoteSheet({ visible, story, link, onClose }: {
  visible: boolean; story: Omit<QuoteStory, 'siteUrl'>; link: string; onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let objectUrl: string | null = null;
    setFile(null); setUrl(null); setError(null);
    const siteUrl = typeof window !== 'undefined' ? new URL('.', window.location.href).href : 'bookflix';
    renderQuoteStory({ ...story, siteUrl })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        setFile(new File([blob], 'bookflix-alinti.png', { type: 'image/png' }));
      })
      .catch(() => setError('Görsel hazırlanamadı.'));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [visible, story.body, story.title]);

  const canShareFile = !!file && typeof navigator !== 'undefined' && !!navigator.canShare?.({ files: [file] });

  const shareImage = () => {
    if (!file) return;
    navigator.share({ files: [file], title: 'BOOKFLIX' }).catch(() => undefined);
  };
  const download = () => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url; a.download = 'bookflix-alinti.png';
    document.body.appendChild(a); a.click(); a.remove();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} accessibilityLabel="Kapat" style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: space[4] }}>
        <Pressable onPress={() => {}} style={{ backgroundColor: color.surface, borderRadius: radius.lg, padding: space[4], gap: space[3], maxWidth: 420, width: '100%', alignSelf: 'center' }}>
          <T v="titleLg">Hikâyende paylaş</T>
          <View style={{ alignSelf: 'center', width: 216, height: 384, borderRadius: radius.md, overflow: 'hidden', backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center' }}>
            {url ? <Image source={{ uri: url }} style={{ width: 216, height: 384 }} contentFit="cover" accessibilityLabel="Hikâye görseli önizlemesi" />
              : error ? <T v="caption" c={color.danger}>{error}</T> : <ActivityIndicator color={color.primary} />}
          </View>
          {canShareFile ? <Button title="Hikâyede paylaş" onPress={shareImage} disabled={!file} /> : null}
          <Button title="Görseli kaydet" kind={canShareFile ? 'secondary' : 'primary'} onPress={download} disabled={!url} />
          <Button title="Bağlantıyı paylaş" kind="ghost" onPress={() => { Share.share({ message: `BOOKFLIX'te bak: ${link}` }).catch(() => undefined); }} />
          {canShareFile ? <T v="caption" c={color.textMuted} style={{ textAlign: 'center' }}>Paylaşım menüsünden Instagram → Hikâye'yi seç.</T>
            : <T v="caption" c={color.textMuted} style={{ textAlign: 'center' }}>Görseli kaydedip Instagram'da hikâye olarak yükleyebilirsin.</T>}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
