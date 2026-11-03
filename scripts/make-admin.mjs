// Grants full admin access to an existing user.
// Usage: node --env-file=.env.local scripts/make-admin.mjs admin@boostsport.com
import pg from 'pg'

const email = process.argv[2]?.trim().toLowerCase()
if (!email) {
  console.error('Usage: node --env-file=.env.local scripts/make-admin.mjs <email>')
  process.exit(1)
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()
try {
  const { rows } = await client.query('select id, name from "user" where email = $1', [email])
  if (!rows.length) throw new Error(`No user with email ${email}`)
  const [{ id, name }] = rows
  await client.query(
    `insert into profiles ("userId", role, data) values ($1, 'admin', $2)
     on conflict ("userId") do update set role = 'admin', "updatedAt" = now()`,
    [id, JSON.stringify({ kind: 'admin' })],
  )
  console.log(`${name} <${email}> is now an admin.`)
} finally {
  await client.end()
}
