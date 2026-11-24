/**
 * Uploaded photos are stored twice: a sharp HD copy (the URL saved in the database, used
 * wherever the photo is shown big) and a light copy beside it for small spots (avatars,
 * grids, lists). Both share one name and differ only in `.hd.` / `.sm.`, so the light copy
 * is found from the HD URL without storing a second column.
 */
const HD_NAME = /\.hd\.(webp|jpg)$/

/** Size and quality for each copy. HD stays crisp when zoomed; the light copy is for small spots. */
export const IMAGE_VARIANTS = {
  hd: { maxSide: 2048, quality: 0.86 },
  sm: { maxSide: 640, quality: 0.78 },
} as const

/** Upload paths the client names itself: `<kind>/<uuid>.hd.webp` and `<kind>/<uuid>.sm.webp`. */
export const VARIANT_PATH = /^[a-z-]+\/[0-9a-f-]{36}\.(hd|sm)\.(webp|jpg)$/

/**
 * The light copy of an uploaded photo, for small spots. Photos uploaded before there were two
 * copies (and outside images) come back unchanged.
 */
export function thumbOf<T extends string | null | undefined>(url: T): T {
  if (typeof url !== 'string' || !HD_NAME.test(url)) return url
  return url.replace(HD_NAME, '.sm.$1') as T
}
