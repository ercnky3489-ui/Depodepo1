#!/usr/bin/env python3
"""
BOOKFLIX demo kullanıcıları: oluştur / kaldır.

  python tools/demo_users.py --create [--count 50] [--follow-user <kullanıcı-adı>]
  python tools/demo_users.py --remove
  python tools/demo_users.py --status
  python tools/demo_users.py --daily [--like-user <kullanıcı-adı>]   # günlük: 20 yeni demo hesap, ~20 alıntı/inceleme

Demo kullanıcılar auth.users'ta app_metadata.demo = true ile oluşturulur, e-postaları
demo-NN@demo.bookflix.invalid biçimindedir, şifreleri yoktur (giriş yapılamaz) ve profillerinde
"Demo hesap" yazar. --remove yalnızca bu işaretli kullanıcıları siler; alıntı, inceleme, beğeni,
takip, kütüphane ve akış kayıtları veritabanındaki ON DELETE CASCADE ile birlikte gider ve sayaçlar
tetikleyicilerle düzelir.

Alıntı metinleri kitaplardan gerçek pasajlar DEĞİLDİR; demo için yazılmış cümlelerdir.

Hedef:
  --target cloud (varsayılan): Supabase Management API (api.supabase.com, anahtar ortamın ağ vekilinde)
                               ve Auth Admin API (servis anahtarı Management API'den okunur, yazdırılmaz)
  --target local            : supabase start ile çalışan yerel proje (docker exec psql)
"""
from __future__ import annotations

import argparse
import re
import json
import random
import subprocess
import sys
import urllib.request
import uuid

REF = "fnmaorzduahtmnqyrooq"
DEMO_DOMAIN = "demo.bookflix.invalid"

FIRST = ["Ayşe", "Mehmet", "Zeynep", "Can", "Elif", "Emre", "Deniz", "Selin", "Burak", "Ece", "Mert", "Defne", "Kaan",
         "İrem", "Onur", "Gizem", "Barış", "Nazlı", "Tolga", "Su", "Arda", "Melis", "Cem", "Ceren", "Efe", "Pınar",
         "Umut", "Damla", "Serkan", "Buse", "Oğuz", "Duygu", "Kerem", "Nehir", "Sinan", "Ilgın", "Alper", "Yasemin",
         "Berk", "Gökçe", "Tuna", "Esra", "Volkan", "Aslı", "Doruk", "Merve", "Levent", "Şule", "Ozan", "Begüm"]
LAST = ["Kaya", "Demir", "Yılmaz", "Şahin", "Çelik", "Aydın", "Öztürk", "Arslan", "Doğan", "Koç", "Kurt", "Özdemir",
        "Aksoy", "Polat", "Erdem", "Güneş", "Tekin", "Karaca", "Uçar", "Bulut", "Sezer", "Akın", "Ateş", "Yalçın"]
BIOS = ["Gece okuru, sabah kahvecisi.", "Tarih ve siyaset kitaplarına zaafım var.", "Roman, deneme, bir de bolca not.",
        "Kütüphanem taşıyor, rafım yetmiyor.", "Okuduğumun altını çizerim.", "Yolda, vapurda, kuyrukta hep bir kitap.",
        "Sosyoloji öğrencisi; her şeyi sorgularım.", "Klasikleri yeniden okuyorum.", "Kısa öykü ve şiir sever.",
        "Psikoloji kitaplarıyla kafa dinlerim.", "Edebiyat öğretmeni.", "Ayda en az dört kitap hedefim var."]
