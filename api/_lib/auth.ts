import { OAuth2Client } from 'google-auth-library';
import { SignJWT, jwtVerify } from 'jose';
import { createHash } from 'node:crypto';
import { requireEnv, optionalEnv } from './env';
import { getFirestore } from './firebaseAdmin';

export type ApiUser = {
  id: string; // stable id (Google sub)
  name: string;
  email: string;
  picture?: string;
  role: 'ADMIN' | 'GUEST';
};

const jwtSecret = () => new TextEncoder().encode(requireEnv('SECRET_KEY'));

function getAdminEmails(): string[] {
  // Default for this project to allow Ataliba to be admin even before env is set.
  const raw = optionalEnv('ADMIN_EMAILS', 'ataliba.miguel@valonylabs.com');
  return raw
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string) {
  const allow = getAdminEmails();
  return allow.includes(email.toLowerCase());
}

export async function verifyGoogleIdToken(idToken: string): Promise<ApiUser> {
  const clientId = requireEnv('GOOGLE_CLIENT_ID');
  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({ idToken, audience: clientId });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) throw new Error('Invalid Google token');

  const role: ApiUser['role'] = isAdminEmail(payload.email) ? 'ADMIN' : 'GUEST';
  return {
    id: payload.sub,
    name: payload.name || payload.email.split('@')[0],
    email: payload.email,
    picture: payload.picture,
    role,
  };
}

export async function issueSessionJwt(user: ApiUser) {
  // Keep token small but stable.
  const token = await new SignJWT({
    sub: user.id,
    name: user.name,
    email: user.email,
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
  const email = String(payload.email ?? '');
  const name = String(payload.name ?? '');
  const role = payload.role === 'ADMIN' ? 'ADMIN' : 'GUEST';
  if (!sub || !email) throw new Error('Invalid session');
  return { id: sub, email, name, role: role as ApiUser['role'] };
}

export async function upsertUser(user: ApiUser) {
  const db = getFirestore();
  const now = Date.now();
  const docId = createHash('sha256').update(user.id).digest('hex');
  const ref = db.collection('users').doc(docId);
  await ref.set(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture ?? null,
      role: user.role,
      lastActiveAt: now,
      createdAt: adminTimestampFallback(now),
    },
    { merge: true }
  );
  return { refId: docId };
}

function adminTimestampFallback(ms: number) {
  // Firestore will coerce numbers; using millis keeps it simple.
  return ms;
}


