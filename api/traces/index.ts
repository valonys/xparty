import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../_lib/http';
import { verifySessionJwt } from '../_lib/auth';
import { getBucket, getFirestore } from '../_lib/firebaseAdmin';
import { addActivity } from '../_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (withCors(req, res)) return;

  try {
    const user = await verifySessionJwt(req.headers.authorization);
    const db = getFirestore();

    if (req.method === 'GET') {
      const snap = await db.collection('traces').orderBy('createdAt', 'desc').limit(100).get();
      const bucket = getBucket();

      const traces = await Promise.all(
        snap.docs.map(async d => {
          const data = d.data() as any;
          let downloadUrl: string | undefined;
          if (data.image?.objectPath) {
            const file = bucket.file(String(data.image.objectPath));
            const [url] = await file.getSignedUrl({ version: 'v4', action: 'read', expires: Date.now() + 10 * 60 * 1000 });
            downloadUrl = url;
          }
          return {
            id: d.id,
            userId: data.userId,
            userName: data.userName,
            content: data.content,
            createdAt: data.createdAt,
            image: data.image ? { ...data.image, downloadUrl } : null,
          };
        })
      );

      return res.status(200).json({ traces });
    }

    if (req.method === 'POST') {
      const { content, image } = (req.body ?? {}) as any;
      if (!content && !image) return res.status(400).json({ error: 'Missing content' });
      const now = Date.now();
      const doc = {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        content: String(content ?? ''),
        createdAt: now,
        image: image
          ? {
              objectPath: String(image.objectPath),
              fileName: String(image.fileName),
              mimeType: String(image.mimeType),
            }
          : null,
      };
      const ref = await db.collection('traces').add(doc);
      await addActivity(user, { type: 'TRACE_POST', message: `${user.name} publicou um traço.`, meta: { traceId: ref.id } });
      return res.status(200).json({ trace: { id: ref.id, ...doc } });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    return res.status(401).json({ error: e?.message ?? 'Unauthorized' });
  }
}


