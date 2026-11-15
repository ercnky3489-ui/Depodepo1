import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { saveProfileDetails, usePrivateDetails, useReadingGoal, useInvalidateProfile, validBirthDate } from '../../src/api/profileDetails';
import { IconBack } from '../../src/components/icons';
import { Avatar, Button, ChipRow, T } from '../../src/components/ui';
import { COVER_PRESETS } from '../../src/lib/covers';
import { useAuth } from '../../src/lib/auth';
import { errorMessage, supabase } from '../../src/lib/supabase';
import { inputStyle } from '../../src/theme/inputs';
import { color, space } from '../../src/theme/tokens';

const YEAR = new Date().getFullYear();

function Field({ label, value, onChange, placeholder, max, multiline, keyboard }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; max: number; multiline?: boolean; keyboard?: 'default' | 'numeric' | 'email-address';
}) {
  return (
    <View style={{ gap: space[2] }}>
      <T v="label">{label}</T>
      <TextInput value={value} onChangeText={onChange} maxLength={max} placeholder={placeholder} placeholderTextColor={color.textFaint}
        keyboardType={keyboard ?? 'default'} multiline={multiline} accessibilityLabel={label}
        style={[inputStyle, multiline && { height: 110, paddingTop: 14, textAlignVertical: 'top' }]} />
    </View>
  );
}

