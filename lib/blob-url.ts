/** What can be uploaded to Vercel Blob, and the limits for each. Shared by the upload route and the client. */
export const UPLOAD_KINDS = {
  'post-image': { types: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 8 * 1024 * 1024 },
  'post-audio': { types: ['audio/*'], maxBytes: 10 * 1024 * 1024 },
  profile: { types: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 5 * 1024 * 1024 },
} as const

export type UploadKind = keyof typeof UPLOAD_KINDS

/** True for files stored in this project's Vercel Blob store. */
export function isBlobUrl(url: unknown): boolean {
  if (typeof url !== 'string' || url.length > 1000) return false
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && u.hostname.endsWith('.public.blob.vercel-storage.com')
  } catch {
    return false
  }
}
