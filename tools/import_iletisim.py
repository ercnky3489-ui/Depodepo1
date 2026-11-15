#!/usr/bin/env python3
"""
data/iletisim/books.json dosyasındaki kitapları BOOKFLIX kataloğuna aktarır.

Her kitap import_publisher_book() fonksiyonuna gider (migration 0011): aynı ISBN ya da aynı
site kimliği ikinci kez gelirse yeni kayıt açılmaz, mevcut kayıt güncellenir. Yayınevi ve baskı
otomatik oluşur; yazar, çevirmen, editör ve derleyen katkıda bulunan olarak eklenir.

Kullanım:
  python tools/import_iletisim.py --sql supabase/seed/iletisim.sql   # SQL dosyası üret (psql ile çalıştırılır)
  python tools/import_iletisim.py                                    # doğrudan Supabase'e gönder
     (SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekir; anahtar uygulamaya konmaz)

Kapaklar: cover_url olarak yayınevinin görsel adresi yazılır. Yayınlamadan önce yayınevi izni gerekir.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.request

MONTHS = {"ocak": 1, "şubat": 2, "mart": 3, "nisan": 4, "mayıs": 5, "haziran": 6, "temmuz": 7,
          "ağustos": 8, "eylül": 9, "ekim": 10, "kasım": 11, "aralık": 12}


def first_edition_date(b: dict) -> str | None:
    """'Eylül 2026' → '2026-09'. 1. baskı yoksa en eski baskı alınır."""
    eds = sorted(b.get("editions") or [], key=lambda e: e["edition"])
    for e in eds:
        m = re.match(r"(\S+)\s+(\d{4})", e["date"].strip())
        if m:
            mon = MONTHS.get(m.group(1).lower())
            return f"{m.group(2)}-{mon:02d}" if mon else m.group(2)
    return None


def to_payload(b: dict) -> dict:
    date = first_edition_date(b)
    title = b["title"]
    if b.get("subtitle"):
        title = f"{title}: {b['subtitle']}"
    contributors, order = [], 0
    for role, key in (("author", "authors"), ("compiler", "compilers"), ("editor", "editors"), ("translator", "translators")):
        for p in b.get(key) or []:
            contributors.append({"name": p["name"], "role": role, "order": order})
            order += 1
    # Derleme kitapta yazar yoksa derleyen, kartlarda görünsün diye yazar rolüyle de eklenir.
    if not b.get("authors"):
        for p in b.get("compilers") or []:
            contributors.insert(0, {"name": p["name"], "role": "author", "order": -1})
    ext = [{"source": "publisher_feed", "external_id": f"iletisim:{b['site_id']}"}]
    if b.get("isbn"):
        ext.append({"source": "isbn", "external_id": b["isbn"]})
    desc = "\n\n".join(x for x in (b.get("spot"), b.get("description")) if x) or None
    return {
        "kind": "book",
        "title": title,
        "original_title": b.get("original_title"),
        "year": int(date[:4]) if date else None,
        "description": desc,
        "cover_url": b.get("cover_url"),
        "language": "tr",
        "source": "publisher_feed",
        "external_ids": ext,
        "contributors": contributors,
        "book": {
            "isbn13": b.get("isbn"),
            "publisher": b.get("publisher") or "İletişim Yayınları",
            "published_date": date,
            "page_count": b.get("page_count"),
            "translator": ", ".join(p["name"] for p in b.get("translators") or []) or None,
        },
    }


def sql_literal(s: str) -> str:
    tag = "$j$"
    assert tag not in s
    return f"{tag}{s}{tag}"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="İletişim Yayınları kitaplarını BOOKFLIX kataloğuna aktarır.")
    ap.add_argument("--in", dest="src", default="data/iletisim/books.json")
    ap.add_argument("--sql", help="Supabase'e göndermek yerine bu SQL dosyasını yaz")
    a = ap.parse_args(argv)

    books = json.load(open(a.src, encoding="utf-8"))["books"]
    payloads = [to_payload(b) for b in books]

    if a.sql:
        os.makedirs(os.path.dirname(a.sql) or ".", exist_ok=True)
        with open(a.sql, "w", encoding="utf-8") as f:
            f.write(f"-- {len(payloads)} kitap: İletişim Yayınları (tools/import_iletisim.py ile üretildi)\n")
            f.write("-- Çalıştırma: psql \"$DATABASE_URL\" -v ON_ERROR_STOP=1 -f supabase/seed/iletisim.sql\n")
            f.write("begin;\n")
            for p in payloads:
                f.write(f"select public.import_publisher_book({sql_literal(json.dumps(p, ensure_ascii=False))}::jsonb);\n")
            f.write("commit;\n")
        print(f"{len(payloads)} kitap → {a.sql}", file=sys.stderr)
        return 0

    url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not (url and key):
        print("SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli (ya da --sql kullan).", file=sys.stderr)
        return 2
    for i, p in enumerate(payloads, 1):
        req = urllib.request.Request(f"{url.rstrip('/')}/rest/v1/rpc/import_publisher_book",
                                     data=json.dumps({"p": p}).encode(), method="POST",
                                     headers={"apikey": key, "Authorization": f"Bearer {key}",
                                              "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=30) as r:
            r.read()
        print(f"[{i}/{len(payloads)}] {p['title']}", file=sys.stderr)
    print(f"Bitti: {len(payloads)} kitap aktarıldı.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
