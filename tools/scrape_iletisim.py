#!/usr/bin/env python3
"""
İletişim Yayınları ana sayfasındaki kitapların künye bilgilerini ve kapaklarını toplar.

Ana sayfadaki her /kitap/<ad>/<id> bağlantısı için detay sayfası okunur; künye tablosu,
tanıtım metni, yazar/editör/çevirmen, fiyat, baskı ve kapak görseli çıkarılır.
Siteyi yormamak için istekler arasında bekleme vardır (--delay, varsayılan 1 sn).

Kullanım:
  python tools/scrape_iletisim.py                       # data/iletisim/ altına yazar
  python tools/scrape_iletisim.py --no-covers           # yalnızca bilgiler
  python tools/scrape_iletisim.py --url https://iletisim.com.tr/yeni-cikanlar/kasim-2026/11/2026

Çıktı:
  data/iletisim/books.json   kitap kayıtları
  data/iletisim/covers/      <isbn veya site-id>.jpg kapaklar

Not: Kapak görselleri ve tanıtım metinleri yayınevinin telifindedir. Geliştirme ve
deneme için yerelde tutulur; uygulamada yayımlamadan önce yayınevinden izin alınmalıdır.
"""
from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
import time
import urllib.request
from urllib.parse import urljoin

BASE = "https://iletisim.com.tr/"
UA = "Mozilla/5.0 (compatible; BOOKFLIX-catalog/1.0)"


def get(url: str, binary: bool = False, tries: int = 4):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                data = r.read()
                return data if binary else data.decode("utf-8", "replace")
        except Exception as e:  # ağ hatası: bekle, tekrar dene
            if i == tries - 1:
                raise
            time.sleep(2 ** i)


def text(fragment: str | None) -> str | None:
    if fragment is None:
        return None
    t = re.sub(r"<br\s*/?>|</p>|</li>", "\n", fragment, flags=re.I)
    t = re.sub(r"<[^>]+>", "", t)
    t = html.unescape(t).replace("\xa0", " ")
    t = "\n".join(re.sub(r"[ \t]+", " ", ln).strip() for ln in t.splitlines())
    t = re.sub(r"\n{2,}", "\n\n", t).strip()
    return t or None


def links(fragment: str) -> list[dict]:
    out = []
    for href, name in re.findall(r"<a[^>]*href='([^']+)'[^>]*>(.*?)</a>", fragment, flags=re.S):
        n = text(name)
        if n:
            out.append({"name": n, "url": urljoin(BASE, href)})
    return out


def book_links(page_html: str) -> list[str]:
    seen, out = set(), []
    for href in re.findall(r"""href=['"](/kitap/[^'"#?]+/\d+)['"]""", page_html):
        if href not in seen:
            seen.add(href)
            out.append(urljoin(BASE, href))
    return out


