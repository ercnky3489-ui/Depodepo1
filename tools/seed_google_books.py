#!/usr/bin/env python3
"""
BOOKFLIX · Google Books'tan Türkçe kitap kataloğu doldurma aracı.

Gönderilen TurkishBookFetcher betiğinin BOOKFLIX'e uyarlanmış hali. Farkları:

  * Kapaklar İNDİRİLMEZ ve kendi sunucumuzda saklanmaz. Google API Hizmet Şartları,
    API'den gelen içeriğin önbellek başlığının izin verdiğinden uzun süre saklanmasını
    yasaklar; kapak görselleri de çoğunlukla yayınevlerinindir. Bu yüzden yalnızca
    kapak ADRESİ kaydedilir ve uygulama görseli Google'dan gösterir (cover_url).
    Kalıcı kapak için tek yol yayınevi izni ya da okurun kendi çektiği fotoğraftır
    (submit_cover).
  * Türkçe filtresi `lang:tr` ile değil, API'nin gerçek parametresi `langRestrict=tr` ile yapılır.
  * ISBN yoksa Google kimliği ISBN yerine yazılmaz; yayınevi yoksa "Bilinmeyen Yayınevi"
    diye sahte bir yayınevi oluşturulmaz (boş kalır).
  * ISBN kontrol hanesi doğrulanır, ISBN-10 ISBN-13'e çevrilir.
  * Sonuçlar sayfalanır (startIndex), 429/5xx yanıtlarında bekleyip yeniden denenir.
  * Kayıtlar Supabase'deki import_media() fonksiyonuna gönderilir: aynı kitap ikinci kez
    gelirse yeni kayıt açılmaz, mevcut kayıt güncellenir; yayınevi ve baskı otomatik oluşur
    (migration 0010). Betiği düzenli çalıştırmak bilgileri tazeler.

Kullanım:
  export GOOGLE_BOOKS_API_KEY=...            # Google Cloud Console'dan
  export SUPABASE_URL=https://xxxx.supabase.co
  export SUPABASE_SERVICE_ROLE_KEY=...       # yalnızca sunucuda/kendi bilgisayarında, uygulamaya koyma
  python tools/seed_google_books.py --author "Sabahattin Ali" --max 40
  python tools/seed_google_books.py --publisher "Yapı Kredi Yayınları" --max 200
  python tools/seed_google_books.py --query "roman" --max 100 --dry-run   # veritabanına yazmadan göster

Uygulama ücretliyse (premium vb.) Google'dan ayrıca izin gerekir; Google Books şartları,
ayrı anlaşma olmadan kullanıcılardan ücret alınmasına izin vermez.
"""
from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
import time
from typing import Any, Iterator

API = "https://www.googleapis.com/books/v1/volumes"
PAGE = 40  # Google Books'un izin verdiği en büyük sayfa


# ---------------------------------------------------------------- saf yardımcılar (test edilir)
def clean(s: Any) -> str | None:
    if not isinstance(s, str):
        return None
    t = re.sub(r"\s+", " ", s).strip()
    return t or None


def isbn_valid(raw: str) -> bool:
    s = re.sub(r"[^0-9Xx]", "", raw or "").upper()
    if re.fullmatch(r"\d{13}", s):
        t = sum(int(d) * (3 if i % 2 else 1) for i, d in enumerate(s[:12]))
        return (10 - t % 10) % 10 == int(s[12])
    if re.fullmatch(r"\d{9}[\dX]", s):
        t = sum((10 if d == "X" else int(d)) * (10 - i) for i, d in enumerate(s))
        return t % 11 == 0
    return False


def to_isbn13(raw: str | None) -> str | None:
    if not raw:
        return None
    s = re.sub(r"[^0-9Xx]", "", raw).upper()
    if not isbn_valid(s):
        return None
    if len(s) == 13:
        return s
    core = "978" + s[:9]
    t = sum(int(d) * (3 if i % 2 else 1) for i, d in enumerate(core))
    return core + str((10 - t % 10) % 10)


def strip_html(s: Any) -> str | None:
    t = clean(s)
    if not t:
        return None
    t = re.sub(r"<br\s*/?>|</p>", "\n", t, flags=re.I)
    t = re.sub(r"<[^>]+>", "", t)
    return clean(html.unescape(t))


def cover_url(info: dict) -> str | None:
    links = info.get("imageLinks") or {}
    u = links.get("thumbnail") or links.get("smallThumbnail")
    if not u:
        return None
    u = u.replace("http://", "https://").replace("&edge=curl", "")
    return u


