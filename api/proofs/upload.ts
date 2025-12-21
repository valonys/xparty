import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../_lib/http';
import { verifySessionJwt } from '../_lib/auth';
import { ensureSchema } from '../_lib/postgres';
import { sql } from '@vercel/postgres';
import { put } from '@vercel/blob';

function dataUrlToBuffer(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid dataUrl');
  const mimeType = match[1];
  const b64 = match[2];
  return { mimeType, buffer: Buffer.from(b64, 'base64') };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (withCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await verifySessionJwt(req.headers.authorization);
    await ensureSchema();

    const { fileName, mimeType, amount, dataUrl } = (req.body ?? {}) as any;
    if (!fileName || !dataUrl) return res.status(400).json({ error: 'Missing fileName/dataUrl' });

    // Enforce confirmed-only proofs
    const { rows: guestRows } = await sql`select status from guests where user_id = ${user.id} limit 1`;
    if (!guestRows[0] || guestRows[0].status !== 'confirmed') {
      return res.status(403).json({ error: 'Only confirmed users can upload proof.' });
    }

    const { mimeType: inferred, buffer } = dataUrlToBuffer(String(dataUrl));
    const ct = String(mimeType || inferred || 'application/octet-stream');
    const safeName = String(fileName).replace(/[^\w.\-() ]+/g, '_');
    const blob = await put(`proofs/${user.id}/${Date.now()}_${safeName}`, buffer, { access: 'public', contentType: ct });

    const { rows } = await sql`
      insert into proofs (owner_id, owner_name, blob_url, file_name, mime_type, amount)
      values (${user.id}, ${user.name}, ${blob.url}, ${safeName}, ${ct}, ${typeof amount === 'number' ? amount : null})
      returning id::text as id, owner_id as "ownerId", owner_name as "ownerName",
                blob_url as "blobUrl", file_name as "fileName", mime_type as "mimeType",
                amount, extract(epoch from created_at) * 1000 as "createdAt"
    `;

    await sql`
      insert into activities (type, actor_id, actor_name, target_id, target_name, message, meta)
      values (
        'PAYMENT_PROOF_UPLOAD',
        ${user.id},
        ${user.name},
        ${user.id},
        ${user.name},
        ${user.name} || ' carregou um comprovativo (' || ${safeName} || ').',
        ${JSON.stringify({ proofId: rows[0]?.id, blobUrl: blob.url, amount })}
      )
    `;

    return res.status(200).json({ proof: rows[0] });
  } catch (e: any) {
    return res.status(400).json({ error: e?.message ?? 'Bad Request' });
  }
}


