import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { postAudio } from '@/lib/db/schema'
import { dataUrlResponse } from '@/lib/media'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id)
  if (!Number.isInteger(id) || id <= 0) return new Response('Not found', { status: 404 })
  try {
    const [row] = await db.select({ audioUrl: postAudio.audioUrl }).from(postAudio).where(eq(postAudio.postId, id)).limit(1)
    return row ? dataUrlResponse(row.audioUrl) : new Response('Not found', { status: 404 })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
