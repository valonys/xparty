import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from './_lib/http';
import { optionalEnv } from './_lib/env';
import { sql } from '@vercel/postgres';
import { withTimeout } from './_lib/timeout';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (withCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const hasSecretKey = Boolean(process.env.SECRET_KEY);
  const hasPostgresUrl = Boolean(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL);
  const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

  let postgresOk = false;
  let postgresError = '';
  try {
    await withTimeout(sql`select 1 as ok`, 2500, 'postgres ping');
    postgresOk = true;
  } catch (e: any) {
    postgresError = e?.message ?? String(e);
  }

  return res.status(200).json({
    ok: hasSecretKey && hasPostgresUrl && postgresOk,
    env: {
      hasSecretKey,
      hasPostgresUrl,
      hasBlobToken,
      allowedOriginsSet: Boolean(optionalEnv('ALLOWED_ORIGINS', '')),
      adminNames: optionalEnv('ADMIN_NAMES', 'ataliba'),
    },
    postgres: { ok: postgresOk, error: postgresError ? postgresError.slice(0, 300) : '' },
  });
}


