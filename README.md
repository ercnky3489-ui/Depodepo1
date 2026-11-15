# BOOKFLIX

Kitap, film ve dizi zevkleri üzerinden insanları buluşturan sosyal platform. Expo (React Native, TypeScript) istemcisi ve Supabase (PostgreSQL, Auth, Storage, Edge Functions) backend'i.

## Durum

| Alan | Durum | Doğrulama |
| --- | --- | --- |
| Veritabanı şeması (42 tablo), RLS, tetikleyiciler | Tamam | 115 SQL testi yerel PostgreSQL 16'da geçiyor |
| XP motoru, günlük sınırlar, spam/tekrar kontrolü, seviyeler, 7 rozet | Tamam | SQL testleri |
| Akış, keşfet, arama, öneri, profil RPC'leri | Tamam | SQL testleri |
| Katalog içe aktarma (TMDB, Open Library, Google Books), tekrarsız birleştirme | Tamam | SQL + 8 birim testi |
| Edge Functions: catalog-search, catalog-import, catalog-refresh, push-dispatch, account-delete | Yazıldı | Deno ortamında çalıştırılmadı (bkz. Bilinen eksikler) |
| Expo uygulaması: giriş, kurulum, 4 sekme, detay, paylaşım akışları, ayarlar, hesap silme | Yazıldı | Sözdizimi ve import kontrolü geçti; cihazda çalıştırılmadı |
| Topluluklar | Yalnızca veritabanı | Ekranları yok |
| Moderasyon paneli | Yalnızca veritabanı ve kurallar | Ekranı yok |
| IMDb puanı | Kapalı (özellik bayrağı) | Lisans bekleniyor |

## Klasör yapısı

```
app/                    Expo Router ekranları
  (auth)/               Hoş geldin, e-posta kodu
  (onboarding)/         Kullanıcı adı, profil, KVKK rızaları
  (tabs)/               Ana Sayfa, Keşfet, Bildirimler, Profil
  media/[id].tsx        Kitap / film / dizi detayı
  compose/              Paylaş (+): eser seç, alıntı, inceleme, ISBN, liste
  settings/             Ayarlar, profil düzenleme, engellenenler, hesap silme
src/
  api/                  TanStack Query kancaları (Supabase çağrıları)
  components/           Tasarım sistemi bileşenleri
  features/             Akış filtreleri, profil, yorumlar, içerik sayfası
  lib/                  Supabase istemcisi, oturum, biçimlendirme, XP gösterimi
  theme/tokens.ts       Tasarım sistemi token'ları
supabase/
  migrations/           Şema, tetikleyiciler, XP, RLS, RPC, referans veri, storage, cron, katalog
  functions/            Edge Functions ve paylaşılan saf modüller
  tests/                Yerel test altyapısı ve davranış testleri
```

## Kurulum

### 1. Supabase

1. Supabase'de **AB (Frankfurt)** bölgesinde proje aç.
2. `supabase init` (mevcut `supabase/` klasörünü korur), sonra `supabase link --project-ref <ref>`.
3. Panelden **pg_cron** ve **pg_net** uzantılarını aç; Vault'a `project_url` ve `service_role_key` sırlarını ekle.
4. `supabase db push` ile tüm migration'ları uygula.
5. Auth ayarları:
   - E-posta: OTP (6 haneli kod) açık, şablon Türkçe.
   - Apple: Services ID, Team ID, Key ID ve özel anahtar.
   - Google: OAuth istemci kimlikleri; yönlendirme adresi `bookflix://auth/callback`.
6. Edge Function sırları: `supabase secrets set TMDB_READ_TOKEN=... GOOGLE_BOOKS_API_KEY=... OPEN_LIBRARY_CONTACT=... APPLE_TEAM_ID=... APPLE_KEY_ID=... APPLE_CLIENT_ID=app.bookflix APPLE_PRIVATE_KEY=...`
7. `supabase functions deploy catalog-search catalog-import catalog-refresh push-dispatch account-delete books-google`
8. İlk moderatör: `insert into app_roles (user_id, role) values ('<kullanıcı-id>', 'admin');`

Kitap kataloğunu doldurmak için Open Library'nin aylık veri dökümleri kullanılmalıdır; API toplu indirme için uygun değildir. Döküm içe aktarma betiği henüz yazılmadı; kullanıcı aradıkça katalog `catalog-search` ile kendiliğinden büyür.

