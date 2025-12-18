import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from './_lib/http';
import { verifySessionJwt } from './_lib/auth';
import { addActivity, idToDocId, upsertGuestForUser } from './_lib/db';
import { getFirestore } from './_lib/firebaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (withCors(req, res)) return;

  try {
    const user = await verifySessionJwt(req.headers.authorization);
    const db = getFirestore();

    // Ensure guest doc exists for every logged-in user (real registrations)
    await upsertGuestForUser(user);

    if (req.method === 'GET') {
      if (user.role === 'ADMIN') {
        const snap = await db.collection('guests').orderBy('updatedAt', 'desc').limit(500).get();
        return res.status(200).json({ guests: snap.docs.map(d => d.data()) });
      }
      const doc = await db.collection('guests').doc(idToDocId(user.id)).get();
      return res.status(200).json({ guest: doc.data() ?? null });
    }

    if (req.method === 'PATCH') {
      const { status, paymentStatus, amountPaid } = (req.body ?? {}) as any;
      const ref = db.collection('guests').doc(idToDocId(user.id));
      const update: any = { updatedAt: Date.now() };
      if (status) update.status = status;
      if (paymentStatus) update.paymentStatus = paymentStatus;
      if (typeof amountPaid === 'number') update.amountPaid = amountPaid;
      await ref.set(update, { merge: true });

      await addActivity(user, {
        type: 'GUEST_UPDATE',
        message: `${user.name} actualizou o seu estado.`,
        meta: update,
        targetId: user.id,
        targetName: user.name,
      });

      const updated = await ref.get();
      return res.status(200).json({ guest: updated.data() });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    return res.status(401).json({ error: e?.message ?? 'Unauthorized' });
  }
}


