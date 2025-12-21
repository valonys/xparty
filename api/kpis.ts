import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from './_lib/http';
import { verifySessionJwt } from './_lib/auth';
import { ensureSchema } from './_lib/postgres';
import { sql } from '@vercel/postgres';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (withCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await verifySessionJwt(req.headers.authorization);
    await ensureSchema();

    const { rows } = await sql`
      select
        count(*)::int as "totalGuests",
        sum(case when status = 'confirmed' then 1 else 0 end)::int as "confirmedCount",
        sum(case when status = 'declined' then 1 else 0 end)::int as "declinedCount",
        sum(case when status = 'pending' then 1 else 0 end)::int as "pendingCount",
        sum(case when payment_status = 'paid' then 1 else 0 end)::int as "paidCount",
        sum(case when payment_status = 'partial' then 1 else 0 end)::int as "partialCount",
        sum(case when payment_status = 'unpaid' then 1 else 0 end)::int as "unpaidCount",
        sum(total_due)::int as "totalDue",
        sum(amount_paid)::int as "totalPaid"
      from guests
    `;

    return res.status(200).json({ kpis: rows[0] });
  } catch (e: any) {
    return res.status(401).json({ error: e?.message ?? 'Unauthorized' });
  }
}


