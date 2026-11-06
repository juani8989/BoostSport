// Creates the table that stores each user's settings (privacy, notifications, what they see…).
// Safe to run more than once. Usage: node --env-file=.env.local scripts/create-settings-table.mjs
import pg from 'pg'

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()
try {
  await client.query(`
    create table if not exists user_settings (
      "userId" text primary key references "user"(id) on delete cascade,
      data jsonb not null default '{}'::jsonb,
      "updatedAt" timestamp not null default now()
    )
  `)
  // The app talks to Postgres directly; RLS with no policies keeps the table closed to the public API.
  await client.query('alter table user_settings enable row level security')
  console.log('user_settings lista.')
} finally {
  await client.end()
}
