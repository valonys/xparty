import { SignJWT, jwtVerify } from 'jose';
import { requireEnv, optionalEnv } from './env';
import { ensureSchema } from './postgres';
import { sql } from '@vercel/postgres';

export type ApiUser = {
  id: string;
  name: string;
  role: 'ADMIN' | 'GUEST';
};

const jwtSecret = () => new TextEncoder().encode(requireEnv('SECRET_KEY'));

function getAdminEmails(): string[] {
  const raw = optionalEnv('ADMIN_EMAILS', '');
  return raw
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string) {
  const allow = getAdminEmails();
  return allow.includes(email.toLowerCase());
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

export function isAdminName(name: string) {
  const list = optionalEnv('ADMIN_NAMES', 'ataliba').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  return list.includes(name.trim().toLowerCase());
}

export async function loginWithName(nameRaw: string): Promise<ApiUser> {
  const name = normalizeName(nameRaw);
  if (!name) throw new Error('Missing name');
  const role: ApiUser['role'] = isAdminName(name) ? 'ADMIN' : 'GUEST';

  // Stable user id for this app: lowercase name (good enough for party app).
  // If you want stronger identity, add email verification later.
  const id = name.toLowerCase();
  const user: ApiUser = { id, name, role };

  await ensureSchema();
  await sql`
    insert into app_users (id, name, role)
    values (${user.id}, ${user.name}, ${user.role})
    on conflict (id) do update set
      name = excluded.name,
      role = excluded.role,
      last_active_at = now()
  `;
  await sql`
    insert into guests (user_id)
    values (${user.id})
    on conflict (user_id) do nothing
  `;

  return user;
}

export async function issueSessionJwt(user: ApiUser) {
  // Keep token small but stable.
  const token = await new SignJWT({
    sub: user.id,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(jwtSecret());
  return token;
}

export async function verifySessionJwt(authHeader?: string): Promise<ApiUser> {
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Missing Authorization');
  const token = authHeader.slice('Bearer '.length);
  const { payload } = await jwtVerify(token, jwtSecret());
  const sub = payload.sub;
  const name = String(payload.name ?? '');
  const role = payload.role === 'ADMIN' ? 'ADMIN' : 'GUEST';
  if (!sub) throw new Error('Invalid session');
  return { id: sub, name, role: role as ApiUser['role'] };
}

// NOTE: user upsert handled in loginWithName for Postgres backend.


