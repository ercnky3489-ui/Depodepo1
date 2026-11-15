// POST { media_id: uuid }
// Detay sayfası açıldığında eserin tam bilgisini (oyuncular, sezon/bölüm, açıklama, Google Books puanı) getirir.
// 24 saatten yeni kayıtlar yeniden çekilmez.
import { handler, HttpError, json, userClient } from '../_shared/http.ts';
import { refreshMedia } from '../_shared/refresh.ts';

Deno.serve(handler(async (req) => {
  await userClient(req);
  const body = await req.json().catch(() => ({}));
  if (typeof body.media_id !== 'string') throw new HttpError(400, 'media_id_required');
  const id = await refreshMedia(body.media_id);
  return json({ media_id: id });
}));
