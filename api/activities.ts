import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from './_lib/http';
import { verifySessionJwt } from './_lib/auth';
import { sql } from '@vercel/postgres';
import { withTimeout } from './_lib/timeout';
import { ensureUserAndGuest } from './_lib/userBootstrap';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (withCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await verifySessionJwt(req.headers.authorization);
    try {
      await ensureUserAndGuest(user);
    } catch {}

    if (user.role === 'ADMIN') {
      const { rows } = await withTimeout(
        sql`
          select id::text as id, type, actor_id as "actorId", actor_name as "actorName",
                 target_id as "targetId", target_name as "targetName",
                 message, meta, extract(epoch from created_at) * 1000 as timestamp
          from activities
          order by created_at desc
          limit 200
        `,
        8000,
        'db activities(admin)'
      );
      return res.status(200).json({ activities: rows });
    }

    const { rows } = await withTimeout(
      sql`
        select id::text as id, type, actor_id as "actorId", actor_name as "actorName",
               target_id as "targetId", target_name as "targetName",
               message, meta, extract(epoch from created_at) * 1000 as timestamp
        from activities
        where actor_id = ${user.id} or target_id = ${user.id}
        order by created_at desc
        limit 200
      `,
      8000,
      'db activities(guest)'
    );
    return res.status(200).json({ activities: rows });
  } catch (e: any) {
    return res.status(401).json({ error: e?.message ?? 'Unauthorized' });
  }
}


