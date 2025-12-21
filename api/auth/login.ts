import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../_lib/http';
import { issueSessionJwt, loginWithName } from '../_lib/auth';
import { ensureUserAndGuest } from '../_lib/userBootstrap';
import { sql } from '@vercel/postgres';
import { withTimeout } from '../_lib/timeout';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (withCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {});
    const { name } = body as { name?: string };
    const user = await loginWithName(name ?? '');
    const token = await issueSessionJwt(user);

    // Don't block login on a slow DB cold start; try to bootstrap, but never crash the function.
    try {
      await ensureUserAndGuest(user);
      await withTimeout(
        sql`
          insert into activities (type, actor_id, actor_name, message)
          values ('LOGIN', ${user.id}, ${user.name}, ${user.name} || ' iniciou sessão.')
        `,
        4000,
        'db insert activity'
      );
    } catch {
      // Ignore DB errors on login; the app can still render and show API errors for missing DB.
    }

    return res.status(200).json({ token, user });
  } catch (e: any) {
    return res.status(400).json({ error: e?.message ?? 'Bad Request' });
  }
}


