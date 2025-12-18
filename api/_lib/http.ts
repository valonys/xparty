import type { VercelRequest, VercelResponse } from '@vercel/node';
import { optionalEnv } from './env';

export function withCors(req: VercelRequest, res: VercelResponse) {
  const allowed = optionalEnv('ALLOWED_ORIGINS', '');
  const origin = req.headers.origin ?? '';

  if (allowed) {
    const allowedList = allowed.split(',').map(s => s.trim()).filter(Boolean);
    if (allowedList.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
  }

  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}


