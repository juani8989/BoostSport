import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { posts } from '@/lib/db/schema'
import { dataUrlResponse } from '@/lib/media'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id)
  if (!Number.isInteger(id) || id <= 0) return new Response('Not found', { status: 404 })
  const [row] = await db.select({ mediaUrl: posts.mediaUrl }).from(posts).where(eq(posts.id, id)).limit(1)
  if (!row?.mediaUrl) return new Response('Not found', { status: 404 })
  if (!row.mediaUrl.startsWith('data:')) return Response.redirect(row.mediaUrl, 302)
  return dataUrlResponse(row.mediaUrl)
}
