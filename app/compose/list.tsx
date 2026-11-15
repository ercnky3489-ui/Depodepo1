import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconBack } from '../../src/components/icons';
import { Button, T } from '../../src/components/ui';
import { useUserId } from '../../src/lib/auth';
import { errorMessage, supabase } from '../../src/lib/supabase';
import { inputStyle } from '../../src/theme/inputs';
import { color, space } from '../../src/theme/tokens';

export default function NewList() {
  const uid = useUserId();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [isPublic, setPublic] = useState(true);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    const { data, error } = await supabase.from('lists').insert({ owner_id: uid!, title: title.trim(), description: desc.trim() || null, is_public: isPublic }).select('id').single();
    setBusy(false);
    if (error) { Alert.alert('Oluşturulamadı', errorMessage(error)); return; }
    qc.invalidateQueries({ queryKey: ['feed'] });
    router.replace({ pathname: '/compose/pick', params: { next: 'list', listId: data.id } });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView contentContainerStyle={{ padding: space[4], gap: space[4] }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Geri" style={{ width: 44, height: 44, justifyContent: 'center' }}><IconBack /></Pressable>
        <T v="displayLg">Yeni liste</T>
        <TextInput value={title} onChangeText={(t) => setTitle(t.slice(0, 120))} placeholder="Yağmurlu pazarlar için" placeholderTextColor={color.textFaint}
          accessibilityLabel="Liste adı" style={[inputStyle, { fontFamily: 'Fraunces_600SemiBold', fontSize: 18 }]} />
        <TextInput value={desc} onChangeText={(t) => setDesc(t.slice(0, 500))} multiline placeholder="Kısa açıklama (isteğe bağlı)" placeholderTextColor={color.textFaint}
          accessibilityLabel="Açıklama" style={[inputStyle, { height: 110, paddingTop: 14, textAlignVertical: 'top' }]} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}><T v="label">Herkese açık</T><T v="caption" c={color.textMuted}>Kapalıysa yalnızca sen görürsün ve akışta paylaşılmaz</T></View>
          <Switch value={isPublic} onValueChange={setPublic} accessibilityLabel="Herkese açık" trackColor={{ true: color.primary, false: color.borderStrong }} />
        </View>
        <Button title="Oluştur ve eser ekle" onPress={create} disabled={!title.trim()} loading={busy} />
      </ScrollView>
    </SafeAreaView>
  );
}
