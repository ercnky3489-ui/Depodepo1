import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconBack } from '../../src/components/icons';
import { Avatar, Button, T } from '../../src/components/ui';
import { useAuth } from '../../src/lib/auth';
import { errorMessage, supabase } from '../../src/lib/supabase';
import { inputStyle } from '../../src/theme/inputs';
import { color, space } from '../../src/theme/tokens';

export default function EditProfile() {
  const { profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [avatar, setAvatar] = useState<string | null>(profile?.avatar_path ?? null);
  const [busy, setBusy] = useState(false);

  const pick = async () => {
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

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from('profiles').update({ display_name: displayName.trim() || null, bio: bio.trim() || null, avatar_path: avatar }).eq('id', profile!.id);
    setBusy(false);
    if (error) { Alert.alert('Kaydedilemedi', errorMessage(error)); return; }
    await refreshProfile();
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Geri" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: space[2] }}><IconBack /></Pressable>
      <ScrollView contentContainerStyle={{ padding: space[4], gap: space[4] }}>
        <T v="displayLg">Profili düzenle</T>
        <Pressable onPress={pick} accessibilityRole="button" accessibilityLabel="Profil fotoğrafını değiştir" style={{ alignItems: 'center', gap: space[2] }}>
          <Avatar name={displayName || profile?.username} path={avatar} size={96} ring />
          <T v="label" c={color.primary}>Fotoğrafı değiştir</T>
        </Pressable>
        <View style={{ gap: space[2] }}>
          <T v="label">Görünen ad</T>
          <TextInput value={displayName} onChangeText={setDisplayName} maxLength={60} accessibilityLabel="Görünen ad" style={inputStyle} />
        </View>
        <View style={{ gap: space[2] }}>
          <T v="label">Kısa biyografi</T>
          <TextInput value={bio} onChangeText={setBio} maxLength={280} multiline accessibilityLabel="Kısa biyografi" style={[inputStyle, { height: 110, paddingTop: 14, textAlignVertical: 'top' }]} />
          <T v="caption" c={color.textMuted}>{bio.length} / 280</T>
        </View>
        <Button title="Kaydet" onPress={save} loading={busy} />
      </ScrollView>
    </SafeAreaView>
  );
}