QUOTES = [
    "Bazı yollar yürüyerek değil, hatırlayarak aşınır; geride kalan izler en çok bize benzer.",
    "Bir kuşağı anlatmak, o kuşağın susup geçtiği şeyleri de dinlemeyi gerektirir.",
    "İnsan en çok, kendine anlatmaya cesaret edemediği hikâyenin yükünü taşır.",
    "Şehir değişir, sokaklar adını unutur; ama bir kapı eşiği bütün geçmişi saklayabilir.",
    "Sessizlik bazen bir cevaptır, bazen de cevabı ertelemenin en kibar yolu.",
    "Hatırlamak tek başına yetmez; neyi neden hatırladığımızı da sormak gerekir.",
    "Yazı, unutulmaya direnen her şeyin son sığınağıdır.",
    "Her ev biraz da içinde söylenmemiş sözlerin toplamıdır.",
    "Zaman geçmiyor; biz ondan geçerken eksiliyoruz.",
    "Bir fikir, ancak onu savunacak kadar sevdiğimizde bizim olur.",
    "Kalabalığın içinde yalnız kalmak, insanın kendini en iyi duyduğu andır.",
    "Gerçek değişim, önce kelimelerin anlamını değiştirerek başlar.",
    "Küçük bir merhamet, büyük bir kuramdan daha uzun yaşar.",
    "Okumak, başkasının sesini kendi içimizde yankılandırmaktır.",
    "Her vedanın içinde, söylenmeye fırsat bulamamış bir merhaba saklıdır.",
    "Doğayı yenmeye çalışan, sonunda kendi evini yıkar.",
    "Bir toplumun hafızası, en çok unutmak istediği yerlerde saklıdır.",
    "Çocukluk, insanın ömür boyu geri dönmeye çalıştığı bir başkenttir.",
    "Ağlamak da bir anlatma biçimidir; kelimeler yetmediğinde gözyaşı konuşur.",
    "Sınır koymak, kapıyı kapatmak değil; kimin hangi odaya gireceğine karar vermektir.",
]
# Günlük üretimde tekrar az olsun diye ek cümleler (yine demo için yazılmıştır, kitaplardan alıntı değildir)
MORE_QUOTES = [
    "Bir kitabı bitirmek, bir yolculuktan dönmek gibidir; eşyalar aynı, bakış başka.",
    "İnsanın kendine söylediği yalanlar, başkalarına söylediklerinden daha uzun ömürlüdür.",
    "Acele eden okur kelimeleri görür, sabreden okur aralarındaki boşluğu.",
    "Hafıza bir arşiv değil, her gün yeniden yazılan bir mektuptur.",
    "Bazı sorular cevap için değil, insanı yolda tutmak için sorulur.",
    "Kim olduğumuzu en iyi, neyi kaybetmekten korktuğumuz anlatır.",
    "Yalnızlık, insanın kendi sesine alışmasıdır.",
    "Her şehir, içinde yaşayanların vazgeçtiği hayallerle büyür.",
    "Bir cümlenin gücü, çoğu zaman söylemediği şeyde saklıdır.",
    "Umut, karanlıkta yürürken bir sonraki adımı görebilmektir; yolun sonunu değil.",
    "İnsan, anlatılmayı bekleyen bir hikâyenin hem yazarı hem okurudur.",
    "Geçmişle barışmak, onu unutmak değil, onunla aynı masaya oturabilmektir.",
    "Sevgi, ayrıntıları hatırlamaktır.",
    "En uzun yolculuklar, odadan hiç çıkmadan yapılanlardır.",
    "Bir toplumu anlamak için, çocuklarına hangi masalları anlattığına bakmak yeter.",
    "Korku, bilinmeyenin değil, bildiğimizi kaybetmenin adıdır.",
    "Kelimeler bitince geriye bakışlar kalır; onlar da yetmezse sessizlik.",
    "Kendini affetmek, başkalarını affetmekten daha uzun sürer.",
    "Her kitap, okurunu biraz değiştirir; asıl hikâye kapak kapandıktan sonra başlar.",
    "Bir insanın evine değil, kitaplığına bakarsan onu tanırsın.",
    "Değişmek için önce neyi koruyacağına karar vermelisin.",
    "Zamanı durduramayız ama ona dikkat edebiliriz; bu da bir tür yavaşlamaktır.",
    "Gürültünün ortasında düşünebilmek, en kıymetli özgürlüklerden biridir.",
    "İyi bir hikâye, okurunu yalnız bırakmaz; kötü bir hikâye ise hiç yanına gelmez.",
    "Hatalarımız, en dürüst öğretmenlerimizdir; sadece sesleri biraz yüksektir.",
    "Bir dostluk, birlikte susabildiğiniz yerde başlar.",
    "Merak, insanın içindeki en eski pusuladır.",
    "Uzaklaştıkça netleşen şeyler vardır: eski evler, eski aşklar, eski kendimiz.",
    "Bir fikre sahip olmak kolaydır; onu değiştirebilmek cesaret ister.",
    "Okumak, aynı anda birçok hayat yaşamanın en sessiz yoludur.",
]
TOPIC_QUOTES = [
    "Eşitlik talebi, herkesin payına düşeni gerçekten bilmesiyle başlar.",
    "Emek olmadan hiçbir bina ayağa kalkmaz; ama binanın sahibi çoğu zaman inşa edenler değildir.",
    "Dayanışma, kalabalığın değil, birbirini tanıyan insanların işidir.",
    "Bir sistemi eleştirmek kolaydır; zor olan, onun yerine neyin geleceğini sabırla konuşmaktır.",
    "Sınıf dediğimiz şey çoğu zaman bir kimlik kartından çok, hayatın nereden başladığıdır.",
    "Tarih, kazananların anlattığı kadar kaybedenlerin sustuğu yerlerde de yazılır.",
    "Adalet kelimesi kolay söylenir; onu kurmak için fabrikada, tarlada ve sokakta birlikte durmak gerekir.",
    "Mülkiyetin kimin elinde olduğu sorusu, özgürlüğün kimin için olduğu sorusuyla birlikte sorulmalı.",
    "Bir grev, bazen bir ücret talebinden çok, insanın görünür olmak isteğidir.",
    "Ortak olan bir şeyi korumak, onu sahiplenmekten daha çok özen ister.",
    "Bütün umutlar bir gün gerçekleşmez; ama umut etmeyi bırakan toplum, kendini yönetme hakkını da bırakır.",
    "Özgürlük, yalnızca seçim yapabilmek değil; seçeneklerin herkese açık olmasıdır.",
    "Kolektif hafıza, tek bir kişinin hatırladıklarından daha dayanıklıdır.",
    "Yoksulluk bir karakter kusuru değil, bir düzenin sonucudur; bunu söylemek bile çoğu zaman tartışmaya yol açar.",
    "İnsanlar dayanışmayı öğrenir; çünkü yalnız başına karşı koymanın ne kadar zor olduğunu bilirler.",
    "Bir fikrin gücü, onu kimin taşıdığından çok, kimlere ulaştığında ortaya çıkar.",
    "Eşit olmayan bir dünyada, sessiz kalmak da bir tarafı seçmek anlamına gelir.",
]
REVIEW_OPEN = ["{t} beni beklemediğim yerden yakaladı.", "{t}, uzun süredir okuduğum en dolu kitaplardan biri.",
               "{t} hakkında karışık duygularım var.", "{t} ile ilgili beklentim yüksekti; büyük ölçüde karşıladı.",
               "{t} elimden bırakamadığım kitaplardan oldu.", "{t} yavaş açılıyor ama sabredene çok şey veriyor."]
