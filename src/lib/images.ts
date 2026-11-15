import { supabase } from './supabase';

// Kapak yolu üç biçimde gelir: harici tam adres (TMDB, Open Library, Google Books),
// "storage:<kova>/<yol>" (kullanıcı yüklemesi) veya null.
export function imageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('https://')) return path;
  if (path.startsWith('storage:')) {
    const rest = path.slice('storage:'.length);
    const slash = rest.indexOf('/');
    if (slash < 0) return null;
    return supabase.storage.from(rest.slice(0, slash)).getPublicUrl(rest.slice(slash + 1)).data.publicUrl;
  }
  return null;
}

// Kapak yoksa her eser için sabit bir yer tutucu rengi (aynı eser hep aynı renk)
const PLACEHOLDERS = ['#3B2340', '#5A3E12', '#0E3B3A', '#1B2A4A', '#071A1C', '#2A1220', '#2D2D1A'];
export function placeholderColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PLACEHOLDERS[h % PLACEHOLDERS.length] ?? '#1B2A4A';
}
