import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../_lib/http';
import { verifySessionJwt } from '../_lib/auth';
import { sql } from '@vercel/postgres';
import { put } from '@vercel/blob';
import { ensureUserAndGuest } from '../_lib/userBootstrap';
import { withTimeout } from '../_lib/timeout';

function dataUrlToBuffer(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid dataUrl');
  const mimeType = match[1];
  const b64 = match[2];
  return { mimeType, buffer: Buffer.from(b64, 'base64') };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (withCors(req, res)) return;

  try {
    const user = await verifySessionJwt(req.headers.authorization);
    try {
      await ensureUserAndGuest(user);
    } catch {}

    if (req.method === 'GET') {
      const { rows } = await withTimeout(
        sql`
          select id::text as id,
                 user_id as "userId",
                 user_name as "userName",
                 content,
                 extract(epoch from created_at) * 1000 as "createdAt",
                 image_blob_url as "imageBlobUrl",
                 image_file_name as "imageFileName",
                 image_mime_type as "imageMimeType"
          from traces
          order by created_at desc
          limit 100
        `,
        8000,
        'db traces list'
      );

      const traces = rows.map(r => ({
        id: r.id,
        userId: r.userId,
        userName: r.userName,
        content: r.content,
        createdAt: Number(r.createdAt),
        image: r.imageBlobUrl
          ? { fileName: r.imageFileName, mimeType: r.imageMimeType, downloadUrl: r.imageBlobUrl }
          : null,
      }));

      return res.status(200).json({ traces });
    }

    if (req.method === 'POST') {
      const { content, imageDataUrl, imageFileName, imageMimeType } = (req.body ?? {}) as any;
      const text = String(content ?? '');
      if (!text && !imageDataUrl) return res.status(400).json({ error: 'Missing content' });

      let imageBlobUrl: string | null = null;
      let fileName: string | null = null;
      let mimeType: string | null = null;

      if (imageDataUrl) {
        const safeName = String(imageFileName || `image_${Date.now()}`).replace(/[^\w.\-() ]+/g, '_');
        const { mimeType: inferred, buffer } = dataUrlToBuffer(String(imageDataUrl));
        const ct = String(imageMimeType || inferred || 'application/octet-stream');
        const blob = await put(`traces/${user.id}/${Date.now()}_${safeName}`, buffer, { access: 'public', contentType: ct });
        imageBlobUrl = blob.url;
        fileName = safeName;
        mimeType = ct;
      }

      const { rows } = await withTimeout(
        sql`
          insert into traces (user_id, user_name, content, image_blob_url, image_file_name, image_mime_type)
          values (${user.id}, ${user.name}, ${text}, ${imageBlobUrl}, ${fileName}, ${mimeType})
          returning id::text as id,
                    user_id as "userId",
                    user_name as "userName",
                    content,
                    extract(epoch from created_at) * 1000 as "createdAt",
                    image_blob_url as "imageBlobUrl",
                    image_file_name as "imageFileName",
                    image_mime_type as "imageMimeType"
        `,
        8000,
        'db insert trace'
      );

      await withTimeout(
        sql`
          insert into activities (type, actor_id, actor_name, message, meta)
          values ('TRACE_POST', ${user.id}, ${user.name}, ${user.name} || ' publicou um traço.', ${JSON.stringify({ traceId: rows[0]?.id })})
        `,
        8000,
        'db insert activity'
      );

      const r = rows[0];
      return res.status(200).json({
        trace: {
          id: r.id,
          userId: r.userId,
          userName: r.userName,
          content: r.content,
          createdAt: Number(r.createdAt),
          image: r.imageBlobUrl ? { fileName: r.imageFileName, mimeType: r.imageMimeType, downloadUrl: r.imageBlobUrl } : null,
        },
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    return res.status(401).json({ error: e?.message ?? 'Unauthorized' });
  }
}