REVIEW_MID = ["Yazarın dili sade ama hiçbir cümle boşa yazılmamış; her bölüm bir öncekinin üzerine ekleniyor.",
              "Kurgu yer yer dağılıyor gibi görünse de sonlara doğru bütün parçalar yerine oturuyor.",
              "Konuyu tek bir açıdan değil, farklı insanların gözünden anlatması kitabı zenginleştirmiş.",
              "Tarihsel arka planı anlatırken okuru boğmuyor; bilgi ile anlatı arasındaki dengeyi iyi kurmuş.",
              "Bazı bölümler fazla uzun geldi, özellikle ortalarda tempo düşüyor.",
              "Karakterlerin iç dünyasına öyle yakından bakıyor ki zaman zaman kendimi tanık gibi hissettim.",
              "Notlar ve kaynakça çok özenli; meraklısı için ayrıca okunacak bir kitap çıkıyor.",
              "Çeviri akıcı; Türkçede bu kadar doğal okunması ayrıca takdir edilmeli."]
REVIEW_END = ["Konuya ilgisi olan herkese gönül rahatlığıyla öneririm.", "İkinci kez okuyacağım bir kitap oldu.",
              "Her sayfayı acele etmeden, not alarak okumayı hak ediyor.", "Bitirdiğimde bir süre başka bir şey okuyamadım.",
              "Mükemmel değil ama okuduğuma kesinlikle pişman değilim.", "Kitap kulübümüzde uzun uzun konuşacağız."]
