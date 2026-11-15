// POST { apple_authorization_code?: string }
// Hesap silme talebini başlatır. Apple ile giriş yapan kullanıcıda Apple token'ı iptal edilir
// (Apple'ın hesap silme şartı). Kalıcı silme 30 gün içinde purge_deleted_accounts ile yapılır.
import { SignJWT, importPKCS8 } from 'npm:jose@5.9.6';
import { handler, json, userClient } from '../_shared/http.ts';

async function appleClientSecret(): Promise<string | null> {
  const teamId = Deno.env.get('APPLE_TEAM_ID');
  const keyId = Deno.env.get('APPLE_KEY_ID');
  const clientId = Deno.env.get('APPLE_CLIENT_ID');
  const pem = Deno.env.get('APPLE_PRIVATE_KEY');
  if (!teamId || !keyId || !clientId || !pem) return null;
  const key = await importPKCS8(pem.replace(/\\n/g, '\n'), 'ES256');
  return await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .setExpirationTime('5m')
    .setAudience('https://appleid.apple.com')
    .setSubject(clientId)
    .sign(key);
}

async function revokeApple(code: string): Promise<boolean> {
  const secret = await appleClientSecret();
  const clientId = Deno.env.get('APPLE_CLIENT_ID');
  if (!secret || !clientId) return false;
  const tokenRes = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: secret, code, grant_type: 'authorization_code' }),
  });
  if (!tokenRes.ok) return false;
  const { refresh_token } = await tokenRes.json();
  if (!refresh_token) return false;
  const revokeRes = await fetch('https://appleid.apple.com/auth/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: secret, token: refresh_token, token_type_hint: 'refresh_token' }),
  });
  return revokeRes.ok;
}

Deno.serve(handler(async (req) => {
  const { client } = await userClient(req);
  const body = await req.json().catch(() => ({}));
  let appleRevoked: boolean | null = null;
  if (typeof body.apple_authorization_code === 'string' && body.apple_authorization_code) {
    appleRevoked = await revokeApple(body.apple_authorization_code);
  }
  const { data, error } = await client.rpc('request_account_deletion');
  if (error) throw error;
  return json({ purge_after: data, apple_revoked: appleRevoked });
}));
