import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { getSession } from '@/lib/session'
import { UPLOAD_KINDS, type UploadKind } from '@/lib/blob-url'

/**
 * Hands the browser a short-lived token to upload one file straight to Vercel Blob.
 * Only signed-in users, only into the folder of each kind of file, and only the types
 * and sizes allowed for it.
 */
export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ error: 'Blob no configurado' }, { status: 503 })
  const body = (await request.json().catch(() => null)) as HandleUploadBody | null
  if (!body) return Response.json({ error: 'Pedido inválido' }, { status: 400 })

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const session = await getSession()
        if (!session?.user) throw new Error('Unauthorized')
        const kind = (JSON.parse(clientPayload ?? '{}') as { kind?: string }).kind as UploadKind | undefined
        const rules = kind && Object.hasOwn(UPLOAD_KINDS, kind) ? UPLOAD_KINDS[kind] : null
        if (!rules || !pathname.startsWith(`${kind}/`) || pathname.includes('..')) throw new Error('Forbidden')
        return {
          allowedContentTypes: [...rules.types],
          maximumSizeInBytes: rules.maxBytes,
          addRandomSuffix: true,
          // Uploads never change once stored, so browsers and the CDN can keep them for a year.
          cacheControlMaxAge: 60 * 60 * 24 * 365,
          tokenPayload: JSON.stringify({ userId: session.user.id, kind }),
        }
      },
    })
    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 400
    return Response.json({ error: message || 'No se pudo subir' }, { status })
  }
}
