import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from './_lib/http';
import { verifySessionJwt } from './_lib/auth';
import { ensureSchema } from './_lib/postgres';
import { sql } from '@vercel/postgres';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (withCors(req, res)) return;

  try {
    const user = await verifySessionJwt(req.headers.authorization);
    await ensureSchema();

    if (req.method === 'GET') {
      if (user.role === 'ADMIN') {
        const { rows } = await sql`
          select u.id, u.name, g.status, g.payment_status as "paymentStatus",
                 g.amount_paid as "amountPaid", g.total_due as "totalDue",
                 extract(epoch from g.updated_at) * 1000 as "updatedAt"
          from app_users u
          join guests g on g.user_id = u.id
          order by g.updated_at desc
          limit 500
        `;
        return res.status(200).json({ guests: rows });
      }

      const { rows } = await sql`
        select u.id, u.name, g.status, g.payment_status as "paymentStatus",
               g.amount_paid as "amountPaid", g.total_due as "totalDue",
               extract(epoch from g.updated_at) * 1000 as "updatedAt"
        from app_users u
        join guests g on g.user_id = u.id
        where u.id = ${user.id}
        limit 1
      `;
      return res.status(200).json({ guest: rows[0] ?? null });
    }

    if (req.method === 'PATCH') {
      const { status, paymentStatus, amountPaid, targetId } = (req.body ?? {}) as any;
      const effectiveId = user.role === 'ADMIN' && typeof targetId === 'string' ? String(targetId) : user.id;

      const patch: any[] = [];
      if (status) patch.push(sql`status = ${status}`);
      if (paymentStatus) patch.push(sql`payment_status = ${paymentStatus}`);
      if (typeof amountPaid === 'number') patch.push(sql`amount_paid = ${amountPaid}`);

      await sql`
        update guests
        set ${sql.join(patch, sql`, `)}, updated_at = now()
        where user_id = ${effectiveId}
      `;

      const { rows } = await sql`
        select u.id, u.name, g.status, g.payment_status as "paymentStatus",
               g.amount_paid as "amountPaid", g.total_due as "totalDue",
               extract(epoch from g.updated_at) * 1000 as "updatedAt"
        from app_users u
        join guests g on g.user_id = u.id
        where u.id = ${effectiveId}
        limit 1
      `;
      const updated = rows[0] ?? null;

      await sql`
        insert into activities (type, actor_id, actor_name, target_id, target_name, message, meta)
        values (
          'GUEST_UPDATE',
          ${user.id},
          ${user.name},
          ${effectiveId},
          ${updated?.name ?? ''},
          ${user.name || ''} || ' actualizou estado/pagamento.',
          ${JSON.stringify({ status, paymentStatus, amountPaid, targetId: effectiveId })}
        )
      `;

      return res.status(200).json({ guest: updated });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    return res.status(401).json({ error: e?.message ?? 'Unauthorized' });
  }
}


