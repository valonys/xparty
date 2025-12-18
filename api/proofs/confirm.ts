import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../_lib/http';
import { verifySessionJwt } from '../_lib/auth';
import { getFirestore } from '../_lib/firebaseAdmin';
import { addActivity } from '../_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (withCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await verifySessionJwt(req.headers.authorization);
    const { proofId } = (req.body ?? {}) as { proofId?: string };
    if (!proofId) return res.status(400).json({ error: 'Missing proofId' });

    const db = getFirestore();
    const ref = db.collection('proofs').doc(proofId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Proof not found' });
    const proof = snap.data() as any;

    // Only owner can confirm their upload (admin can do anything)
    if (user.role !== 'ADMIN' && proof.ownerId !== user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await ref.set({ uploaded: true, uploadedAt: Date.now() }, { merge: true });
    await addActivity(user, {
      type: 'PAYMENT_PROOF_UPLOAD',
      message: `${user.name} carregou um comprovativo (${proof.fileName}).`,
      targetId: proof.ownerId,
      targetName: proof.ownerName,
      meta: { proofId, objectPath: proof.objectPath, amount: proof.amount, mimeType: proof.mimeType },
    });

    const updated = await ref.get();
    return res.status(200).json({ proof: updated.data() });
  } catch (e: any) {
    return res.status(401).json({ error: e?.message ?? 'Unauthorized' });
  }
}


