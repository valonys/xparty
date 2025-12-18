import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from './_lib/http';
import { verifySessionJwt } from './_lib/auth';
import { getFirestore } from './_lib/firebaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (withCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await verifySessionJwt(req.headers.authorization);
    const db = getFirestore();
    const snap = await db.collection('guests').limit(1000).get();
    const guests = snap.docs.map(d => d.data() as any);

    const totalGuests = guests.length;
    const confirmedCount = guests.filter(g => g.status === 'confirmed').length;
    const declinedCount = guests.filter(g => g.status === 'declined').length;
    const pendingCount = guests.filter(g => g.status === 'pending').length;

    const paidCount = guests.filter(g => g.paymentStatus === 'paid').length;
    const partialCount = guests.filter(g => g.paymentStatus === 'partial').length;
    const unpaidCount = guests.filter(g => g.paymentStatus === 'unpaid').length;

    const totalDue = guests.reduce((acc, g) => acc + (Number(g.totalDue) || 0), 0);
    const totalPaid = guests.reduce((acc, g) => acc + (Number(g.amountPaid) || 0), 0);

    return res.status(200).json({
      kpis: {
        totalGuests,
        confirmedCount,
        declinedCount,
        pendingCount,
        paidCount,
        partialCount,
        unpaidCount,
        totalDue,
        totalPaid,
      },
    });
  } catch (e: any) {
    return res.status(401).json({ error: e?.message ?? 'Unauthorized' });
  }
}


