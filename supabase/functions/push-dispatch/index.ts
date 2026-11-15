// Zamanlanmış görev (servis rolü, her dakika): gönderilmemiş bildirimleri Expo Push ile yollar.
import { adminClient, handler, json, requireServiceRole } from '../_shared/http.ts';
import { buildPush, type NotificationRow } from '../_shared/pushText.ts';

const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send';

Deno.serve(handler(async (req) => {
  requireServiceRole(req);
  const admin = adminClient();
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: rows, error } = await admin
    .from('notifications')
    .select('id, recipient_id, type, target_type, target_id, data, actor:profiles!notifications_actor_id_fkey(display_name, username)')
    .is('pushed_at', null)
    .gte('created_at', since)
    .order('created_at')
    .limit(500);
  if (error) throw error;
  if (!rows?.length) return json({ sent: 0 });

  const recipients = [...new Set(rows.map((r) => r.recipient_id))];
  const { data: tokens } = await admin.from('push_tokens').select('user_id, expo_token').in('user_id', recipients);
  const byUser = new Map<string, string[]>();
  (tokens ?? []).forEach((t) => byUser.set(t.user_id, [...(byUser.get(t.user_id) ?? []), t.expo_token]));

  const messages: { to: string; title: string; body: string; data: unknown; sound: 'default' }[] = [];
  for (const r of rows) {
    // deno-lint-ignore no-explicit-any
    const actor = r.actor as any;
    const push = buildPush({ ...(r as unknown as NotificationRow), actor_name: actor?.display_name ?? actor?.username ?? null });
    if (!push) continue;
    for (const to of byUser.get(r.recipient_id) ?? []) {
      messages.push({ to, title: push.title, body: push.body, data: push.data, sound: 'default' });
    }
  }

  const dead: string[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    const res = await fetch(EXPO_PUSH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Accept-Encoding': 'gzip, deflate' },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      console.warn('expo push', res.status);
      continue;
    }
    const out = await res.json();
    (out.data ?? []).forEach((ticket: { status: string; details?: { error?: string } }, idx: number) => {
      if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') dead.push(chunk[idx].to);
    });
  }
  if (dead.length) await admin.from('push_tokens').delete().in('expo_token', dead);
  await admin.from('notifications').update({ pushed_at: new Date().toISOString() }).in('id', rows.map((r) => r.id));
  return json({ notifications: rows.length, sent: messages.length, removed_tokens: dead.length });
}));