TITLES = ["Beklediğimden fazlası", "Ağır ama değerli", "Bir oturuşta bitti", "Not ala ala okudum", "Yavaş, derin, etkileyici",
          "Herkes okumalı", "İyi ama biraz uzun", "Uzun süre aklımda kalacak"]


class Local:
    def sql(self, q: str):
        out = subprocess.run(["docker", "exec", "-i", "supabase_db_bookflix", "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1",
                              "-At", "-F", "\t"], input=q, capture_output=True, text=True)
        if out.returncode:
            raise SystemExit(out.stderr[-1500:])
        return out.stdout

    def admin(self):
        env = subprocess.run(["npx", "-y", "supabase@2.122.0", "status", "-o", "env"], capture_output=True, text=True).stdout
        kv = dict(line.split("=", 1) for line in env.splitlines() if "=" in line)
        return kv["API_URL"].strip('"'), kv["SERVICE_ROLE_KEY"].strip('"')


class Cloud:
    H = {"content-type": "application/json", "authorization": "Bearer proxy-injected"}

    def _call(self, method, path, body=None):
        req = urllib.request.Request(f"https://api.supabase.com/v1/projects/{REF}{path}", method=method, headers=self.H,
                                     data=json.dumps(body).encode() if body is not None else None)
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                return json.loads(r.read() or b"null")
        except urllib.error.HTTPError as e:
            raise SystemExit(f"Management API {e.code}: {e.read().decode()[:1500]}")

    def sql(self, q: str):
        rows = self._call("POST", "/database/query", {"query": q}) or []
        return "\n".join("\t".join("" if v is None else str(v) for v in r.values()) for r in rows)

    def admin(self):
        keys = self._call("GET", "/api-keys?reveal=true")
        return f"https://{REF}.supabase.co", next(k["api_key"] for k in keys if k["name"] == "service_role")


TR_MAP = str.maketrans("çğıöşüâîûÇĞİÖŞÜÂÎÛ", "cgiosuaiuCGIOSUAIU")


def slug(s: str) -> str:
    """Kullanıcı adı için ASCII: Türkçe harfler sadeleşir, harf ve rakam dışı karakter kalmaz."""
    return re.sub(r"[^a-z0-9]", "", s.translate(TR_MAP).lower())[:12]


def delete_auth_users(api_url: str, key: str, users: list[tuple[str, str]]) -> None:
    for uid, _ in users:
        req = urllib.request.Request(f"{api_url}/auth/v1/admin/users/{uid}", method="DELETE",
                                     headers={"apikey": key, "authorization": f"Bearer {key}"})
        try:
            urllib.request.urlopen(req, timeout=60).read()
        except urllib.error.HTTPError:
            pass


