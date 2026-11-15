// İstemcideki XP yardımcıları yalnızca GÖSTERİM içindir; XP'yi her zaman sunucu yazar.

export const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 1750, 2750, 4000, 5500, 7500] as const;

export interface LevelProgress {
  level: number;
  currentMin: number;
  nextMin: number | null;
  remaining: number;
  progress: number; // 0..1
}

export function levelProgress(totalXp: number, thresholds: readonly number[] = LEVEL_THRESHOLDS): LevelProgress {
  let level = 1;
  thresholds.forEach((min, i) => {
    if (totalXp >= min) level = i + 1;
  });
  const currentMin = thresholds[level - 1] ?? 0;
  const nextMin = thresholds[level] ?? null;
  if (nextMin === null) return { level, currentMin, nextMin, remaining: 0, progress: 1 };
  return {
    level,
    currentMin,
    nextMin,
    remaining: nextMin - totalXp,
    progress: Math.min(1, Math.max(0, (totalXp - currentMin) / (nextMin - currentMin))),
  };
}

// Yazarken gösterilen "XP için X karakter kaldı" ipucu. Kurallar sunucudaki xp_rules ile aynıdır.
export const MIN_CHARS = { quote: 40, review: 300, episodeReview: 150 } as const;

export function charsUntilXp(effectiveLen: number, kind: keyof typeof MIN_CHARS): number {
  return Math.max(0, MIN_CHARS[kind] - effectiveLen);
}

// Sunucunun withheld_reason kodlarının kullanıcıya gösterilen karşılıkları
export const WITHHELD_TEXT: Record<string, string> = {
  too_short: 'Metin XP için çok kısa.',
  repetitive: 'Tekrarlayan karakterler nedeniyle XP verilmedi.',
  duplicate: 'Aynı metni daha önce paylaştın.',
  too_similar: 'Önceki bir paylaşımına çok benziyor.',
  not_in_library: 'Kitabı önce kütüphanene ekle.',
  no_scene_note: 'Film/dizi alıntısına sahne notu ekle.',
  not_read: 'İnceleme XP\'si için kitabı Okuyorum veya Okudum yap.',
  not_watched: 'İnceleme XP\'si için yapımı İzledim olarak işaretle.',
  episode_not_watched: 'Bölümü önce izlendi olarak işaretle.',
  daily_count_cap: 'Bu tür paylaşım için günlük XP sınırına ulaştın.',
  daily_xp_cap: 'Bu tür için günlük XP sınırına ulaştın.',
  daily_total_cap: 'Bugünkü 300 XP sınırına ulaştın.',
};
