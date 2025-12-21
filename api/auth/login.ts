import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../_lib/http';
import { issueSessionJwt, loginWithName } from '../_lib/auth';
import { sql } from '@vercel/postgres';
import { ensureSchema } from '../_lib/postgres';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (withCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name } = (req.body ?? {}) as { name?: string };
    const user = await loginWithName(name ?? '');
    const token = await issueSessionJwt(user);

    await ensureSchema();
    await sql`
      insert into activities (type, actor_id, actor_name, message)
      values ('LOGIN', ${user.id}, ${user.name}, ${user.name} || ' iniciou sessão.')
    `;

    return res.status(200).json({ token, user });
  } catch (e: any) {
    return res.status(400).json({ error: e?.message ?? 'Bad Request' });
  }
}


