import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from './_lib/http';
import { verifySessionJwt } from './_lib/auth';
import { sql } from '@vercel/postgres';
import { ensureUserAndGuest } from './_lib/userBootstrap';
import { withTimeout } from './_lib/timeout';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (withCors(req, res)) return;

  try {
    const user = await verifySessionJwt(req.headers.authorization);
    // Ensure rows exist for current user (best-effort).
    try {
      await ensureUserAndGuest(user);
    } catch {}

    if (req.method === 'GET') {
      if (user.role === 'ADMIN') {
        const { rows } = await withTimeout(
          sql`
          select u.id, u.name, g.status, g.payment_status as "paymentStatus",
                 g.amount_paid as "amountPaid", g.total_due as "totalDue",
                 extract(epoch from g.updated_at) * 1000 as "updatedAt"
          from app_users u
          join guests g on g.user_id = u.id
          order by g.updated_at desc
          limit 500
        `,
          8000,
          'db get guests'
        );
        return res.status(200).json({ guests: rows });
      }

      const { rows } = await withTimeout(
        sql`
        select u.id, u.name, g.status, g.payment_status as "paymentStatus",
               g.amount_paid as "amountPaid", g.total_due as "totalDue",
               extract(epoch from g.updated_at) * 1000 as "updatedAt"
        from app_users u
        join guests g on g.user_id = u.id
        where u.id = ${user.id}
        limit 1
      `,
        8000,
        'db get my guest'
      );
      return res.status(200).json({ guest: rows[0] ?? null });
    }

    if (req.method === 'PATCH') {
      const { status, paymentStatus, amountPaid, targetId } = (req.body ?? {}) as any;
      const effectiveId = user.role === 'ADMIN' && typeof targetId === 'string' ? String(targetId) : user.id;

      // @vercel/postgres@0.10.0 doesn't support sql.join; use a static update with COALESCE.
      const statusVal = typeof status === 'string' ? status : null;
      const paymentStatusVal = typeof paymentStatus === 'string' ? paymentStatus : null;
      const amountPaidVal = typeof amountPaid === 'number' ? amountPaid : null;

      await withTimeout(
        sql`
        update guests
        set
          status = coalesce(${statusVal}, status),
          payment_status = coalesce(${paymentStatusVal}, payment_status),
          amount_paid = coalesce(${amountPaidVal}, amount_paid),
          updated_at = now()
        where user_id = ${effectiveId}
      `,
        8000,
        'db patch guest'
      );

      const { rows } = await withTimeout(
        sql`
        select u.id, u.name, g.status, g.payment_status as "paymentStatus",
               g.amount_paid as "amountPaid", g.total_due as "totalDue",
               extract(epoch from g.updated_at) * 1000 as "updatedAt"
        from app_users u
        join guests g on g.user_id = u.id
        where u.id = ${effectiveId}
        limit 1
      `,
        8000,
        'db read updated guest'
      );
      const updated = rows[0] ?? null;

      await withTimeout(
        sql`
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
      `,
        8000,
        'db insert activity'
      );

      return res.status(200).json({ guest: updated });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    return res.status(401).json({ error: e?.message ?? 'Unauthorized' });
  }
}