def lit(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def create_auth_users(api_url: str, key: str, n: int, tag: str = "") -> list[tuple[str, str]]:
    users = []
    for i in range(1, n + 1):
        email = f"demo-{tag}{i:02d}@{DEMO_DOMAIN}"
        body = {"email": email, "email_confirm": True, "app_metadata": {"demo": True}, "user_metadata": {"demo": True}}
        req = urllib.request.Request(f"{api_url}/auth/v1/admin/users", data=json.dumps(body).encode(), method="POST",
                                     headers={"content-type": "application/json", "apikey": key, "authorization": f"Bearer {key}"})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                users.append((json.loads(r.read())["id"], email))
        except urllib.error.HTTPError as e:
            raise SystemExit(f"Kullanıcı oluşturulamadı ({email}): {e.code} {e.read().decode()[:300]}")
    return users


def build_sql(users: list[tuple[str, str]], books: list[str], follow_user: str | None, rnd: random.Random,
              tag: str = "", quotes_pool: list[str] | None = None) -> str:
    quotes_pool = quotes_pool or QUOTES
    out = ["begin;"]
    names = rnd.sample([(f, l) for f in FIRST for l in LAST], len(users))
    for (uid, _), (first, last), i in zip(users, names, range(1, len(users) + 1)):
        uname = f"demo_{tag}{slug(first + last)}{i:02d}"
        out.append(f"update public.profiles set username={lit(uname)}, display_name={lit(first + ' ' + last[0] + '.')}, "
                   f"bio={lit('Demo hesap · ' + rnd.choice(BIOS))}, onboarded_at=now() - interval '{rnd.randint(20, 40)} days' "
                   f"where id='{uid}';")
    quote_ids, review_ids = [], []
    for uid, _ in users:
        mine = rnd.sample(books, min(len(books), rnd.randint(3, 6)))
        reviewed = set()
        for j, mid in enumerate(mine):
            status = rnd.choice(["completed", "completed", "in_progress", "planned"])
            rating = rnd.randint(5, 10) if status == "completed" else None
            out.append(f"insert into public.library_entries (user_id, media_id, status, rating) values ('{uid}', '{mid}', "
                       f"'{status}', {rating if rating else 'null'}) on conflict do nothing;")
            if status == "completed" and len(reviewed) < rnd.randint(1, 2):
                rid = str(uuid.uuid4()); reviewed.add(mid); review_ids.append((rid, uid))
                body = " ".join([rnd.choice(REVIEW_OPEN).format(t="Bu kitap")] + rnd.sample(REVIEW_MID, 3) + [rnd.choice(REVIEW_END)])
                days = rnd.randint(0, 21)
                out.append(f"insert into public.reviews (id, user_id, media_id, title, body, rating, has_spoiler, created_at) values "
                           f"('{rid}', '{uid}', '{mid}', {lit(rnd.choice(TITLES))}, {lit(body)}, {rating}, {str(rnd.random() < 0.15).lower()}, "
                           f"now() - interval '{days} days {rnd.randint(0, 23)} hours');")
        for mid in rnd.sample(mine, min(len(mine), rnd.randint(1, 3))):
            qid = str(uuid.uuid4()); quote_ids.append((qid, uid))
            out.append(f"insert into public.quotes (id, user_id, media_id, body, page_number, created_at) values ('{qid}', '{uid}', "
                       f"'{mid}', {lit(rnd.choice(quotes_pool))}, {rnd.randint(9, 340)}, now() - interval '{rnd.randint(0, 21)} days {rnd.randint(0, 23)} hours');")
    ids = [u for u, _ in users]
    for uid in ids:
        for other in rnd.sample([x for x in ids if x != uid], rnd.randint(4, 10)):
            out.append(f"insert into public.follows (follower_id, followee_id, status) values ('{uid}', '{other}', 'accepted') on conflict do nothing;")
        for qid, owner in rnd.sample(quote_ids, min(len(quote_ids), rnd.randint(2, 8))):
            if owner != uid:
                out.append(f"insert into public.likes (user_id, target_type, target_id) values ('{uid}', 'quote', '{qid}') on conflict do nothing;")
        for rid, owner in rnd.sample(review_ids, min(len(review_ids), rnd.randint(1, 4))):
            if owner != uid:
                out.append(f"insert into public.review_helpful_votes (user_id, review_id) values ('{uid}', '{rid}') on conflict do nothing;")
    # Akış kayıtlarının tarihi, ait oldukları alıntı/incelemeninkiyle aynı olsun (yeni oluşturuldukları için 'şimdi' görünürlerdi).
    out.append("update public.activities a set created_at = q.created_at from public.quotes q where a.object_id = q.id;")
    out.append("update public.activities a set created_at = r.created_at from public.reviews r where a.object_id = r.id;")
    demo_ids = ",".join(f"'{u}'" for u in ids)
    out.append(f"update public.activities set created_at = now() - (random() * interval '21 days') "
               f"where actor_id in ({demo_ids}) and object_type = 'media';")
    # Toplu beğeni ve takip, akışı "beğendi · şimdi" kartlarıyla doldurur; sayaçlar kalır, akış kayıtları silinir.
    out.append(f"delete from public.activities where actor_id in ({demo_ids}) and verb in ('liked', 'followed');")
    if follow_user:
        for other in rnd.sample(ids, min(12, len(ids))):
            out.append(f"insert into public.follows (follower_id, followee_id, status) select p.id, '{other}', 'accepted' "
                       f"from public.profiles p where p.username = {lit(follow_user)} on conflict do nothing;")
    if follow_user:
        out.append(f"delete from public.activities a using public.profiles p where p.username = {lit(follow_user)} "
                   f"and a.actor_id = p.id and a.verb = 'followed' and a.object_id in ({demo_ids});")
    out.append("commit;")
    return "\n".join(out)


def build_daily_sql(users: list[tuple[str, str]], books: list[str], like_user: str | None, rnd: random.Random, tag: str) -> str:
    """Günlük üretim: her hesap 1 (bazen 2) içerik paylaşır; içerikler günün son saatlerine yayılır.
    Hesaplar birbirini ve son günlerin demo içeriklerini beğenir; --like-user verilirse o kişinin içeriklerini de."""
    pool = QUOTES + MORE_QUOTES
    out = ["begin;"]
    names = rnd.sample([(f, l) for f in FIRST for l in LAST], len(users))
    for (uid, _), (first, last), i in zip(users, names, range(1, len(users) + 1)):
        uname = f"demo_{tag}{slug(first + last)}{i:02d}"[:24]
        out.append(f"update public.profiles set username={lit(uname)}, display_name={lit(first + ' ' + last[0] + '.')}, "
                   f"bio={lit('Demo hesap · ' + rnd.choice(BIOS))}, onboarded_at=now() where id='{uid}';")
    ago = lambda: f"now() - interval '{rnd.randint(0, 9)} hours {rnd.randint(0, 59)} minutes'"
    for uid, _ in users:
        mine = rnd.sample(books, min(len(books), rnd.randint(2, 3)))
        posts = 2 if rnd.random() < 0.12 else 1
        for k, mid in enumerate(mine):
            done = k < posts and rnd.random() < 0.45  # inceleme yazılacaksa kitap bitmiş olur
            status = "completed" if done else rnd.choice(["completed", "in_progress", "in_progress", "planned"])
            rating = rnd.randint(6, 10) if status == "completed" else None
            out.append(f"insert into public.library_entries (user_id, media_id, status, rating) values ('{uid}', '{mid}', "
                       f"'{status}', {rating if rating else 'null'}) on conflict do nothing;")
            if k >= posts:
                continue
            if done:
                body = " ".join([rnd.choice(REVIEW_OPEN).format(t="Bu kitap")] + rnd.sample(REVIEW_MID, 3) + [rnd.choice(REVIEW_END)])
                out.append(f"insert into public.reviews (user_id, media_id, title, body, rating, has_spoiler, created_at) values "
                           f"('{uid}', '{mid}', {lit(rnd.choice(TITLES))}, {lit(body)}, {rating}, false, {ago()});")
            else:
                out.append(f"insert into public.quotes (user_id, media_id, body, page_number, created_at) values ('{uid}', '{mid}', "
                           f"{lit(rnd.choice(pool))}, {rnd.randint(9, 340)}, {ago()});")
    ids = [u for u, _ in users]
    arr = "array[" + ",".join(f"'{u}'::uuid" for u in ids) + "]"
    # Takip: yeni hesaplar birbirini ve önceki demo hesapları takip eder
    out.append(f"insert into public.follows (follower_id, followee_id, status) select a, b, 'accepted' from unnest({arr}) a, "
               f"lateral (select u.id b from auth.users u where u.raw_app_meta_data->>'demo' = 'true' and u.id <> a order by random() limit 5) x "
               f"on conflict do nothing;")
    # Beğeni: son 3 günün demo alıntıları ve incelemeleri
    out.append(f"insert into public.likes (user_id, target_type, target_id) select a, 'quote', q.id from unnest({arr}) a, "
               f"lateral (select q.id from public.quotes q join auth.users u on u.id = q.user_id where u.raw_app_meta_data->>'demo' = 'true' "
               f"and q.user_id <> a and q.created_at > now() - interval '3 days' order by random() limit 4) q on conflict do nothing;")
    out.append(f"insert into public.review_helpful_votes (user_id, review_id) select a, r.id from unnest({arr}) a, "
               f"lateral (select r.id from public.reviews r join auth.users u on u.id = r.user_id where u.raw_app_meta_data->>'demo' = 'true' "
               f"and r.user_id <> a and r.created_at > now() - interval '3 days' order by random() limit 2) r on conflict do nothing;")
    if like_user:
        who = f"(select id from public.profiles where username = {lit(like_user)})"
        # Kişinin son 15 alıntısı/incelemesinden her hesap rastgele birkaçını beğenir; birkaç hesap da takip eder
        out.append(f"insert into public.likes (user_id, target_type, target_id) select a, 'quote', q.id from unnest({arr}) a, "
                   f"lateral (select id from (select id from public.quotes where user_id = {who} order by created_at desc limit 15) t "
                   f"where random() < 0.6) q on conflict do nothing;")
        out.append(f"insert into public.review_helpful_votes (user_id, review_id) select a, r.id from unnest({arr}) a, "
                   f"lateral (select id from (select id from public.reviews where user_id = {who} order by created_at desc limit 15) t "
                   f"where random() < 0.5) r on conflict do nothing;")
        out.append(f"insert into public.follows (follower_id, followee_id, status) select a, {who}, 'accepted' from unnest({arr}) a "
                   f"where random() < 0.3 and {who} is not null on conflict do nothing;")
    out.append("update public.activities a set created_at = q.created_at from public.quotes q where a.object_id = q.id and q.user_id = any(" + arr + ");")
    out.append("update public.activities a set created_at = r.created_at from public.reviews r where a.object_id = r.id and r.user_id = any(" + arr + ");")
    out.append(f"update public.activities set created_at = now() - (random() * interval '9 hours') where actor_id = any({arr}) and object_type = 'media';")
    out.append(f"delete from public.activities where actor_id = any({arr}) and verb in ('liked', 'followed');")
    out.append("commit;")
    return "\n".join(out)


def main() -> int:
    ap = argparse.ArgumentParser(description="BOOKFLIX demo kullanıcıları")
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--create", action="store_true"); g.add_argument("--remove", action="store_true"); g.add_argument("--status", action="store_true")
    g.add_argument("--daily", action="store_true", help="Günlük üretim: --count (varsayılan 20) yeni demo hesap, kişi başı ~1 içerik")
    ap.add_argument("--like-user", help="--daily ile: bu kullanıcının alıntı ve incelemeleri beğenilsin")
    ap.add_argument("--count", type=int, default=None, help="Varsayılan 50; --topic ile 30")
    ap.add_argument("--topic", action="store_true", help="Yalnızca sosyalizm/komünizm temalı kitaplar ve bu konuya uygun alıntılar")
    ap.add_argument("--append", action="store_true", help="Mevcut demo kullanıcıları silinmeden yenilerini ekle")
    ap.add_argument("--follow-user", help="Bu kullanıcı adı 12 demo kullanıcıyı takip etsin (ana sayfada görünsünler)")
    ap.add_argument("--target", choices=["cloud", "local"], default="cloud")
    ap.add_argument("--seed", type=int, default=2026)
    a = ap.parse_args()
    t = Local() if a.target == "local" else Cloud()
    demo_where = "raw_app_meta_data->>'demo' = 'true'"
    status_sql = (f"select (select count(*) from auth.users where {demo_where}) as kullanici, "
                  f"(select count(*) from public.quotes q join auth.users u on u.id=q.user_id where u.{demo_where}) as alinti, "
                  f"(select count(*) from public.reviews r join auth.users u on u.id=r.user_id where u.{demo_where}) as inceleme, "
                  f"(select count(*) from public.likes l join auth.users u on u.id=l.user_id where u.{demo_where}) as begeni, "
                  f"(select count(*) from public.follows f join auth.users u on u.id=f.follower_id where u.{demo_where}) as takip")
    if a.status:
        print("kullanıcı / alıntı / inceleme / beğeni / takip:", t.sql(status_sql)); return 0
    if a.remove:
        print("silinen demo kullanıcı:", t.sql(f"with d as (delete from auth.users where {demo_where} returning 1) select count(*) from d"))
        print("kalan:", t.sql(status_sql)); return 0
    if a.daily:
        import datetime
        day = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=3)))  # İstanbul günü
        tag = "g" + day.strftime("%m%d")
        if t.sql(f"select count(*) from auth.users where email like 'demo-{tag}%@{DEMO_DOMAIN}'").strip() not in ("0", ""):
            print(f"Bugünün demo hesapları ({tag}) zaten oluşturulmuş; atlanıyor."); print("toplam:", t.sql(status_sql)); return 0
        books = [x for x in t.sql("select id from public.media_items where kind = 'book' and cover_path is not null").split() if x]
        if len(books) < 6:
            raise SystemExit("Katalogda yeterli kitap yok.")
        api_url, key = t.admin()
        users = create_auth_users(api_url, key, a.count or 20, tag + "-")
        try:
            t.sql(build_daily_sql(users, books, a.like_user, random.Random(), tag))
        except SystemExit:
            delete_auth_users(api_url, key, users)
            raise
        today = t.sql(f"select (select count(*) from public.quotes q join auth.users u on u.id=q.user_id where u.email like 'demo-{tag}%') || ' alıntı, ' || "
                      f"(select count(*) from public.reviews r join auth.users u on u.id=r.user_id where u.email like 'demo-{tag}%') || ' inceleme'")
        print(f"{len(users)} yeni demo hesap ({tag}): {today}")
        if a.like_user:
            print(f"{a.like_user} için bugün gelen beğeni:", t.sql(
                f"select count(*) from public.notifications n join auth.users u on u.id = n.actor_id where u.email like 'demo-{tag}%' "
                f"and n.recipient_id = (select id from public.profiles where username = {lit(a.like_user)})"))
        print("toplam:", t.sql(status_sql)); return 0
    tag, quotes_pool = "", None
    if a.topic:
        tag, quotes_pool = "s", TOPIC_QUOTES
        books = [x for x in t.sql(
            "select id from public.media_items where kind = 'book' and (title ~* '(sosyal|komün|komun|marks|devrim|işçi|emek|sınıf|kapitalizm|proletar|lenin|troçki|mao|kooperatif|kolektif)' "
            "or description ~* '(sosyalizm|komünizm|marksizm|işçi sınıfı|proletarya|sınıf mücadele|kapitalizm)')").split() if x]
        if not books:
            raise SystemExit("Konuyla ilgili kitap bulunamadı.")
        print(f"konu kitapları: {len(books)} kitap")
    else:
        books = [x for x in t.sql("select id from public.media_items where kind = 'book'").split() if x]
    count = a.count or (30 if a.topic else 50)
    if not a.append and t.sql(f"select count(*) from auth.users where {demo_where}").strip() not in ("0", ""):
        raise SystemExit("Demo kullanıcılar zaten var. Eklemek için --append, sıfırdan için önce --remove kullan.")
    if len(books) < (1 if a.topic else 6):
        raise SystemExit("Katalogda yeterli kitap yok.")
    api_url, key = t.admin()
    users = create_auth_users(api_url, key, count, tag)
    print(f"{len(users)} demo kullanıcı oluşturuldu; içerik ekleniyor…")
    try:
        t.sql(build_sql(users, books, a.follow_user, random.Random(a.seed + (7 if a.topic else 0)), tag, quotes_pool))
    except SystemExit:
        delete_auth_users(api_url, key, users)  # yarım kalan hesapları bırakma
        raise
    print("kullanıcı / alıntı / inceleme / beğeni / takip:", t.sql(status_sql))
    return 0


if __name__ == "__main__":
    sys.exit(main())
