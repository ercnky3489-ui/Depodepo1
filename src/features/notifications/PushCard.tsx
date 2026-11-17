// Bildirimler sekmesinin üstünde: telefona bildirim (uygulama kapalıyken) açma kartı.
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, T } from '../../components/ui';
import { useUserId } from '../../lib/auth';
import { disablePush, enablePush, pushState, type PushState } from '../../lib/webPush';
import { color, radius, space } from '../../theme/tokens';

export function PushCard() {
  const uid = useUserId();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { pushState().then(setState).catch(() => setState('unsupported')); }, []);
  if (!state || state === 'unconfigured' || state === 'unsupported') return null;

  const box = { margin: space[4], marginBottom: 0, padding: space[4], borderRadius: radius.lg, backgroundColor: color.surface, borderWidth: 1, borderColor: 'rgba(0,229,160,0.35)', gap: space[2] } as const;
  if (state === 'on') {
    return (
      <View style={[box, { flexDirection: 'row', alignItems: 'center', borderColor: color.border }]}>
        <T v="bodySm" c={color.textSoft} style={{ flex: 1 }}>Telefon bildirimleri açık. Okuma serisi hatırlatmaları ve beğeniler uygulama kapalıyken de gelir.</T>
        <Button title="Kapat" kind="ghost" loading={busy} onPress={async () => { setBusy(true); setState(await disablePush()); setBusy(false); }} />
      </View>
    );
  }
  return (
    <View style={box}>
      <T v="label">Telefonuna bildirim gelsin</T>
      {state === 'needs-install' ? (
        <T v="bodySm" c={color.textSoft}>iPhone'da bildirim için BOOKFLIX'i ana ekrana eklemelisin: Safari'de Paylaş → "Ana Ekrana Ekle". Sonra uygulamayı ana ekrandan açıp buradan bildirimleri aç.</T>
      ) : state === 'denied' ? (
        <T v="bodySm" c={color.textSoft}>Bildirim izni kapalı. Telefonun Ayarlar → Bildirimler bölümünden BOOKFLIX'e izin verebilirsin.</T>
      ) : (
        <>
          <T v="bodySm" c={color.textSoft}>Okuma serin bozulmak üzereyken ve biri paylaşımını beğendiğinde, uygulama kapalı olsa da kilit ekranına bildirim düşsün.</T>
          <Button title="Bildirimleri aç" loading={busy} onPress={async () => {
            if (!uid) return; setBusy(true);
            try { setState(await enablePush(uid)); } catch { setState('off'); } finally { setBusy(false); }
          }} />
        </>
      )}
    </View>
  );
}
