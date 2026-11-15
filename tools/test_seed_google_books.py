"""python -m pytest tools/test_seed_google_books.py  (ya da: python tools/test_seed_google_books.py)"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from seed_google_books import normalize_volume, to_isbn13, isbn_valid, build_query, fetch_volumes

VOL = {"id": "abc123", "volumeInfo": {
    "title": "Kürk Mantolu Madonna", "authors": ["Sabahattin Ali"], "publisher": "Yapı Kredi Yayınları",
    "publishedDate": "2019-05", "pageCount": 160, "language": "tr",
    "description": "<p>Raif Efendi&#39;nin hikâyesi.</p>",
    "industryIdentifiers": [{"type": "ISBN_10", "identifier": "0306406152"}],
    "imageLinks": {"thumbnail": "http://books.google.com/books/content?id=abc123&printsec=frontcover&img=1&zoom=1&edge=curl"}}}

def test_isbn():
    assert isbn_valid("978-0306406157") and not isbn_valid("9780306406158")
    assert to_isbn13("0-306-40615-2") == "9780306406157"
    assert to_isbn13("abc") is None

def test_normalize():
    p = normalize_volume(VOL)
    assert p["book"]["isbn13"] == "9780306406157" and p["book"]["isbn10"] == "0306406152"
    assert p["book"]["publisher"] == "Yapı Kredi Yayınları" and p["year"] == 2019 and p["book"]["page_count"] == 160
    assert p["cover_url"].startswith("https://") and "edge=curl" not in p["cover_url"]
    assert p["description"] == "Raif Efendi'nin hikâyesi."
    assert {"source": "isbn", "external_id": "9780306406157"} in p["external_ids"]

def test_no_fake_values():
    v = {"id": "x1", "volumeInfo": {"title": "Adsız"}}
    p = normalize_volume(v)
    assert p["book"]["publisher"] is None, "sahte yayınevi yazılmaz"
    assert p["book"]["isbn13"] is None and len(p["external_ids"]) == 1, "Google kimliği ISBN yerine yazılmaz"
    assert p["cover_url"] is None and p["contributors"] == []
    assert normalize_volume({"id": "x2", "volumeInfo": {}}) is None

def test_query_and_paging():
    assert build_query(None, "Sabahattin Ali", None, None) == 'inauthor:"Sabahattin Ali"'
    calls = []
    class R:
        def __init__(s, items, code=200): s.items, s.status_code = items, code
        def raise_for_status(s): pass
        def json(s): return {"items": s.items}
    class S:
        def get(s, url, params, timeout):
            calls.append(params)
            if len(calls) == 1: return R([], 429)
            return R([{"id": str(params["startIndex"] + i)} for i in range(params["maxResults"])] if params["startIndex"] < 60 else [])
    import seed_google_books as m; m.time.sleep = lambda *_: None
    got = list(fetch_volumes(S(), "q", "KEY", 70))
    assert len(got) == 70 and calls[1]["langRestrict"] == "tr" and calls[1]["key"] == "KEY" and calls[2]["startIndex"] == 40

if __name__ == "__main__":
    for n, f in list(globals().items()):
        if n.startswith("test_"): f(); print("ok -", n)
