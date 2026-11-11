'use client'

import { upload } from '@vercel/blob/client'
import type { UploadKind } from '@/lib/blob-url'

const ext = (type: string) => ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/webm': 'webm', 'audio/aac': 'aac' })[type] ?? 'bin'

function dataUrlToBlob(dataUrl: string) {
  const [head, data] = dataUrl.split(',')
  const type = /data:([^;]+)/.exec(head)?.[1] ?? 'application/octet-stream'
  const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
  return new Blob([bytes], { type })
}

let blobAvailable: boolean | null = null

/**
 * Uploads a file (or a data URL) to Vercel Blob and returns its public URL. If Blob isn't
 * set up yet it returns the data URL unchanged, so uploads keep working (stored in the
 * database, as before) until the store exists.
 */
export async function storeMedia(kind: UploadKind, file: Blob | string): Promise<string> {
  const fallback = async () => (typeof file === 'string' ? file : await readAsDataUrl(file))
  if (blobAvailable === false) return fallback()
  const body = typeof file === 'string' ? dataUrlToBlob(file) : file
  try {
    const result = await upload(`${kind}/${crypto.randomUUID()}.${ext(body.type)}`, body, {
      access: 'public',
      handleUploadUrl: '/api/upload',
      clientPayload: JSON.stringify({ kind }),
      contentType: body.type,
    })
    blobAvailable = true
    return result.url
  } catch (error) {
    // 503 from /api/upload means the Blob store isn't configured yet.
    if (String(error).includes('client token')) {
      const probe = await fetch('/api/upload', { method: 'POST', body: '{}' }).catch(() => null)
      if (probe?.status === 503) {
        blobAvailable = false
        return fallback()
      }
    }
    throw error
  }
}

function readAsDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('No pudimos leer el archivo.'))
    reader.readAsDataURL(file)
  })
}
