import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../_lib/http';
import { issueSessionJwt, upsertUser, verifyGoogleIdToken } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (withCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { credential } = (req.body ?? {}) as { credential?: string };
    if (!credential) return res.status(400).json({ error: 'Missing credential' });

    const user = await verifyGoogleIdToken(credential);
    await upsertUser(user);

    const token = await issueSessionJwt(user);
    return res.status(200).json({ token, user });
  } catch (e: any) {
    return res.status(401).json({ error: e?.message ?? 'Unauthorized' });
  }
}


