-- Yeni XP türleri (enum değerleri aynı işlemde kullanılamadığı için ayrı migration).
alter type public.xp_action add value if not exists 'isbn_added';
alter type public.xp_action add value if not exists 'reading_session';
alter type public.xp_action add value if not exists 'streak_bonus';
