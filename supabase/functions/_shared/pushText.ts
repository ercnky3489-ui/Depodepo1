// Bildirim satırından Türkçe push metni üretir. Saf fonksiyon; birim testi vardır.

export interface NotificationRow {
  id: string;
  type: 'follow' | 'follow_request' | 'follow_accepted' | 'like' | 'comment' | 'helpful' | 'badge' | 'level_up' | 'moderation' | 'streak_reminder';
  target_type: string | null;
  target_id: string | null;
  data: Record<string, unknown>;
  actor_name: string | null;
}

export interface PushMessage {
  title: string;
  body: string;
  data: { notificationId: string; url: string };
}

const BADGE_NAMES: Record<string, string> = {
  book_worm: 'Kitap Kurdu',
  long_reader: 'Uzun Okur',
  film_buff: 'Film Tutkunu',
  series_lover: 'Dizi Sever',
  quote_master: 'Alıntı Ustası',
  master_reviewer: 'Usta Yorumcu',
  film_critic: 'Film Eleştirmeni',
};
const TIER_NAMES = ['', 'Bronz', 'Gümüş', 'Altın'];
// Belirtme (-ı) ve yönelme (-a) halleri ayrı yazılır; Türkçe ek uyumu kod üretmez.
const TARGET_ACC: Record<string, string> = {
  quote: 'alıntını',
  review: 'incelemeni',
  list: 'listeni',
  comment: 'yorumunu',
  community_post: 'paylaşımını',
};
const TARGET_DAT: Record<string, string> = {
  quote: 'alıntına',
  review: 'incelemene',
  list: 'listene',
  comment: 'yorumuna',
  community_post: 'paylaşımına',
};

export function buildPush(n: NotificationRow): PushMessage | null {
  const who = n.actor_name ?? 'Biri';
  const acc = TARGET_ACC[n.target_type ?? ''] ?? 'paylaşımını';
  const dat = TARGET_DAT[n.target_type ?? ''] ?? 'paylaşımına';
  const url = deepLink(n);
  const msg = (title: string, body: string): PushMessage => ({ title, body, data: { notificationId: n.id, url } });
  switch (n.type) {
    case 'follow':
      return msg('Yeni takipçi', `${who} seni takip etmeye başladı.`);
    case 'follow_request':
      return msg('Takip isteği', `${who} seni takip etmek istiyor.`);
    case 'follow_accepted':
      return msg('İstek kabul edildi', `${who} takip isteğini kabul etti.`);
    case 'like':
      return msg('Yeni beğeni', `${who} ${acc} beğendi.`);
    case 'comment':
      return msg('Yeni yorum', `${who} ${dat} yorum yaptı.`);
    case 'helpful':
      return msg('İncelemen faydalı bulundu', `${who} incelemeni faydalı buldu. +3 XP`);
    case 'badge': {
      const code = String(n.data.code ?? '');
      const tier = Number(n.data.tier ?? 0);
      const tierName = TIER_NAMES[tier];
      return msg('Yeni rozet', `${BADGE_NAMES[code] ?? 'Bir rozet'}${tierName ? ' · ' + tierName : ''} kazandın.`);
    }
    case 'level_up':
      return msg('Seviye atladın', `Tebrikler, Seviye ${Number(n.data.level ?? 0)} oldun.`);
    case 'streak_reminder': {
      if (typeof n.data.title === 'string' && typeof n.data.body === 'string') return msg(n.data.title, n.data.body);
      const days = Number(n.data.streak ?? 0);
      return n.data.slot === 'evening'
        ? msg(`🔥 ${days} günlük serin bitmek üzere`, 'Bugün henüz okumadın. Birkaç sayfa oku, serin bozulmasın.')
        : msg(`🔥 ${days} günlük okuma serin`, 'Bugünkü okumanı yaptın mı? Kısa bir oturum açıp serini sürdür.');
    }
    case 'moderation':
      return msg('Topluluk kuralları', 'Paylaşımlarından biri hakkında karar verildi. Ayrıntılar bildirimlerinde.');
    default:
      return null;
  }
}

export function deepLink(n: Pick<NotificationRow, 'type' | 'target_type' | 'target_id'>): string {
  if (n.type === 'badge' || n.type === 'level_up') return 'bookflix://profile';
  if (n.type === 'streak_reminder') return 'bookflix://';
  if (n.target_type === 'profile' && n.target_id) return `bookflix://user/${n.target_id}`;
  if (n.target_type && n.target_id) return `bookflix://${n.target_type}/${n.target_id}`;
  return 'bookflix://notifications';
}
