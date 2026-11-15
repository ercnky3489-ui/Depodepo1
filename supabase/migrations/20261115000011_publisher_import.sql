-- Yayınevi sitelerinden gelen kitaplar (ilk kaynak: İletişim Yayınları, tools/import_iletisim.py)
--   * Çevirmen, editör ve derleyen de katkıda bulunan olarak saklanır. Kartlardaki alt başlık
--     yalnızca author/director/creator rollerini okuduğu için bu roller orada görünmez.
--   * Yayınevi sitesindeki kayıt kimliği external_ids'e 'publisher_feed' kaynağıyla yazılır
--     (ör. 'iletisim:10991'); aynı kitap tekrar aktarılırsa yeni kayıt açılmaz.
--   * Çevirmen, baskıya (book_editions.translator) yazılır.

alter type public.contributor_role add value if not exists 'translator';
alter type public.contributor_role add value if not exists 'editor';
alter type public.contributor_role add value if not exists 'compiler';

alter table public.external_ids drop constraint if exists external_ids_source_check;
alter table public.external_ids add constraint external_ids_source_check
  check (source in ('open_library', 'google_books', 'tmdb', 'imdb', 'isbn', 'publisher_feed'));

create or replace function public.import_publisher_book(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  mid uuid;
  isbn text := nullif(p #>> '{book,isbn13}', '');
  tr text := nullif(btrim(coalesce(p #>> '{book,translator}', '')), '');
begin
  if p ->> 'kind' <> 'book' or p ->> 'source' <> 'publisher_feed' then
    raise exception 'invalid_payload';
  end if;
  mid := public.import_media(p);
  if tr is not null and isbn is not null then
    update public.book_editions set translator = left(tr, 120)
    where isbn13 = isbn and translator is distinct from left(tr, 120);
  end if;
  return mid;
end
$$;
revoke execute on function public.import_publisher_book(jsonb) from public, anon, authenticated;
