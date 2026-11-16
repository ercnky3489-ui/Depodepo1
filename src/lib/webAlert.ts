// react-native-web'de Alert.alert hiçbir şey yapmaz; web'de tarayıcı pencereleriyle karşılığını sağlar.
//   * düğme yok / tek düğme  → window.alert, sonra o düğmenin onPress'i
//   * iki düğme (biri iptal) → window.confirm: Tamam = iptal olmayan düğme, Vazgeç = iptal düğmesi
//   * daha fazla seçenek     → numaralı liste ile window.prompt (ör. şikayet nedenleri)
import { Alert, Platform, type AlertButton } from 'react-native';

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const list = buttons ?? [];
    const cancel = list.find((b) => b.style === 'cancel');
    const actions = list.filter((b) => b !== cancel);
    if (actions.length <= 1 && !cancel) {
      window.alert(text);
      actions[0]?.onPress?.();
      return;
    }
    if (actions.length === 1) {
      if (window.confirm(text)) actions[0]!.onPress?.(); else cancel?.onPress?.();
      return;
    }
    const menu = actions.map((b, i) => `${i + 1}. ${b.text ?? ''}`).join('\n');
    const answer = window.prompt(`${text}\n\n${menu}\n\nNumarasını yaz:`);
    const pick = actions[Number(answer) - 1];
    if (pick) pick.onPress?.(); else cancel?.onPress?.();
  };
}
