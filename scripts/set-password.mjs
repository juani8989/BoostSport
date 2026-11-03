// Sets a new password for an existing user. The password is typed hidden and never echoed.
// Usage: node --env-file=.env.local scripts/set-password.mjs admin@boostsport.com
import { randomUUID } from 'node:crypto'
import { hashPassword } from 'better-auth/crypto'
import pg from 'pg'

const email = process.argv[2]?.trim().toLowerCase()
if (!email) {
  console.error('Usage: node --env-file=.env.local scripts/set-password.mjs <email>')
  process.exit(1)
}

function askHidden(question) {
  return new Promise((resolve) => {
    process.stdout.write(question)
    const stdin = process.stdin
    let value = ''
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')
    const onData = (ch) => {
      if (ch === '\r' || ch === '\n') {
        stdin.setRawMode(false)
        stdin.pause()
        stdin.off('data', onData)
        process.stdout.write('\n')
        resolve(value)
      } else if (ch === '\u0003') {
        process.exit(130)
      } else if (ch === '\u007f') {
        value = value.slice(0, -1)
      } else {
        value += ch
      }
    }
    stdin.on('data', onData)
  })
}

const password = await askHidden('Nueva contraseña (mínimo 8 caracteres): ')
if (password.length < 8) {
  console.error('La contraseña debe tener al menos 8 caracteres.')
  process.exit(1)
}
if ((await askHidden('Repetila: ')) !== password) {
  console.error('Las contraseñas no coinciden.')
  process.exit(1)
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()
try {
  const { rows } = await client.query('select id from "user" where email = $1', [email])
  if (!rows.length) throw new Error(`No existe un usuario con el email ${email}`)
  const userId = rows[0].id
  const hash = await hashPassword(password)
  const updated = await client.query(
    `update account set password = $1, "updatedAt" = now() where "userId" = $2 and "providerId" = 'credential'`,
    [hash, userId],
  )
  if (!updated.rowCount) {
    await client.query(
      `insert into account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
       values ($1, $2, 'credential', $2, $3, now(), now())`,
      [randomUUID(), userId, hash],
    )
  }
  await client.query('delete from session where "userId" = $1', [userId])
  console.log(`Listo: ${email} ya puede entrar con la nueva contraseña.`)
} finally {
  await client.end()
}
