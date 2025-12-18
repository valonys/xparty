import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../_lib/http';
import { verifySessionJwt } from '../_lib/auth';
import { getBucket, getFirestore } from '../_lib/firebaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (withCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await verifySessionJwt(req.headers.authorization);
    const { proofId } = (req.body ?? {}) as { proofId?: string };
    if (!proofId) return res.status(400).json({ error: 'Missing proofId' });

    const db = getFirestore();
    const snap = await db.collection('proofs').doc(proofId).get();
    if (!snap.exists) return res.status(404).json({ error: 'Proof not found' });
    const proof = snap.data() as any;

    if (user.role !== 'ADMIN' && proof.ownerId !== user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const bucket = getBucket();
    const file = bucket.file(String(proof.objectPath));
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 10 * 60 * 1000,
    });

    return res.status(200).json({ downloadUrl: url });
  } catch (e: any) {
    return res.status(401).json({ error: e?.message ?? 'Unauthorized' });
  }
}


