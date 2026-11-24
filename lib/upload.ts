'use client'

import { upload } from '@vercel/blob/client'
import type { UploadKind } from '@/lib/blob-url'
import { IMAGE_VARIANTS } from '@/lib/image-variants'

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
    const url = await putBlob(kind, `${kind}/${crypto.randomUUID()}.${ext(body.type)}`, body)
    blobAvailable = true
    return url
  } catch (error) {
    if (await blobMissing(error)) return fallback()
    throw error
  }
}

/**
 * Uploads a photo as two copies: a crisp HD one (its URL is what gets saved) and a light one
 * next to it for small spots, found later with `thumbOf`. Without Blob set up it falls back to
 * a single medium copy stored in the database, as before.
 */
export async function storeImage(kind: Extract<UploadKind, 'post-image' | 'profile'>, file: File): Promise<string> {
  const image = await loadImage(file)
  if (blobAvailable === false) return readAsDataUrl(await encode(image, FALLBACK))
  const hd = await encode(image, IMAGE_VARIANTS.hd)
  const id = crypto.randomUUID()
  const extension = hd.type === 'image/webp' ? 'webp' : 'jpg'
  try {
    // The light copy goes first: once the HD URL exists, anything showing it may ask for the light one.
    const sm = await encode(image, IMAGE_VARIANTS.sm)
    await putBlob(kind, `${kind}/${id}.sm.${extension}`, sm)
    const url = await putBlob(kind, `${kind}/${id}.hd.${extension}`, hd)
    blobAvailable = true
    return url
  } catch (error) {
    if (await blobMissing(error)) return readAsDataUrl(await encode(image, FALLBACK))
    throw error
  }
}

/** Without Blob the photo lives in the database, so it stays at the old, lighter size. */
const FALLBACK = { maxSide: 1280, quality: 0.8 }

function putBlob(kind: UploadKind, pathname: string, body: Blob) {
  return upload(pathname, body, {
    access: 'public',
    handleUploadUrl: '/api/upload',
    clientPayload: JSON.stringify({ kind }),
    contentType: body.type,
  }).then((result) => result.url)
}

/** A 503 from /api/upload means the Blob store isn't configured yet. */
async function blobMissing(error: unknown) {
  if (!String(error).includes('client token')) return false
  const probe = await fetch('/api/upload', { method: 'POST', body: '{}' }).catch(() => null)
  if (probe?.status !== 503) return false
  blobAvailable = false
  return true
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen.'))
    }
    img.src = url
  })
}

/** Scales the photo down to `maxSide` (never up) and encodes it as WebP, or JPEG where the browser can't. */
async function encode(img: HTMLImageElement, { maxSide, quality }: { maxSide: number; quality: number }): Promise<Blob> {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo procesar la imagen.')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const webp = await toBlob(canvas, 'image/webp', quality)
  if (webp?.type === 'image/webp') return webp
  // JPEG has no transparency: paint logos with see-through parts on white instead of black.
  ctx.globalCompositeOperation = 'destination-over'
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const jpeg = await toBlob(canvas, 'image/jpeg', quality)
  if (!jpeg) throw new Error('No se pudo procesar la imagen.')
  return jpeg
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))

function readAsDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('No pudimos leer el archivo.'))
    reader.readAsDataURL(file)
  })
}
