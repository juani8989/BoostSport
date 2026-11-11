import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const dev = process.env.NODE_ENV === 'development'

// Opening a connection costs several round trips (TCP + TLS + auth): about 1.5 s from
// Argentina to the database in Oregon, a few ms from Vercel. Keep connections around so
// requests reuse them instead of paying that each time.
const globalForDb = globalThis as unknown as { pgPool?: Pool }

export const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: dev ? 10 * 60_000 : 60_000,
    keepAlive: true,
  })

// Hot reload re-runs this module in development; reuse the same pool instead of opening new ones.
if (dev) globalForDb.pgPool = pool

export const db = drizzle(pool, { schema })
