import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../_lib/http';
import { verifySessionJwt } from '../_lib/auth';
import { getBucket, getFirestore } from '../_lib/firebaseAdmin';
import { idToDocId } from '../_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (withCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await verifySessionJwt(req.headers.authorization);
    const { fileName, mimeType, amount } = (req.body ?? {}) as { fileName?: string; mimeType?: string; amount?: number };
    if (!fileName || !mimeType) return res.status(400).json({ error: 'Missing fileName/mimeType' });

    // Only confirmed users can upload proof
    const db = getFirestore();
    const guestDoc = await db.collection('guests').doc(idToDocId(user.id)).get();
    const guest = guestDoc.data() as any;
    if (!guest || guest.status !== 'confirmed') {
      return res.status(403).json({ error: 'Only confirmed users can upload proof.' });
    }

    const ts = Date.now();
    const safeName = fileName.replace(/[^\w.\-() ]+/g, '_');
    const objectPath = `proofs/${idToDocId(user.id)}/${ts}_${safeName}`;

    const bucket = getBucket();
    const file = bucket.file(objectPath);
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: ts + 15 * 60 * 1000,
      contentType: mimeType,
    });

    // Pre-create Firestore proof record
    const proofRef = await db.collection('proofs').add({
      ownerId: user.id,
      ownerName: user.name,
      ownerEmail: user.email,
      objectPath,
      fileName,
      mimeType,
      amount: typeof amount === 'number' ? amount : null,
      createdAt: ts,
      uploaded: false,
    });

    return res.status(200).json({ uploadUrl: url, objectPath, proofId: proofRef.id });
  } catch (e: any) {
    return res.status(401).json({ error: e?.message ?? 'Unauthorized' });
  }
}


