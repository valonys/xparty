import { sql } from '@vercel/postgres';

let didInit = false;

export async function ensureSchema() {
  if (didInit) return;

  // NOTE: In Vercel Postgres, this will run against the connected DB using POSTGRES_URL.
  await sql`
    create table if not exists app_users (
      id text primary key,
      name text not null,
      role text not null,
      created_at timestamptz not null default now(),
      last_active_at timestamptz not null default now()
    );
  `;

  await sql`
    create table if not exists guests (
      user_id text primary key references app_users(id) on delete cascade,
      status text not null default 'pending',
      payment_status text not null default 'unpaid',
      amount_paid integer not null default 0,
      total_due integer not null default 50000,
      updated_at timestamptz not null default now()
    );
  `;

  await sql`
    create table if not exists activities (
      id bigserial primary key,
      type text not null,
      actor_id text not null,
      actor_name text not null,
      target_id text,
      target_name text,
      message text not null,
      meta jsonb,
      created_at timestamptz not null default now()
    );
  `;
  await sql`create index if not exists activities_created_at_idx on activities (created_at desc);`;

  await sql`
    create table if not exists proofs (
      id bigserial primary key,
      owner_id text not null,
      owner_name text not null,
      blob_url text not null,
      file_name text not null,
      mime_type text not null,
      amount integer,
      created_at timestamptz not null default now()
    );
  `;
  await sql`create index if not exists proofs_created_at_idx on proofs (created_at desc);`;

  await sql`
    create table if not exists traces (
      id bigserial primary key,
      user_id text not null,
      user_name text not null,
      content text not null,
      image_blob_url text,
      image_file_name text,
      image_mime_type text,
      created_at timestamptz not null default now()
    );
  `;
  await sql`create index if not exists traces_created_at_idx on traces (created_at desc);`;

  didInit = true;
}