export default function EditProfile() {
  const { profile, refreshProfile } = useAuth();
  const uid = profile?.id ?? null;
  const priv = usePrivateDetails(uid);
  const goal = useReadingGoal(uid, YEAR);
  const invalidate = useInvalidateProfile();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [avatar, setAvatar] = useState<string | null>(profile?.avatar_path ?? null);
  const [school, setSchool] = useState(profile?.school ?? '');
  const [occupation, setOccupation] = useState(profile?.occupation ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [district, setDistrict] = useState(profile?.district ?? '');
  const [instagram, setInstagram] = useState(profile?.instagram ?? '');
  const [facebook, setFacebook] = useState(profile?.facebook ?? '');
  const [twitter, setTwitter] = useState(profile?.twitter ?? '');
  const [birth, setBirth] = useState('');
  const [showBirth, setShowBirth] = useState(false);
  const [cover, setCover] = useState<string | null>(profile?.cover_path ?? null);
  const [goalText, setGoalText] = useState('');
  const [busy, setBusy] = useState(false);

  // Özel ve hedef verileri geldikçe formu doldur
  useEffect(() => { if (priv.data) { setBirth(priv.data.birth_date ?? ''); setShowBirth(priv.data.show_birthdate); } }, [priv.data]);
  useEffect(() => { if (goal.data !== undefined) setGoalText(goal.data ? String(goal.data) : ''); }, [goal.data]);

  const pickAvatar = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    if ((asset.fileSize ?? 0) > 2 * 1024 * 1024) { Alert.alert('Dosya çok büyük', 'En fazla 2 MB.'); return; }
    setBusy(true);
    try {
      const path = `${profile!.id}/avatar-${Date.now()}.jpg`;
      const body = await (await fetch(asset.uri)).arrayBuffer();
      const { error } = await supabase.storage.from('avatars').upload(path, body, { contentType: asset.mimeType ?? 'image/jpeg', upsert: false });
      if (error) throw error;
      setAvatar(`storage:avatars/${path}`);
    } catch (e) {
      Alert.alert('Yüklenemedi', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const pickCover = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.8 });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    if ((asset.fileSize ?? 0) > 3 * 1024 * 1024) { Alert.alert('Dosya çok büyük', 'Kapak en fazla 3 MB olabilir.'); return; }
    setBusy(true);
    try {
      const path = `${profile!.id}/cover-${Date.now()}.jpg`;
      const body = await (await fetch(asset.uri)).arrayBuffer();
      const { error } = await supabase.storage.from('user-covers').upload(path, body, { contentType: asset.mimeType ?? 'image/jpeg', upsert: false });
      if (error) throw error;
      setCover(`storage:user-covers/${path}`);
    } catch (e) {
      Alert.alert('Yüklenemedi', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!validBirthDate(birth)) { Alert.alert('Doğum tarihi', 'YYYY-AA-GG biçiminde ve geçerli bir tarih yaz (ör. 1995-04-12).'); return; }
    const target = goalText.trim() ? Number(goalText.trim()) : null;
    if (target !== null && (!Number.isInteger(target) || target < 1 || target > 1000)) { Alert.alert('Okuma hedefi', '1 ile 1000 arasında bir sayı yaz.'); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from('profiles').update({ display_name: displayName.trim() || null, bio: bio.trim() || null, avatar_path: avatar }).eq('id', profile!.id);
      if (error) throw error;
      await saveProfileDetails(profile!.id, {
        school, occupation, city, district, instagram, facebook, twitter, birth_date: birth.trim(), show_birthdate: showBirth,
        cover_path: cover, goal_year: YEAR, goal_target: target,
      });
      invalidate();
      await refreshProfile();
      router.back();
    } catch (e) {
      Alert.alert('Kaydedilemedi', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const coverOptions = [{ id: 'none', label: 'Varsayılan (Mona Lisa)' }, ...COVER_PRESETS.map((p) => ({ id: p.key, label: p.label }))];
  const coverKey = cover?.startsWith('preset:') ? cover.slice('preset:'.length) : cover?.startsWith('storage:') ? 'own' : 'none';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Geri" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: space[2] }}><IconBack /></Pressable>
      <ScrollView contentContainerStyle={{ padding: space[4], gap: space[4], paddingBottom: 60 }}>
        <T v="displayLg">Profili düzenle</T>

        <View style={{ gap: space[2] }}>
          <T v="label">Profil kapağı</T>
          <ChipRow items={coverOptions} value={coverKey === 'own' ? 'none' : coverKey} onChange={(id) => setCover(id === 'none' ? null : `preset:${id}`)} />
          <Button title="Kendi fotoğrafını yükle" kind="secondary" onPress={pickCover} loading={busy} />
          {coverKey === 'own' ? <T v="caption" c={color.textMuted}>Şu an kendi fotoğrafın kapak olarak görünüyor.</T> : null}
          <T v="caption" c={color.textFaint}>Tablolar: Wikimedia Commons, kamu malı. Kapak profilinde yavaşça hareket eder.</T>
        </View>

        <Pressable onPress={pickAvatar} accessibilityRole="button" accessibilityLabel="Profil fotoğrafını değiştir" style={{ alignItems: 'center', gap: space[2] }}>
          <Avatar name={displayName || profile?.username} path={avatar} size={96} ring />
          <T v="label" c={color.primary}>Fotoğrafı değiştir</T>
        </Pressable>

        <Field label="Görünen ad" value={displayName} onChange={setDisplayName} max={60} />
        <Field label="Kısa biyografi" value={bio} onChange={setBio} max={280} multiline />

        <T v="overline" c={color.textMuted}>Kişisel bilgiler (isteğe bağlı)</T>
        <Field label="Okul" value={school} onChange={setSchool} max={80} placeholder="Ör. Ankara Üniversitesi" />
        <Field label="Meslek" value={occupation} onChange={setOccupation} max={80} placeholder="Ör. Öğretmen" />
        <View style={{ flexDirection: 'row', gap: space[2] }}>
          <View style={{ flex: 1 }}><Field label="İl" value={city} onChange={setCity} max={40} placeholder="Ankara" /></View>
          <View style={{ flex: 1 }}><Field label="İlçe" value={district} onChange={setDistrict} max={40} placeholder="Çankaya" /></View>
        </View>

        <View style={{ gap: space[2] }}>
          <Field label="Doğum tarihi" value={birth} onChange={setBirth} max={10} placeholder="1995-04-12" keyboard="numeric" />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <T v="bodySm" c={color.textSoft} style={{ flex: 1, paddingRight: space[3] }}>Doğum tarihimi profilimde göster</T>
            <Switch value={showBirth} onValueChange={setShowBirth} accessibilityLabel="Doğum tarihimi profilimde göster" trackColor={{ true: color.primary, false: color.borderStrong }} thumbColor={color.text} />
          </View>
        </View>

        <T v="overline" c={color.textMuted}>Sosyal hesaplar (isteğe bağlı)</T>
        <Field label="Instagram" value={instagram} onChange={setInstagram} max={40} placeholder="kullaniciadi" />
        <Field label="Facebook" value={facebook} onChange={setFacebook} max={80} placeholder="sayfa-adi" />
        <Field label="X (Twitter)" value={twitter} onChange={setTwitter} max={40} placeholder="kullaniciadi" />

        <T v="overline" c={color.textMuted}>Yıllık okuma hedefi</T>
        <Field label={`${YEAR} yılı hedefi (kitap)`} value={goalText} onChange={setGoalText} max={4} placeholder="Ör. 50" keyboard="numeric" />
        <T v="caption" c={color.textMuted}>Boş bırakırsan hedef kaldırılır. Profilinde ilerlemen görünür.</T>

        <Button title="Kaydet" onPress={save} loading={busy} />
      </ScrollView>
    </SafeAreaView>
  );
}
