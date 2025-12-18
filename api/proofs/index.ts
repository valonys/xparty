import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../_lib/http';
import { verifySessionJwt } from '../_lib/auth';
import { getFirestore } from '../_lib/firebaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (withCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await verifySessionJwt(req.headers.authorization);
    const db = getFirestore();

    if (user.role === 'ADMIN') {
      const snap = await db.collection('proofs').orderBy('createdAt', 'desc').limit(200).get();
      return res.status(200).json({ proofs: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
    }

    const snap = await db.collection('proofs').where('ownerId', '==', user.id).orderBy('createdAt', 'desc').limit(50).get();
    return res.status(200).json({ proofs: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch (e: any) {
    return res.status(401).json({ error: e?.message ?? 'Unauthorized' });
  }
}


