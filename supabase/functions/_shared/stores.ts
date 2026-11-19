// ISBN ile Türk kitapçılarından kitap bilgisi: D&R, BKM Kitap, Amazon.com.tr (Kitapyurdu otomatik isteklere
// 403 veriyor; bot korumasını aşmaya çalışmıyoruz, bu yüzden yalnızca denenir).
// Kullanıcı bir ISBN aradığında tek kitap için sorulur (toplu tarama yapılmaz). Kapak görseli indirilmez,
// adresi kullanılır. Her kaynaktan gelen sonuç ISBN'in sayfada geçtiği doğrulanarak kabul edilir.
import type { NormalizedMedia } from './normalize.ts';

type StoreHit = {
  store: 'dr' | 'bkm' | 'amazon' | 'kitapyurdu';
  title?: string | null; authors?: string[]; publisher?: string | null; year?: number | null;
  pages?: number | null; cover?: string | null; description?: string | null; url?: string | null;
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';

async function getHtml(url: string, timeoutMs = 9000): Promise<{ html: string; url: string } | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': UA, 'Accept-Language': 'tr-TR,tr;q=0.9', Accept: 'text/html' } });
    if (!res.ok) return null;
    return { html: await res.text(), url: res.url };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

const decode = (s: string) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
const text = (s: unknown, max = 2000): string | null => {
  if (typeof s !== 'string') return null;
  const t = decode(s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ')).replace(/[ \t\r\f\v]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
  return t ? (t.length > max ? t.slice(0, max).replace(/\s+\S*$/, '') + '…' : t) : null;
};
const toInt = (s: unknown) => { const n = parseInt(String(s ?? ''), 10); return Number.isFinite(n) && n > 0 && n < 20000 ? n : null; };
const toYear = (s: unknown) => { const m = String(s ?? '').match(/(1[5-9]\d\d|20\d\d)/); return m ? Number(m[1]) : null; };

function jsonLd(html: string): unknown[] {
  const out: unknown[] = [];
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { out.push(JSON.parse(m[1]!.replace(/[\u0000-\u001f]+/g, ' '))); } catch { /* bozuk blok */ }
  }
  return out.flatMap((x) => (Array.isArray(x) ? x : [x])).flatMap((x) => {
    const g = (x as { '@graph'?: unknown[] })?.['@graph'];
    return Array.isArray(g) ? g : [x];
  });
}
const isType = (o: unknown, t: string) => { const v = (o as { '@type'?: unknown })?.['@type']; return Array.isArray(v) ? v.includes(t) : v === t; };
const names = (v: unknown): string[] => (Array.isArray(v) ? v : v ? [v] : [])
  .map((a) => (typeof a === 'string' ? a : (a as { name?: string })?.name)).filter((x): x is string => !!x).map((x) => decode(x).trim());
const firstImage = (v: unknown): string | null => {
  const a = Array.isArray(v) ? v[0] : v;
  const u = typeof a === 'string' ? a : (a as { url?: string })?.url;
  return typeof u === 'string' && u.startsWith('https://') ? u : null;
};
const hasIsbn = (html: string, isbn: string) => html.includes(isbn) || html.includes(`${isbn.slice(0, 3)}-${isbn.slice(3)}`);

// ---------------------------------------------------------------- D&R: arama ISBN'de doğrudan kitap sayfasına yönlenir
async function dr(isbn: string): Promise<StoreHit | null> {
  const page = await getHtml(`https://www.dr.com.tr/search?q=${isbn}`);
  if (!page) return null;
  const book = jsonLd(page.html).find((o) => isType(o, 'Book')) as Record<string, unknown> | undefined;
  if (!book || String(book.gtin13 ?? '').replace(/\D/g, '') !== isbn) return null;
  return {
    store: 'dr', url: page.url, title: text(book.name, 300), authors: names(book.author), publisher: names(book.publisher)[0] ?? null,
    year: toYear(book.datePublished), pages: toInt(book.numberOfPages), cover: firstImage(book.image), description: text(book.description),
  };
}

// ---------------------------------------------------------------- BKM Kitap: arama sayfasındaki ürün listesinde ISBN'li kayıt
async function bkm(isbn: string): Promise<StoreHit | null> {
  const search = await getHtml(`https://www.bkmkitap.com/arama?q=${isbn}`);
  if (!search) return null;
  const list = jsonLd(search.html).find((o) => isType(o, 'ItemList')) as { itemListElement?: Record<string, unknown>[] } | undefined;
  const items = (list?.itemListElement ?? []).map((e) => (e.item ?? e) as Record<string, unknown>);
  const book = items.find((it) => String(it.isbn ?? it.gtin13 ?? '').replace(/\D/g, '') === isbn);
  if (!book) return null;
  return {
    store: 'bkm', url: typeof book.url === 'string' ? book.url : null, title: text(book.name, 300), authors: names(book.author),
    publisher: names(book.publisher)[0] ?? null, pages: toInt(book.numberOfPages), year: toYear(book.datePublished),
    cover: firstImage(book.image), description: text(book.description),
  };
}

// ---------------------------------------------------------------- Amazon.com.tr: kitaplarda ürün kodu ISBN-10'dur
function isbn10(isbn13: string): string | null {
  if (!isbn13.startsWith('978')) return null;
  const core = isbn13.slice(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (10 - i) * Number(core[i]);
  const c = (11 - (sum % 11)) % 11;
  return core + (c === 10 ? 'X' : String(c));
}

async function amazon(isbn: string): Promise<StoreHit | null> {
  const asin = isbn10(isbn);
  if (!asin) return null;
  const page = await getHtml(`https://www.amazon.com.tr/dp/${asin}`);
  if (!page || /captcha/i.test(page.html.slice(0, 5000)) || !hasIsbn(page.html, isbn)) return null;
  const h = page.html;
  const pick = (re: RegExp) => h.match(re)?.[1] ?? null;
  const detail = (label: string) => text(pick(new RegExp(`${label}[\\s\\S]{0,300}?<span[^>]*>\\s*([^<]{1,120}?)\\s*</span>`)), 200);
  const pagesTxt = pick(/(\d{2,5})\s*sayfa/i);
  const title = text(pick(/id="productTitle"[^>]*>([\s\S]*?)<\/span>/), 300);
  return {
    store: 'amazon', url: `https://www.amazon.com.tr/dp/${asin}`,
    title: title ? title.replace(/\s+-\s+(Bütün Yapıtları|Ciltsiz|Ciltli).*$/i, '') : null,
    authors: [...h.matchAll(/class="author[^"]*"[\s\S]{0,400}?<a[^>]*>([^<]+)<\/a>/g)].map((m) => decode(m[1]!).trim()).slice(0, 3),
    publisher: detail('Yayıncı') ?? detail('Yayınevi'), pages: toInt(pagesTxt), year: toYear(detail('Yayın tarihi')),
    cover: pick(/"hiRes":"(https:\/\/[^"]+)"/) ?? pick(/data-old-hires="(https:\/\/[^"]+)"/),
    description: text(pick(/id="bookDescription_feature_div"[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/)),
  };
}

// ---------------------------------------------------------------- Kitapyurdu: yalnızca denenir (çoğunlukla 403)
async function kitapyurdu(isbn: string): Promise<StoreHit | null> {
  const page = await getHtml(`https://www.kitapyurdu.com/index.php?route=product/search&filter_name=${isbn}`, 6000);
  if (!page) return null;
  const book = jsonLd(page.html).find((o) => isType(o, 'Book') || isType(o, 'Product')) as Record<string, unknown> | undefined;
  if (!book || !hasIsbn(page.html, isbn)) return null;
  return { store: 'kitapyurdu', url: page.url, title: text(book.name, 300), authors: names(book.author), publisher: names(book.publisher)[0] ?? null,
    cover: firstImage(book.image), description: text(book.description), pages: toInt(book.numberOfPages), year: toYear(book.datePublished) };
}

/** Dört mağazaya aynı anda sorar, gelen bilgileri birleştirir. Hiçbiri bulamazsa null. */
export async function storeLookupByIsbn(isbn13: string): Promise<{ media: NormalizedMedia; stores: string[] } | null> {
  const hits = (await Promise.allSettled([dr(isbn13), bkm(isbn13), amazon(isbn13), kitapyurdu(isbn13)]))
    .map((r) => (r.status === 'fulfilled' ? r.value : null)).filter((x): x is StoreHit => !!x && !!x.title);
  if (!hits.length) return null;
  const by = (s: StoreHit['store']) => hits.find((h) => h.store === s);
  const order = [by('dr'), by('kitapyurdu'), by('bkm'), by('amazon')].filter((x): x is StoreHit => !!x);
  const first = <K extends keyof StoreHit>(k: K, list = order) => list.map((h) => h[k]).find((v) => (Array.isArray(v) ? v.length : v != null && v !== '')) ?? null;
  // Kapak: en büyük görsel (Amazon 1500px) önce, sonra D&R/BKM
  const cover = first('cover', [by('amazon'), by('dr'), by('kitapyurdu'), by('bkm')].filter((x): x is StoreHit => !!x)) as string | null;
  const authors = (first('authors') as string[] | null) ?? [];
  const year = first('year') as number | null;
  return {
    stores: hits.map((h) => h.store),
    media: {
      kind: 'book', title: first('title') as string, year, description: first('description') as string | null, cover_url: cover,
      language: 'tr', source: 'user' as never,
      external_ids: [{ source: 'isbn', external_id: isbn13 }],
      contributors: authors.map((name, i) => ({ name, role: 'author' as const, order: i })),
      book: { isbn13, isbn10: isbn10(isbn13), publisher: first('publisher') as string | null, published_date: year ? String(year) : null, page_count: first('pages') as number | null },
    },
  };
}
