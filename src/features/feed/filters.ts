// Ana akış filtreleri; id'ler get_feed RPC'sinin p_filter değerleriyle aynıdır.
export const FEED_FILTERS = [
  { id: 'books', label: 'Kitaplar' },
  { id: 'films', label: 'Filmler' },
  { id: 'series', label: 'Diziler' },
  { id: 'quotes', label: 'Alıntılar' },
  { id: 'reviews', label: 'İncelemeler' },
  { id: 'all', label: 'Tümü' },
] as const;

export type FeedFilter = (typeof FEED_FILTERS)[number]['id'];

export function feedFilterLabel(id: FeedFilter): string {
  return FEED_FILTERS.find((f) => f.id === id)?.label ?? 'Tümü';
}
