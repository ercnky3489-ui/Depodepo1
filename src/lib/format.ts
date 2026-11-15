// Türkçe biçimlendirme yardımcıları (saf fonksiyonlar; birim testi var).

export function formatNumber(n: number): string {
  const sign = n < 0 ? '-' : '';
  return sign + String(Math.trunc(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// 1.284 -> "1.284", 12.400 -> "12,4B", 2.300.000 -> "2,3M"
export function formatCompact(n: number): string {
  const a = Math.abs(n);
  if (a < 10000) return formatNumber(n);
  if (a < 1_000_000) return `${trimDecimal(n / 1000)}B`;
  return `${trimDecimal(n / 1_000_000)}M`;
}

function trimDecimal(x: number): string {
  const r = Math.round(x * 10) / 10;
  return (Number.isInteger(r) ? String(r) : r.toFixed(1)).replace('.', ',');
}

// 8.6 -> "8,6"; puan yoksa "—"
export function formatRating(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return v.toFixed(digits).replace('.', ',');
}

// Google Books 5 üzerinden puanı 10'luk gösterime çevirmez; ölçek her zaman yanında yazılır.
export function formatExternalRating(value: number, scale: 5 | 10): string {
  return `${formatRating(value)}/${scale}`;
}

export function relativeTime(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const s = Math.max(0, Math.round((now.getTime() - d.getTime()) / 1000));
  if (s < 60) return 'şimdi';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa`;
  const days = Math.floor(h / 24);
  if (days === 1) return 'dün';
  if (days < 7) return `${days} g`;
  if (days < 30) return `${Math.floor(days / 7)} hf`;
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
}

export function minutesToText(min: number | null | undefined): string {
  if (!min) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} sa${m ? ` ${m} dk` : ''}` : `${m} dk`;
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p.charAt(0).toLocaleUpperCase('tr-TR')).join('') || '?';
}

// Sunucudaki effective_length ile aynı kural: boşluk sayılmaz, tekrar eden karakter tek sayılır.
export function effectiveLength(text: string): number {
  return text.replace(/(.)\1+/gu, '$1').replace(/\s/gu, '').length;
}
