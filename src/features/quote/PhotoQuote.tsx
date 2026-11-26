// Fotoğraftan alıntı: kitap sayfasının fotoğrafı çekilir, metin tarayıcıda okunur (Tesseract, Türkçe),
// cümleler listelenir; seçilen cümle(ler) alıntı kutusuna aktarılır. Fotoğraf hiçbir sunucuya gönderilmez.
// İlk kullanımda okuma motoru ve Türkçe dil verisi (~6 MB) indirilir, sonra tarayıcı önbelleğinden gelir.
import { createElement, useRef, useState } from 'react';
import { Image, Platform, Pressable, View } from 'react-native';
import { Button, T } from '../../components/ui';
import { haptic } from '../../lib/haptics';
import { color, radius, space } from '../../theme/tokens';

function sentences(raw: string): string[] {
  const text = raw
    .replace(/(\p{L})-\s*\n\s*(\p{Ll})/gu, '$1$2')   // satır sonunda bölünmüş kelimeleri birleştir
    .replace(/\s*\n\s*/g, ' ')
    .replace(/[|_~^`]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return text.split(/(?<=[.!?…])\s+(?=["“'‘(]?[\p{Lu}0-9])/u).map((s) => s.trim()).filter((s) => s.length >= 8);
}

export function PhotoQuote({ onPick }: { onPick: (text: string) => void }) {
  const input = useRef<HTMLInputElement | null>(null);
  const [img, setImg] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [stage, setStage] = useState('');
  const [list, setList] = useState<string[] | null>(null);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [err, setErr] = useState<string | null>(null);
  if (Platform.OS !== 'web') return null;

  const run = async (file: File) => {
    setErr(null); setList(null); setSel(new Set());
    setImg(URL.createObjectURL(file)); setProgress(0); setStage('Okuma motoru hazırlanıyor…');
    try {
      const { createWorker } = await import('tesseract.js');
      // Motor ve Türkçe dil verisi kendi sitemizden gelir (dış CDN'e bağımlı değil)
      const base = `${window.location.origin}${process.env.EXPO_PUBLIC_BASE_URL ?? ''}/tesseract`;
      const worker = await createWorker('tur', 1, {
        workerPath: `${base}/worker.min.js`, corePath: `${base}/core`, langPath: `${base}/lang`, gzip: true,
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') { setStage('Metin okunuyor…'); setProgress(m.progress); }
          else if (m.status.includes('loading')) setStage('Türkçe dil verisi yükleniyor…');
        },
      });
      const { data } = await worker.recognize(file);
      await worker.terminate();
      const out = sentences(data.text ?? '');
      setList(out); haptic.success();
      if (!out.length) setErr('Okunabilir cümle bulunamadı. Sayfayı düz, aydınlık ve yakından çekmeyi dene.');
    } catch {
      setErr('Metin okunamadı. İnternet bağlantını kontrol edip tekrar dene.');
    } finally { setProgress(null); setStage(''); }
  };

  const toggle = (i: number) => { haptic.select(); setSel((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; }); };
  const use = () => { if (!list) return; onPick([...sel].sort((a, b) => a - b).map((i) => list[i]).join(' ')); setList(null); setImg(null); setSel(new Set()); };

  return (
    <View style={{ gap: space[3] }}>
      {createElement('input', { ref: input, type: 'file', accept: 'image/*', capture: 'environment', style: { display: 'none' },
        onChange: (e: { target: HTMLInputElement }) => { const f = e.target.files?.[0]; if (f) void run(f); e.target.value = ''; } })}
      {!img ? (
        <Button title="📷 Sayfanın fotoğrafından al" kind="secondary" onPress={() => input.current?.click()} />
      ) : (
        <View style={{ gap: space[3], padding: space[3], borderRadius: radius.md, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border }}>
          <View style={{ flexDirection: 'row', gap: space[3], alignItems: 'center' }}>
            <Image source={{ uri: img }} style={{ width: 54, height: 72, borderRadius: 6, backgroundColor: color.surfaceSunken }} resizeMode="cover" />
            <View style={{ flex: 1, gap: 6 }}>
              {progress !== null ? (
                <>
                  <T v="label">{stage}</T>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: color.surfaceSunken }}>
                    <View style={{ height: 6, borderRadius: 3, width: `${Math.round(progress * 100)}%`, backgroundColor: color.primary }} />
                  </View>
                </>
              ) : list?.length ? (
                <T v="label">Alıntılamak istediğin cümle(ler)e dokun</T>
              ) : null}
              {err ? <T v="bodySm" c={color.danger}>{err}</T> : null}
            </View>
          </View>
          {list?.map((s, i) => {
            const on = sel.has(i);
            return (
              <Pressable key={i} onPress={() => toggle(i)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                style={{ padding: space[3], borderRadius: radius.sm, borderWidth: 1, borderColor: on ? color.primary : color.border,
                  backgroundColor: on ? 'rgba(0,229,160,0.14)' : 'transparent' }}>
                <T style={{ fontFamily: 'Fraunces_400Regular', fontSize: 15, lineHeight: 22, color: color.text }}>{s}</T>
              </Pressable>
            );
          })}
          <View style={{ flexDirection: 'row', gap: space[2] }}>
            <Button title="Yeniden çek" kind="ghost" onPress={() => input.current?.click()} style={{ flex: 1 }} />
            {list?.length ? <Button title={sel.size ? `Alıntıya ekle (${sel.size})` : 'Cümle seç'} onPress={use} disabled={!sel.size} style={{ flex: 1 }} /> : null}
          </View>
        </View>
      )}
    </View>
  );
}
