-- BOOKFLIX · 0008 · Zamanlanmış görevler (yerel testte atlanır)
-- Gerekli: Supabase panelinde pg_cron ve pg_net uzantıları açık; Vault'ta
-- 'project_url' ve 'service_role_key' sırları tanımlı.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Silme talebinin üzerinden 30 gün geçen hesapları kalıcı siler (her gün 03:10, İstanbul 06:10)
select cron.schedule('purge-deleted-accounts', '10 3 * * *', $$ select public.purge_deleted_accounts(); $$);

-- Keşfet sıralaması için haftalık skorlar (saat başı)
select cron.schedule('refresh-weekly-scores', '7 * * * *', $$ select public.refresh_weekly_scores(); $$);

-- Bekleyen bildirimleri push olarak gönderir (her dakika)
select cron.schedule('push-dispatch', '* * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/push-dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
$$);

-- TMDB şartları verinin 6 aydan uzun önbellekte kalmamasını istiyor: 150 günden eski kayıtlar yenilenir (her gece)
select cron.schedule('catalog-refresh', '40 2 * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/catalog-refresh',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{"older_than_days":150,"limit":200}'::jsonb
  );
$$);
