import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../_lib/http';
import { verifySessionJwt } from '../_lib/auth';
import { sql } from '@vercel/postgres';
import { withTimeout } from '../_lib/timeout';
import { ensureUserAndGuest } from '../_lib/userBootstrap';

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
          select id::text as id, owner_id as "ownerId", owner_name as "ownerName",
                 blob_url as "blobUrl", file_name as "fileName", mime_type as "mimeType",
                 amount, extract(epoch from created_at) * 1000 as "createdAt"
          from proofs
          order by created_at desc
          limit 200
        `,
        8000,
        'db proofs(admin)'
      );
      return res.status(200).json({ proofs: rows });
    }

    const { rows } = await withTimeout(
      sql`
        select id::text as id, owner_id as "ownerId", owner_name as "ownerName",
               blob_url as "blobUrl", file_name as "fileName", mime_type as "mimeType",
               amount, extract(epoch from created_at) * 1000 as "createdAt"
        from proofs
        where owner_id = ${user.id}
        order by created_at desc
        limit 50
      `,
      8000,
      'db proofs(guest)'
    );
    return res.status(200).json({ proofs: rows });
  } catch (e: any) {
    return res.status(401).json({ error: e?.message ?? 'Unauthorized' });
  }
}