### 2. Uygulama

```bash
npm install
npx expo install --fix         # tüm Expo paketlerini SDK 58 ile uyumlu sürümlere sabitler
cp .env.example .env           # EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_ANON_KEY
npx expo run:ios               # Apple girişi, kamera ve bildirim için geliştirme derlemesi gerekir
```

Sürümler Expo SDK 58'in beklediği değerlere sabitlendi; SDK yükseltince `npx expo install --fix` çalıştır.

### Yerel çalıştırma (web önizleme, Docker gerekir)

Bulut hesabı açmadan uygulamayı tarayıcıda uçtan uca çalıştırır: yerel Supabase, 60 kitaplık İletişim kataloğu
(`supabase/seed/`), e-posta kodları için Mailpit.

```bash
npx supabase@2.122.0 start -x studio,imgproxy,logflare,vector,supavisor,realtime,postgres-meta,edge-runtime
# .env: EXPO_PUBLIC_SUPABASE_URL=/sb ve `supabase status` çıktısındaki ANON_KEY
npm run web:build
eval "$(npx supabase@2.122.0 status -o env | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY)=')"
SUPABASE_URL=$API_URL SUPABASE_ANON_KEY=$ANON_KEY SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY npm run functions:dev &
FUNCTIONS_API=http://127.0.0.1:54330 npm run web:preview      # http://localhost:8080
```

- Giriş kodu e-postaları Mailpit'e düşer: http://localhost:54324
- `edge-runtime` konteyneri vekil sertifikalı ağlarda Deno paketlerini indiremediği için kapalı tutulur;
  fonksiyonlar `tools/functions-dev.ts` ile yerel Deno'da çalışır. Normal ağda bu konteyneri açık bırakıp
  `FUNCTIONS_API` vermeden de kullanabilirsin.
- E-posta şablonu (`supabase/templates/otp.html`) bağlantı yerine 6 haneli kod gönderir; canlı projede de
  Auth → Email Templates'te aynı şablon kullanılmalı.

### Demo kullanıcılar

```bash
python tools/demo_users.py --create --follow-user <kullanıcı-adın>   # 50 demo kullanıcı, alıntı, inceleme, beğeni, takip
python tools/demo_users.py --status
python tools/demo_users.py --remove                                  # hepsini ve içeriklerini siler
```

Demo hesaplar `app_metadata.demo = true` ile işaretlidir, e-postaları `demo-NN@demo.bookflix.invalid`, şifreleri yoktur ve
profillerinde "Demo hesap" yazar. Alıntı metinleri kitaplardan gerçek pasajlar değildir. Silme yalnızca işaretli hesapları
kaldırır; içerikleri ON DELETE CASCADE ile gider, sayaçlar tetikleyicilerle düzelir. `--target local` yerel Supabase'de çalışır.

### 3. Testler

```bash
# Veritabanı: yerel PostgreSQL 16+ gerekir (Supabase auth şeması testte taklit edilir)
PGHOST=... PGPORT=... PGUSER=postgres npm run test:db

# Saf TypeScript modülleri (biçimlendirme, XP gösterimi, katalog dönüştürücüleri, push metinleri)
npm test
```

## Lisans ve veri kaynakları

- **TMDB:** Yayından önce yazılı ticari anlaşma gerekir. "Hakkında" ve ayarlarda zorunlu atıf metni vardır. Veriler 150 günde bir yenilenir (6 ay önbellek sınırı).
- **Google Books:** Her gösterimde Google atfı ve Google Books bağlantısı bulunur; arama sonuçları yeniden sıralanmaz. Kullanıcıdan ücret almak Google'ın iznine bağlıdır.
- **Open Library:** İstekler kimlikli `User-Agent` ile gönderilir; toplu veri için aylık dökümler kullanılır.
- **IMDb:** Yalnızca AWS Data Exchange lisansıyla. `EXPO_PUBLIC_IMDB_ENABLED=true` ve bir `imdb-ratings` içe aktarma görevi lisans sonrası eklenecek.
- Hiçbir kaynaktan sayfa kazıma yapılmaz.

## Mağaza öncesi kontrol listesi

