// Moves images and audio stored as data URLs in the database to Vercel Blob and keeps
// only the link. Covers post photos, post audio, and profile photos, logos, gallery and
// merch images. Identity selfies stay in the database: they're private and Blob URLs are public.
//
// Dry run (counts only):  node --env-file=.env.local scripts/migrate-media-to-blob.mjs
// Do it:                  node --env-file=.env.local scripts/migrate-media-to-blob.mjs --apply
//
// Needs DATABASE_URL and BLOB_READ_WRITE_TOKEN of the environment you're migrating.
import { randomUUID } from 'node:crypto'
import { put } from '@vercel/blob'
import pg from 'pg'

const apply = process.argv.includes('--apply')
if (apply && !process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('Falta BLOB_READ_WRITE_TOKEN.')
  process.exit(1)
}

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/webm': 'webm' }
const isData = (v) => typeof v === 'string' && v.startsWith('data:')
let moved = 0
let bytes = 0

async function upload(folder, dataUrl) {
  const match = /^data:([\w/+.-]+);base64,([\s\S]*)$/.exec(dataUrl)
  if (!match) return dataUrl
  const body = Buffer.from(match[2], 'base64')
  moved++
  bytes += body.length
  if (!apply) return dataUrl
  const { url } = await put(`${folder}/${randomUUID()}.${EXT[match[1]] ?? 'bin'}`, body, {
    access: 'public',
    contentType: match[1],
    addRandomSuffix: true,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
  })
  return url
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()
try {
  const posts = await client.query(`select id, "mediaUrl" from posts where left("mediaUrl", 5) = 'data:'`)
  for (const row of posts.rows) {
    const url = await upload('post-image', row.mediaUrl)
    if (apply) await client.query('update posts set "mediaUrl" = $1 where id = $2', [url, row.id])
  }

  const audio = await client.query(`select "postId", "audioUrl" from post_audio where left("audioUrl", 5) = 'data:'`).catch(() => ({ rows: [] }))
  for (const row of audio.rows) {
    const url = await upload('post-audio', row.audioUrl)
    if (apply) await client.query('update post_audio set "audioUrl" = $1 where "postId" = $2', [url, row.postId])
  }

  const profiles = await client.query(`select "userId", data from profiles where data::text like '%data:image/%'`)
  for (const row of profiles.rows) {
    const data = row.data
    let changed = false
    const swap = async (value) => {
      if (!isData(value)) return value
      changed = true
      return upload('profile', value)
    }
    if ('photo' in data) data.photo = await swap(data.photo)
    if ('logo' in data) data.logo = await swap(data.logo)
    for (const list of ['gallery', 'merch', 'sponsored']) {
      if (!Array.isArray(data[list])) continue
      for (const item of data[list]) {
        if ('src' in item) item.src = await swap(item.src)
        if ('image' in item) item.image = await swap(item.image)
      }
    }
    if (changed && apply) await client.query('update profiles set data = $1, "updatedAt" = now() where "userId" = $2', [JSON.stringify(data), row.userId])
  }

  const mb = (bytes / 1024 / 1024).toFixed(1)
  console.log(apply ? `Listo: ${moved} archivos (${mb} MB) pasados a Blob.` : `Prueba: hay ${moved} archivos (${mb} MB) para pasar. Corré con --apply para hacerlo.`)
} finally {
  await client.end()
}
