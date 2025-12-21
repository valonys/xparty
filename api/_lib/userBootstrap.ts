import { sql } from '@vercel/postgres';
import type { ApiUser } from './auth';
import { withTimeout } from './timeout';

export async function ensureUserAndGuest(user: ApiUser) {
  // Keep this fast; DB cold starts can be slow, so time-box it.
  await withTimeout(
    sql`
      insert into app_users (id, name, role)
      values (${user.id}, ${user.name}, ${user.role})
      on conflict (id) do update set
        name = excluded.name,
        role = excluded.role,
        last_active_at = now()
    `,
    4000,
    'db upsert user'
  );

  await withTimeout(
    sql`
      insert into guests (user_id)
      values (${user.id})
      on conflict (user_id) do nothing
    `,
    4000,
    'db upsert guest'
  );
}


