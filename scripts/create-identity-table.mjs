// Creates the table for athletes' identity checks (selfie, optional ID photo, web evidence).
// Safe to run more than once. Usage: node --env-file=.env.local scripts/create-identity-table.mjs
import pg from 'pg'

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()
try {
  await client.query(`
    create table if not exists identity_reviews (
      "userId" text primary key references "user"(id) on delete cascade,
      status text not null default 'pendiente',
      selfie text,
      document text,
      evidence jsonb not null default '{}'::jsonb,
      "aiCheck" jsonb,
      note text,
      "createdAt" timestamp not null default now(),
      "reviewedAt" timestamp,
      "reviewedBy" text
    )
  `)
  // Selfies and ID photos are sensitive: closed to Supabase's public API, only the app reads them.
  await client.query('alter table identity_reviews enable row level security')
  console.log('identity_reviews lista.')
} finally {
  await client.end()
}
