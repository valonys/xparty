import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../_lib/http';
import { verifySessionJwt } from '../_lib/auth';
import { getBucket } from '../_lib/firebaseAdmin';
import { idToDocId } from '../_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (withCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await verifySessionJwt(req.headers.authorization);
    const { fileName, mimeType } = (req.body ?? {}) as { fileName?: string; mimeType?: string };
    if (!fileName || !mimeType) return res.status(400).json({ error: 'Missing fileName/mimeType' });

    const ts = Date.now();
    const safeName = fileName.replace(/[^\w.\-() ]+/g, '_');
    const objectPath = `traces/${idToDocId(user.id)}/${ts}_${safeName}`;

    const bucket = getBucket();
    const file = bucket.file(objectPath);
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: ts + 15 * 60 * 1000,
      contentType: mimeType,
    });

    return res.status(200).json({ uploadUrl: url, objectPath });
  } catch (e: any) {
    return res.status(401).json({ error: e?.message ?? 'Unauthorized' });
  }
}


