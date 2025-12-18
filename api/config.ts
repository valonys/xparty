import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from './_lib/http';
import { optionalEnv } from './_lib/env';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (withCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Safe-to-expose public configuration for the frontend.
  return res.status(200).json({
    googleClientId: optionalEnv('GOOGLE_CLIENT_ID', ''),
  });
}


