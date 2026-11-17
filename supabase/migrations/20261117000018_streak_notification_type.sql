-- Okuma serisi hatırlatması için yeni bildirim türü (enum değeri ayrı dosyada eklenir; aynı işlemde kullanılamaz).
alter type public.notification_type add value if not exists 'streak_reminder';
