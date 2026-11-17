-- Okuma serisi hatırlatmalarına Duolingo tarzı, şakacı metinler: her seferinde havuzdan rastgele biri.
-- Metin bildirimin data alanına (title, body) yazılır; uygulama ve push gönderici bunu kullanır.
create or replace function public.streak_message(p_slot text, p_streak integer) returns jsonb
language plpgsql volatile set search_path = '' as $$
declare
  n text := p_streak::text;
  noon text[][] := array[
    array['Kitabın seni özledi 📖', 'Rafta tozlanırken hep seni düşünüyor. Sadece 5 sayfa, söz.'],
    array['Gözlüğün buğulandı 👓', 'Okumayınca böyle oluyor. Bir sayfa okusan hemen açılır.'],
    array['Merhaba, ben kitap ayracın 🔖', 'Kaldığın sayfada bekliyorum. Hâlâ. Dün de beklemiştim.'],
    array['Telefonda 3 saat, kitapta 0 dakika? 🤔', 'Hesap tutmuyoruz. Tamam, tutuyoruz. ' || n || ' günlük serini harcama.'],
    array['Dostoyevski böyle başlamadı ✍️', 'O hiç "yarın okurum" demedi. Bugün okuyalım mı?'],
    array['Öğle arası = okuma arası ☕', 'Kahveni al, kitabını aç. ' || n || ' günlük serin seni bekliyor.'],
    array['Karakterler senden haber bekliyor 👀', 'Kaldığın yerde öylece duruyorlar. Ayıp oluyor ama.']
  ];
  evening text[][] := array[
    array['🔥 ' || n || ' günlük serin ağlıyor', 'Gece yarısına az kaldı. Söndürme şu ateşi, 5 dakika yeter.'],
    array['Son çağrı: okuma seferi kalkıyor 🚂', n || ' günlük serin peronda. Biletin hazır, tek bir sayfa yeter.'],
    array['Bu bildirimi görmezden gelirsen… 😢', '…kitabının kapağı biraz üzülecek. Biz de. ' || n || ' gün emek bu!'],
    array['Gözlük alarm veriyor 🚨', n || ' günlük seri tehlikede! Tek bir sayfa her şeyi kurtarır.'],
    array['Ben ısrar etmem ama… 👓', '…ısrar ediyorum. ' || n || ' günlük seri, bir kitap ve sen. Hadi.'],
    array['Netflix bekleyebilir 🍿', 'Önce 10 sayfa, sonra dizi. ' || n || ' günlük serin bunu hak ediyor.'],
    array['Uyumadan önce bir bölüm? 🌙', 'Uykudan önce okumak rüyaları güzelleştirir. Bilimsel değil ama denemeye değer.']
  ];
  pick integer;
begin
  if p_slot = 'evening' then
    pick := 1 + floor(random() * array_length(evening, 1))::integer;
    return jsonb_build_object('title', evening[pick][1], 'body', evening[pick][2]);
  end if;
  pick := 1 + floor(random() * array_length(noon, 1))::integer;
  return jsonb_build_object('title', noon[pick][1], 'body', noon[pick][2]);
end
$$;
revoke execute on function public.streak_message(text, integer) from public, anon, authenticated;

create or replace function public.send_streak_reminders(p_slot text) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  today date := public.istanbul_today();
  n integer := 0;
begin
  if p_slot not in ('noon', 'evening') then raise exception 'invalid_slot' using errcode = 'P0001'; end if;
  with days as (
    select distinct user_id, day from public.reading_sessions where seconds >= 60 and day >= today - 400
  ), g as (
    select user_id, day, day - (row_number() over (partition by user_id order by day))::integer as grp from days
  ), runs as (
    select user_id, max(day) as e, count(*)::integer as len from g group by user_id, grp
  ), alive as (
    select user_id, len from runs where e = today - 1
  ), ins as (
    insert into public.notifications (recipient_id, actor_id, type, target_type, target_id, data)
    select a.user_id, null, 'streak_reminder', null, null,
           jsonb_build_object('streak', a.len, 'slot', p_slot) || public.streak_message(p_slot, a.len)
    from alive a
    join public.user_settings s on s.user_id = a.user_id and s.notify_streak
    where not exists (
      select 1 from public.notifications x
      where x.recipient_id = a.user_id and x.type = 'streak_reminder' and x.data->>'slot' = p_slot
        and x.created_at >= (today::timestamp at time zone 'Europe/Istanbul')
    )
    returning 1
  )
  select count(*) into n from ins;
  return n;
end
$$;
revoke execute on function public.send_streak_reminders(text) from public, anon, authenticated;
