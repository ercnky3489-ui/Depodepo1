-- BOOKFLIX · 0006 · Referans veriler (kural tabloları; demo içerik değildir)

insert into public.xp_settings (id) values (true) on conflict do nothing;

-- Senin verdiğin başlangıç puanları ve dokümandaki kalite/limit kuralları
insert into public.xp_rules (action, xp, cap_group, daily_count_cap, daily_xp_cap, min_chars) values
  ('quote_book',      20, 'quote',   5,    null, 40),
  ('quote_screen',    20, 'quote',   5,    null, 40),
  ('review_book',     60, 'review',  3,    null, 300),
  ('review_movie',    60, 'review',  3,    null, 300),
  ('review_episode',  25, 'episode', 5,    null, 150),
  ('review_helpful',   3, 'helpful', null, 60,   0),
  ('content_liked',    1, 'liked',   null, 50,   0),
  ('start_reading',    2, 'start',   5,    null, 0),
  ('log_movie',        2, 'log',     10,   null, 0)
on conflict (action) do update set
  xp = excluded.xp, cap_group = excluded.cap_group, daily_count_cap = excluded.daily_count_cap,
  daily_xp_cap = excluded.daily_xp_cap, min_chars = excluded.min_chars;

insert into public.levels (level, min_xp) values
  (1, 0), (2, 100), (3, 250), (4, 500), (5, 1000), (6, 1750), (7, 2750), (8, 4000), (9, 5500), (10, 7500)
on conflict (level) do update set min_xp = excluded.min_xp;

insert into public.badges (code, name, description, icon, tiers, sort_order) values
  ('book_worm',       'Kitap Kurdu',      'Okudum durumundaki kitap sayısı.',                     'book',  '{10,50,150}',   1),
  ('long_reader',     'Uzun Okur',        'Bitirilen 500 sayfadan uzun kitap sayısı.',            'stack', '{1,5,20}',      2),
  ('film_buff',       'Film Tutkunu',     'İzledim durumundaki film sayısı.',                     'film',  '{25,100,500}',  3),
  ('series_lover',    'Dizi Sever',       'İzlendi işaretli bölüm sayısı.',                       'tv',    '{100,500,2000}', 4),
  ('quote_master',    'Alıntı Ustası',    'En az 3 beğeni almış alıntı sayısı.',                  'quote', '{5,25,100}',    5),
  ('master_reviewer', 'Usta Yorumcu',     'En az 5 faydalı oy almış inceleme sayısı.',            'pen',   '{5,25,100}',    6),
  ('film_critic',     'Film Eleştirmeni', 'Kalite şartını geçmiş film incelemesi sayısı.',        'star',  '{10,50,200}',   7)
on conflict (code) do update set name = excluded.name, description = excluded.description,
  icon = excluded.icon, tiers = excluded.tiers, sort_order = excluded.sort_order;
