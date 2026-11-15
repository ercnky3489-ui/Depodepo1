-- BOOKFLIX · 0007 · Supabase Storage kovaları ve politikaları (yerel testte atlanır)
-- Dosya yolu kuralı: <kova>/<kullanıcı-id>/<dosya>. Herkes okur, yalnızca sahibi yazar.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('user-covers', 'user-covers', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "avatars okunur" on storage.objects for select to authenticated
  using (bucket_id in ('avatars', 'user-covers'));

create policy "kendi klasörüne yükler" on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars', 'user-covers') and (storage.foldername(name))[1] = auth.uid()::text);

create policy "kendi dosyasını günceller" on storage.objects for update to authenticated
  using (bucket_id in ('avatars', 'user-covers') and (storage.foldername(name))[1] = auth.uid()::text);

create policy "kendi dosyasını siler" on storage.objects for delete to authenticated
  using (bucket_id in ('avatars', 'user-covers') and (storage.foldername(name))[1] = auth.uid()::text);
