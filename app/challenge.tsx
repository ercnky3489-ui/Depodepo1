// Kayıttan sonraki son adım: bu yılın okuma challenge'ı (kaç kitap). reading_goals'a yazılır.
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useInvalidateProfile } from '../src/api/profileDetails';
import { Button, T } from '../src/components/ui';
import { useUserId } from '../src/lib/auth';
import { haptic } from '../src/lib/haptics';
import { errorMessage, supabase } from '../src/lib/supabase';
import { color, radius, space } from '../src/theme/tokens';

const YEAR = new Date().getFullYear();
const PRESETS = [
  { n: 12, l: 'Ayda 1' },
  { n: 24, l: 'Ayda 2' },
  { n: 36, l: 'Ayda 3' },
  { n: 52, l: 'Haftada 1' },
];

export default function Challenge() {
  const uid = useUserId();
  const invalidate = useInvalidateProfile();
  const [goal, setGoal] = useState(24);
  const [busy, setBusy] = useState(false);
  const monthsLeft = 12 - new Date().getMonth();
  const perMonth = goal / Math.max(1, monthsLeft);

  const step = (d: number) => { haptic.select(); setGoal((g) => Math.min(365, Math.max(1, g + d))); };

  const join = async () => {
    if (!uid) return;
    setBusy(true);
    const { error } = await supabase.from('reading_goals').upsert({ user_id: uid, year: YEAR, target: goal }, { onConflict: 'user_id,year' });
    setBusy(false);
    if (error) { Alert.alert('Kaydedilemedi', errorMessage(error)); return; }
    haptic.success();
    invalidate();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView contentContainerStyle={{ padding: space[4], gap: space[4], flexGrow: 1 }}>
        <T v="overline" c={color.primary}>3 / 3</T>
        <View>
          <T v="displayLg">{YEAR} Okuma Challenge</T>
          <T v="body" c={color.textMuted} style={{ marginTop: space[2] }}>Bu yıl kaç kitap okumak istiyorsun? İlerlemen profilinde görünür, hedefine yaklaştıkça BOOKFLIX seni teşvik eder.</T>
        </View>

        <LinearGradient colors={['rgba(0,229,160,0.16)', 'rgba(0,217,192,0.04)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(0,229,160,0.35)', paddingVertical: space[6], alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[6] }}>
            <StepBtn label="−" onPress={() => step(-1)} a11y="Bir azalt" />
            <View style={{ alignItems: 'center', minWidth: 120 }}>
              <T accessibilityRole="header" style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 72, lineHeight: 80, color: color.text, textShadowColor: 'rgba(0,229,160,0.55)', textShadowRadius: 22 }}>{goal}</T>
              <T v="label" c={color.textMuted}>kitap</T>
            </View>
            <StepBtn label="+" onPress={() => step(1)} a11y="Bir artır" />
          </View>
          <T v="caption" c={color.primary} style={{ marginTop: space[3] }}>Yıl sonuna kadar ayda ~{perMonth < 10 ? perMonth.toFixed(1).replace('.', ',') : Math.round(perMonth)} kitap</T>
        </LinearGradient>

        <View style={{ flexDirection: 'row', gap: space[2] }}>
          {PRESETS.map((p) => {
            const on = p.n === goal;
            return (
              <Pressable key={p.n} onPress={() => { haptic.select(); setGoal(p.n); }} accessibilityRole="button" accessibilityState={{ selected: on }}
                accessibilityLabel={`${p.n} kitap, ${p.l}`}
                style={{ flex: 1, paddingVertical: 12, borderRadius: radius.md, alignItems: 'center', borderWidth: 1,
                  borderColor: on ? color.primary : color.borderStrong, backgroundColor: on ? 'rgba(0,229,160,0.12)' : color.surface }}>
                <T v="label" c={on ? color.primary : color.text} style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 18 }}>{p.n}</T>
                <T v="caption" c={color.textMuted} style={{ fontSize: 11 }}>{p.l}</T>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flex: 1 }} />
        <Button title="Challenge'a katıl" onPress={join} loading={busy} />
        <Button title="Şimdilik atla" kind="ghost" onPress={() => router.replace('/(tabs)')} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StepBtn({ label, onPress, a11y }: { label: string; onPress: () => void; a11y: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y}
      style={({ pressed }) => ({ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center',
        backgroundColor: color.surface, borderWidth: 1, borderColor: color.primary, transform: [{ scale: pressed ? 0.92 : 1 }] })}>
      <T style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 26, lineHeight: 30, color: color.primary }}>{label}</T>
    </Pressable>
  );
}
