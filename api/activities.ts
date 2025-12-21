import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from './_lib/http';
import { verifySessionJwt } from './_lib/auth';
import { ensureSchema } from './_lib/postgres';
import { sql } from '@vercel/postgres';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (withCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await verifySessionJwt(req.headers.authorization);
    await ensureSchema();

    if (user.role === 'ADMIN') {
      const { rows } = await sql`
        select id::text as id, type, actor_id as "actorId", actor_name as "actorName",
               target_id as "targetId", target_name as "targetName",
               message, meta, extract(epoch from created_at) * 1000 as timestamp
        from activities
        order by created_at desc
        limit 200
      `;
      return res.status(200).json({ activities: rows });
    }

    const { rows } = await sql`
      select id::text as id, type, actor_id as "actorId", actor_name as "actorName",
             target_id as "targetId", target_name as "targetName",
             message, meta, extract(epoch from created_at) * 1000 as timestamp
      from activities
      where actor_id = ${user.id} or target_id = ${user.id}
      order by created_at desc
      limit 200
    `;
    return res.status(200).json({ activities: rows });
  } catch (e: any) {
    return res.status(401).json({ error: e?.message ?? 'Unauthorized' });
  }
}


