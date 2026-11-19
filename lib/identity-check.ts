import 'server-only'

import { generateText, Output } from 'ai'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { identityReviews } from '@/lib/db/schema'
import { assertPublicUrl } from '@/lib/press'

/**
 * A first opinion for the admin who reviews a new athlete: does the selfie match the public
 * photos found on the web and the ID photo, and does the ID name match the account? It never
 * approves anyone by itself; the tilde azul is always an admin's decision.
 */

export type AiCheck = {
  faceDetected: boolean
  matchesPublicPhotos: boolean | null
  matchesDocument: boolean | null
  documentName: string
  confidence: number
  notes: string
  checkedAt: string
}

const schema = z.object({
  faceDetected: z.boolean().describe('La selfie muestra un rostro humano real, de frente (no una foto de una pantalla o de un papel)'),
  matchesPublicPhotos: z.boolean().nullable().describe('La selfie coincide con la persona de las fotos públicas; null si no hay fotos públicas o no muestran una cara clara'),
  matchesDocument: z.boolean().nullable().describe('La selfie coincide con la foto del documento; null si no hay documento'),
  documentName: z.string().describe('Nombre y apellido que se leen en el documento, o vacío'),
  confidence: z.number().min(0).max(100),
  notes: z.string().describe('Dos o tres oraciones en español para el administrador: qué coincide, qué no y qué mirar'),
})

async function fetchImage(url: string) {
  const safe = await assertPublicUrl(url)
  const res = await fetch(safe, { signal: AbortSignal.timeout(6000) })
  if (!res.ok || !res.headers.get('content-type')?.startsWith('image/')) return null
  const bytes = new Uint8Array(await res.arrayBuffer())
  return bytes.length < 5_000_000 ? bytes : null
}

const dataPart = (dataUrl: string) => dataUrl.slice(dataUrl.indexOf(',') + 1)

export async function runIdentityCheck(userId: string, accountName: string) {
  const [row] = await db.select().from(identityReviews).where(eq(identityReviews.userId, userId)).limit(1)
  if (!row?.selfie) return
  const selfie = row.selfie
  const document = row.document
  const evidence = row.evidence as { photos?: string[] }
  const references = (await Promise.all((evidence.photos ?? []).slice(0, 2).map((u) => fetchImage(u).catch(() => null)))).filter((x): x is NonNullable<typeof x> => !!x)

  const content: ({ type: 'text'; text: string } | { type: 'file'; mediaType: 'image'; data: Uint8Array | string })[] = [
    {
      type: 'text',
      text: `Revisión de identidad para una app de deportistas. La cuenta dice llamarse "${accountName}". Te paso, en orden: ${references.length} foto(s) pública(s) encontradas en la web (pueden no mostrarla claramente), la selfie que se sacó ahora${row.document ? ' y la foto de su documento de identidad' : ''}. Compará rasgos faciales estables teniendo en cuenta edad, luz y peinado. Sé conservador: ante la duda, false.`,
    },
    ...references.map((data) => ({ type: 'file' as const, mediaType: 'image' as const, data })),
    { type: 'file', mediaType: 'image', data: dataPart(selfie) },
    ...(document ? [{ type: 'file' as const, mediaType: 'image' as const, data: dataPart(document) }] : []),
  ]

  try {
    const { output } = await generateText({
      model: 'anthropic/claude-sonnet-5.5',
      output: Output.object({ schema }),
      messages: [{ role: 'user', content }],
      abortSignal: AbortSignal.timeout(40_000),
    })
    const check: AiCheck = {
      ...output,
      matchesPublicPhotos: references.length ? output.matchesPublicPhotos : null,
      matchesDocument: row.document ? output.matchesDocument : null,
      checkedAt: new Date().toISOString(),
    }
    await db.update(identityReviews).set({ aiCheck: check }).where(eq(identityReviews.userId, userId))
  } catch (error) {
    // Without the AI the admin still has the photos to compare by eye.
    console.error('[identity-check] failed', error)
  }
}
