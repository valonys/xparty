import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from './_lib/http';
import { verifySessionJwt } from './_lib/auth';
import { getFirestore } from './_lib/firebaseAdmin';
import { idToDocId } from './_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (withCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await verifySessionJwt(req.headers.authorization);
    const db = getFirestore();

    if (user.role === 'ADMIN') {
      const snap = await db.collection('activities').orderBy('timestamp', 'desc').limit(200).get();
      return res.status(200).json({ activities: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
    }

    // For guests: fetch activities where actorId == user.id OR targetId == user.id
    // Firestore doesn't support OR without composite or two queries; we do two and merge.
    const [a1, a2] = await Promise.all([
      db.collection('activities').where('actorId', '==', user.id).orderBy('timestamp', 'desc').limit(100).get(),
      db.collection('activities').where('targetId', '==', user.id).orderBy('timestamp', 'desc').limit(100).get(),
    ]);

    const merged = new Map<string, any>();
    for (const d of [...a1.docs, ...a2.docs]) merged.set(d.id, { id: d.id, ...d.data() });

    const list = Array.from(merged.values()).sort((x, y) => (y.timestamp ?? 0) - (x.timestamp ?? 0)).slice(0, 200);
    return res.status(200).json({ activities: list });
  } catch (e: any) {
    return res.status(401).json({ error: e?.message ?? 'Unauthorized' });
  }
}


