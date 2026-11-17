// Bildirim satırından Türkçe metin ve dokununca gidilecek adres (bildirimler sekmesi ve canlı bildirim ortak kullanır).
import type { NotificationRow } from '../../types/db';

const BADGES: Record<string, string> = {
  book_worm: 'Kitap Kurdu', long_reader: 'Uzun Okur', film_buff: 'Film Tutkunu', series_lover: 'Dizi Sever',
  quote_master: 'Alıntı Ustası', master_reviewer: 'Usta Yorumcu', film_critic: 'Film Eleştirmeni',
};
const TIERS = ['', 'Bronz', 'Gümüş', 'Altın'];
const ACC: Record<string, string> = { quote: 'alıntını', review: 'incelemeni', list: 'listeni', comment: 'yorumunu', community_post: 'paylaşımını' };
const DAT: Record<string, string> = { quote: 'alıntına', review: 'incelemene', list: 'listene', comment: 'yorumuna', community_post: 'paylaşımına' };

export function notificationText(n: NotificationRow): string {
  const t = n.target_type ?? '';
  switch (n.type) {
    case 'follow': return 'seni takip etmeye başladı';
    case 'follow_request': return 'seni takip etmek istiyor';
    case 'follow_accepted': return 'takip isteğini kabul etti';
    case 'like': return `${ACC[t] ?? 'paylaşımını'} beğendi`;
    case 'comment': return `${DAT[t] ?? 'paylaşımına'} yorum yaptı`;
    case 'helpful': return 'incelemeni faydalı buldu · +3 XP';
    case 'badge': return `Yeni rozet: ${BADGES[String(n.data.code)] ?? ''} · ${TIERS[Number(n.data.tier)] ?? ''}`;
    case 'level_up': return `Seviye ${n.data.level} oldun`;
    case 'streak_reminder': {
      if (typeof n.data.title === 'string' && typeof n.data.body === 'string') return `${n.data.title} ${n.data.body}`;
      const days = Number(n.data.streak ?? 0);
      return n.data.slot === 'evening'
        ? `${days} günlük okuma serin bitmek üzere! Bugün birkaç sayfa oku, serin bozulmasın.`
        : `${days} günlük okuma serin seni bekliyor. Bugün kısa bir okuma oturumu açmaya ne dersin?`;
    }
    case 'moderation': return 'Paylaşımlarından biri hakkında topluluk kuralları kararı verildi';
    default: return '';
  }
}

export function notificationTarget(n: NotificationRow): string | null {
  if (n.type === 'badge' || n.type === 'level_up') return '/(tabs)/profile';
  if (n.type === 'streak_reminder') return '/(tabs)';
  if (n.target_type === 'profile' && n.target_id) return `/user/${n.target_id}`;
  if (n.target_type && n.target_id && ['quote', 'review', 'list'].includes(n.target_type)) return `/${n.target_type}/${n.target_id}`;
  return null;
}