- [ ] TMDB ticari anlaşması imzalandı; App Store incelemesi için belge hazır
- [ ] KVKK: aydınlatma metni, yurt dışı aktarım için standart sözleşmeler (Supabase, Expo, Sentry) imzalandı ve 5 iş günü içinde Kurum'a bildirildi
- [ ] Web sayfaları yayında: `/kvkk`, `/kosullar`, `/telif` (telif bildirim formu `copyright_notices` tablosuna yazar), `/hesap-sil` (Google Play'in istediği web silme talebi)
- [ ] App Store: gizlilik etiketleri, yaş derecelendirmesi, destek e-postası, demo hesap
- [ ] Google Play: Veri güvenliği formu ve hesap silme bağlantısı
- [ ] Moderasyon için en az bir moderatör hesabı ve yanıt süresi taahhüdü (App Store Y. 1.2)
- [ ] Maestro uçtan uca testleri (kayıt, alıntı, inceleme, beğeni, hesap silme)

## Bilinen eksikler

- Uygulama kodu bu ortamda paket kurulamadığı için **cihazda veya simülatörde çalıştırılmadı** ve tam TypeScript tip kontrolünden geçmedi. İlk iş: `npm install`, `npx expo install --fix`, `npm run typecheck` ve çıkan tip hatalarının düzeltilmesi.
- Edge Functions Deno ortamında çalıştırılmadı; `supabase functions serve` ile yerelde denenmeli.
- Topluluk ve moderasyon paneli ekranları, Open Library döküm içe aktarıcı, Sentry ve PostHog entegrasyonu, açık tema henüz yok.
- Kalıcı silme sonrası onay e-postası gönderilmiyor.

## Baskılar, yayınevleri ve kapaklar (migration 0010)

Her kitap bir **eser**dir; altında **baskılar** bulunur (yayınevi, çevirmen, yıl, sayfa, ISBN, kapak).

- **Harici kaynaklar:** Google Books ve Open Library'den gelen kitaplar, `book_details` yazıldığında otomatik olarak baskı olarak kaydedilir.
- **Yayınevi akışları:** Anlaşma yapılan yayınevlerinin verisi (ör. ONIX) `import_media` ile `source = 'publisher_feed'` olarak aktarılır. Bu yayınevleri `publishers.verified = true` ile işaretlenir.
- **Okur katkısı:** `add_book_edition` ile baskı eklenir; ISBN kontrol hanesi doğrulanır, eklenen baskı moderasyona düşer. Kapak, `user-covers/<uid>/` klasörüne yüklenip `submit_cover` ile önerilir; moderatör `moderate_cover` ile onaylar.
- **Ekranlar:** Kitap sayfasında "Baskılar" bölümü, `/edition/new` (baskı ekleme) ve `/publisher/[id]` (yayınevi sayfası). ISBN tarandığında önce BOOKFLIX baskılarında aranır (`find_by_isbn`).

Başka sitelerden (1000Kitap, Kitapyurdu vb.) veri veya kapak kazınmaz.

## Google Books'tan toplu Türkçe kitap aktarımı

`tools/seed_google_books.py`, Google Books'ta `langRestrict=tr` ile arama yapar ve sonuçları `import_media()` üzerinden kataloğa yazar. Yayınevi ve baskı otomatik oluşur. Kapak görselleri indirilmez, yalnızca adresleri saklanır (Google API şartları). Testler: `python3 tools/test_seed_google_books.py`.

```
export GOOGLE_BOOKS_API_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
python3 tools/seed_google_books.py --author "Sabahattin Ali" --max 40
python3 tools/seed_google_books.py --publisher "İletişim Yayınları" --max 200 --dry-run
```

## Paylaşırken Google Books'ta arama

Alıntı/inceleme için kitap seçerken (`app/compose/pick.tsx`) önce BOOKFLIX kataloğu, altında **"Google Books'ta"** bölümü gösterilir (`books-google` Edge Function, Türkçe öncelikli `langRestrict=tr`). Google sonuçları kataloğa yazılmaz; kullanıcı birini seçince yalnızca o kitap `import_media` ile eklenir, yayınevi ve baskı otomatik oluşur. Sonuç sırası değiştirilmez ve "Google Books" kaynağı belirtilir. Gerekli gizli anahtar: `supabase secrets set GOOGLE_BOOKS_API_KEY=...`
