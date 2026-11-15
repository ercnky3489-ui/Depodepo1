// Paylaş (+): ne paylaşmak istediğini seçtiren alt sayfa.
import { router, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { T } from '../../src/components/ui';
import { haptic } from '../../src/lib/haptics';
import { color, radius, space } from '../../src/theme/tokens';

const OPTIONS: { title: string; body: string; href: Href; xp?: string }[] = [
  { title: 'Okumaya başla', body: 'Bir kitabı Okuyorum olarak işaretle', href: { pathname: '/compose/pick', params: { next: 'status', kind: 'book' } }, xp: '+2 XP' },
  { title: 'İzledim / İzliyorum', body: 'Film veya dizi kaydı ekle', href: { pathname: '/compose/pick', params: { next: 'status', kind: 'screen' } }, xp: '+2 XP' },
  { title: 'Alıntı ekle', body: 'Sayfa numarası veya sahne notuyla', href: { pathname: '/compose/pick', params: { next: 'quote' } }, xp: '+20 XP' },
  { title: 'İnceleme yaz', body: 'Puan ver, düşüncelerini paylaş', href: { pathname: '/compose/pick', params: { next: 'review' } }, xp: '+60 XP' },
  { title: 'Liste oluştur', body: 'Kitap ve filmlerden bir seçki hazırla', href: '/compose/list' },
  { title: 'ISBN ile kitap ekle', body: 'Barkodu tara veya numarayı yaz', href: '/compose/isbn' },
];

export default function ComposeMenu() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ padding: space[4], gap: space[3] }}>
        <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: color.borderStrong, marginBottom: space[2] }} />
        <T v="displayLg" accessibilityRole="header">Paylaş</T>
        {OPTIONS.map((o) => (
          <Pressable key={o.title} accessibilityRole="button" onPress={() => { haptic.select(); router.push(o.href); }}
            style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', padding: space[4], borderRadius: radius.lg, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border }, pressed && { backgroundColor: color.surfaceHover }]}>
            <View style={{ flex: 1 }}>
              <T v="titleSm">{o.title}</T>
              <T v="caption" c={color.textMuted} style={{ marginTop: 2 }}>{o.body}</T>
            </View>
            {o.xp ? <T v="label" c={color.primary}>{o.xp}</T> : null}
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}