def normalize_volume(v: dict) -> dict | None:
    """Google Books 'volume' kaydını import_media() yüküne çevirir (normalize.ts ile aynı kurallar)."""
    info = v.get("volumeInfo") or {}
    title = clean(info.get("title"))
    vid = v.get("id")
    if not title or not isinstance(vid, str):
        return None
    ids = {i.get("type"): i.get("identifier") for i in info.get("industryIdentifiers") or []}
    isbn13 = to_isbn13(ids.get("ISBN_13")) or to_isbn13(ids.get("ISBN_10"))
    isbn10 = ids.get("ISBN_10") if ids.get("ISBN_10") and isbn_valid(ids["ISBN_10"]) else None
    external_ids = [{"source": "google_books", "external_id": vid}]
    if isbn13:
        external_ids.append({"source": "isbn", "external_id": isbn13})
    year_m = re.match(r"^(\d{4})", info.get("publishedDate") or "")
    year = int(year_m.group(1)) if year_m and 1400 <= int(year_m.group(1)) <= 2100 else None
    subtitle = clean(info.get("subtitle"))
    link = clean(info.get("infoLink")) or f"https://books.google.com/books?id={vid}"
    rating = None
    if isinstance(info.get("averageRating"), (int, float)) and info["averageRating"] > 0:
        rating = {"source": "google_books", "value": info["averageRating"], "scale": 5,
                  "vote_count": info.get("ratingsCount"), "attribution_url": link}
    pages = info.get("pageCount")
    return {
        "kind": "book",
        "title": f"{title}: {subtitle}" if subtitle else title,
        "year": year,
        "description": strip_html(info.get("description")),
        "cover_url": cover_url(info),
        "language": clean(info.get("language")),
        "source": "google_books",
        "external_ids": external_ids,
        "contributors": [{"name": n, "role": "author", "order": i}
                         for i, n in enumerate((info.get("authors") or [])[:5]) if clean(n)],
        "book": {
            "isbn13": isbn13,
            "isbn10": isbn10,
            "publisher": clean(info.get("publisher")),
            "published_date": clean(info.get("publishedDate")),
            "page_count": pages if isinstance(pages, int) and 0 < pages < 20000 else None,
        },
        "external_rating": rating,
    }


def build_query(query: str | None, author: str | None, publisher: str | None, title: str | None) -> str:
    parts = []
    if query:
        parts.append(query)
    if title:
        parts.append(f'intitle:"{title}"')
    if author:
        parts.append(f'inauthor:"{author}"')
    if publisher:
        parts.append(f'inpublisher:"{publisher}"')
    if not parts:
        raise ValueError("En az bir arama ölçütü ver (--query, --author, --publisher, --title).")
    return " ".join(parts)


# ---------------------------------------------------------------- ağ
def fetch_volumes(session, q: str, api_key: str | None, limit: int) -> Iterator[dict]:
    start = 0
    while start < limit:
        params = {"q": q, "langRestrict": "tr", "printType": "books", "maxResults": min(PAGE, limit - start),
                  "startIndex": start, "orderBy": "relevance"}
        if api_key:
            params["key"] = api_key
        for attempt in range(5):
            r = session.get(API, params=params, timeout=20)
            if r.status_code in (429, 500, 502, 503):
                time.sleep(2 ** attempt)
                continue
            r.raise_for_status()
            break
        else:
            raise RuntimeError("Google Books şu an yanıt vermiyor, sonra tekrar dene.")
        items = r.json().get("items") or []
        if not items:
            return
        yield from items
        start += len(items)
        time.sleep(0.5)  # nazik hız


def send(session, url: str, key: str, payload: dict) -> str:
    r = session.post(f"{url.rstrip('/')}/rest/v1/rpc/import_media", json={"p": payload}, timeout=20,
                     headers={"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    if r.status_code >= 300:
        raise RuntimeError(f"import_media hatası {r.status_code}: {r.text[:200]}")
    return r.json()


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Google Books'tan Türkçe kitapları BOOKFLIX kataloğuna aktarır.")
    ap.add_argument("--query")
    ap.add_argument("--author")
    ap.add_argument("--publisher")
    ap.add_argument("--title")
    ap.add_argument("--max", type=int, default=40)
    ap.add_argument("--dry-run", action="store_true", help="Veritabanına yazma, yükleri ekrana bas.")
    a = ap.parse_args(argv)

    import requests  # yalnızca gerçek çalıştırmada gerekir

    q = build_query(a.query, a.author, a.publisher, a.title)
    api_key = os.environ.get("GOOGLE_BOOKS_API_KEY")
    if not api_key:
        print("Uyarı: GOOGLE_BOOKS_API_KEY yok; anahtarsız kota çok düşüktür.", file=sys.stderr)
    sb_url, sb_key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not a.dry_run and not (sb_url and sb_key):
        print("SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli (ya da --dry-run kullan).", file=sys.stderr)
        return 2

    s = requests.Session()
    s.headers["User-Agent"] = "BOOKFLIX-catalog-seed/1.0"
    seen, ok, skipped = set(), 0, 0
    for v in fetch_volumes(s, q, api_key, a.max):
        p = normalize_volume(v)
        if not p or p["external_ids"][0]["external_id"] in seen:
            skipped += 1
            continue
        seen.add(p["external_ids"][0]["external_id"])
        if p.get("language") not in (None, "tr"):
            skipped += 1
            continue
        if a.dry_run:
            print(json.dumps(p, ensure_ascii=False))
        else:
            send(s, sb_url, sb_key, p)
        ok += 1
        b = p["book"]
        print(f"[ok] {p['title']} · {', '.join(c['name'] for c in p['contributors']) or '?'} · "
              f"{b['publisher'] or 'yayınevi yok'} · ISBN {b['isbn13'] or '-'}", file=sys.stderr)
    print(f"\nBitti: {ok} kitap aktarıldı, {skipped} atlandı.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