def parse_book(url: str, s: str) -> dict:
    def first(pat: str) -> str | None:
        m = re.search(pat, s, flags=re.S)
        return m.group(1) if m else None

    kunye: dict[str, str] = {}
    kunye_links: dict[str, list[dict]] = {}
    tab = first(r'<div class="tab-pane kunye" id="Tab4">(.*?)</table>') or ""
    for k, v in re.findall(r"<tr>\s*<td>(.*?)</td>\s*<td>(.*?)</td>\s*</tr>", tab, flags=re.S):
        key = text(k) or ""
        if key == "Baskı" and key in kunye:  # künyede ikinci "Baskı" satırı matbaayı gösterir
            key = "Matbaa"
        kunye[key] = text(v) or ""
        if "<a" in v:
            kunye_links[key] = links(v)

    def people(role: str) -> list[dict]:
        return kunye_links.get(role) or ([{"name": kunye[role], "url": None}] if kunye.get(role) else [])

    cover = first(r'class="BigImage">\s*<img src=\'([^\']+)\'')
    pages = re.search(r"(\d+)", kunye.get("Sayfa", ""))
    price = lambda v: float(v.replace(".", "").replace(",", ".")) if v else None  # noqa: E731
    web_price = text(first(r"oprice'>(.*?)</div>"))
    num = lambda v: int(re.search(r"\d+", v).group()) if v and re.search(r"\d+", v) else None  # noqa: E731
    series = kunye_links.get("Dizi", [{}])[0] if kunye.get("Dizi") else None
    series_no = re.search(r"-\s*(\d+)\s*$", kunye.get("Dizi", ""))
    editions = re.findall(r"(\d+)\. baskı - ([^<(]+)", html.unescape(kunye.get("Baskı", "")))
    author_bio = first(r'<div class="tab-pane" id="Tab2">(.*?)</div>\s*</div>\s*(?:<div class="tab-pane|</div>)')

    return {
        "site_id": int(url.rstrip("/").rsplit("/", 1)[1]),
        "url": url,
        "title": kunye.get("Kitabın Adı") or text(first(r"<div class='title'>(.*?)</div>")),
        "subtitle": kunye.get("Alt Başlık") or text(first(r"<div class='lgndb'>(.*?)</div>")),
        "original_title": kunye.get("Orijinal Adı") or None,
        "series_title": kunye.get("Üst Başlık") or None,
        "authors": people("Yazar"),
        "editors": people("Editör"),
        "translators": people("Çeviren"),
        "compilers": people("Derleyen") + people("Yayına Hazırlayan"),
        "isbn": re.sub(r"\D", "", kunye.get("ISBN", "")) or None,
        "publisher": "İletişim Yayınları",
        "publication_no": kunye.get("Yayın No"),
        "series": {"name": series.get("name"), "url": series.get("url"),
                   "number": int(series_no.group(1)) if series_no else None} if series else None,
        "categories": [a["name"] for a in kunye_links.get("Alan", [])] or ([kunye["Alan"]] if kunye.get("Alan") else []),
        "page_count": int(pages.group(1)) if pages else None,
        "width_mm": num(kunye.get("En")),
        "height_mm": num(kunye.get("Boy")),
        "list_price_try": price(re.sub(r"[^\d.,]", "", kunye.get("Perakende Satış Fiyatı", ""))),
        "web_price_try": price(re.sub(r"[^\d.,]", "", web_price or "")),
        "editions": [{"edition": int(n), "date": d.strip()} for n, d in editions],
        "printer": kunye.get("Matbaa"),
        "spot": text(first(r'<div class="spot mt-3">(.*?)</div>')),
        "description": text(first(r'<div class="tab-pane active" id="Tab1">\s*<div>(.*?)</div>')),
        "author_bio": text(author_bio),
        "excerpt_pdf": urljoin(BASE, p) if (p := first(r"href='(/Images/UserFiles/Documents/[^']+\.pdf)'")) else None,
        "cover_url": urljoin(BASE, cover) if cover else None,
        "cover_file": None,
        "kunye": kunye,
    }


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--url", default=BASE, help="Kitap bağlantılarının toplanacağı sayfa (varsayılan: ana sayfa)")
    ap.add_argument("--out", default="data/iletisim")
    ap.add_argument("--delay", type=float, default=1.0)
    ap.add_argument("--no-covers", action="store_true")
    a = ap.parse_args(argv)

    os.makedirs(os.path.join(a.out, "covers"), exist_ok=True)
    urls = book_links(get(a.url))
    print(f"{len(urls)} kitap bağlantısı bulundu: {a.url}", file=sys.stderr)
    books, failed = [], []
    for i, u in enumerate(urls, 1):
        try:
            b = parse_book(u, get(u))
            if b["cover_url"] and not a.no_covers:
                ext = os.path.splitext(b["cover_url"])[1].lower() or ".jpg"
                name = f"{b['isbn'] or b['site_id']}{ext}"
                path = os.path.join(a.out, "covers", name)
                if not os.path.exists(path):
                    time.sleep(a.delay)
                    with open(path, "wb") as f:
                        f.write(get(b["cover_url"], binary=True))
                b["cover_file"] = f"covers/{name}"
            books.append(b)
            who = ", ".join(x["name"] for x in b["authors"]) or "?"
            print(f"[{i}/{len(urls)}] {b['title']} · {who} · ISBN {b['isbn'] or '-'}", file=sys.stderr)
        except Exception as e:
            failed.append({"url": u, "error": str(e)})
            print(f"[{i}/{len(urls)}] HATA {u}: {e}", file=sys.stderr)
        time.sleep(a.delay)

    out = {"source": a.url, "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "count": len(books),
           "books": books, "failed": failed}
    with open(os.path.join(a.out, "books.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"\nBitti: {len(books)} kitap, {len(failed)} hata → {a.out}/books.json", file=sys.stderr)
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
