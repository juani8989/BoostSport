// Creates the table for the optional audio track of a post. Safe to run more than once.
// Usage: node --env-file=.env.local scripts/add-post-audio.mjs
import pg from 'pg'

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()
try {
  await client.query(`
    create table if not exists post_audio (
      "postId" integer primary key references posts(id) on delete cascade,
      "audioUrl" text not null,
      "audioName" text not null default '',
      "createdAt" timestamp not null default now()
    )
  `)
  // The app talks to Postgres directly; RLS with no policies keeps the table closed to the public API.
  await client.query('alter table post_audio enable row level security')
  console.log('post_audio lista.')
} finally {
  await client.end()
}
