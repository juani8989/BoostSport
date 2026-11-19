/**
 * Gallery photos aren't posts, but people like and comment on them like any post. Each one gets
 * a stable id from its owner and its address: "photo:<userId>.<hash>".
 */
export const PHOTO_ID = /^photo:[\w-]+\.[a-z0-9]{1,8}$/

export function galleryPhotoId(ownerKey: string, src: string) {
  let h = 5381
  for (let i = 0; i < src.length; i++) h = ((h << 5) + h + src.charCodeAt(i)) >>> 0
  return `photo:${ownerKey.replace(/^user:/, '')}.${h.toString(36)}`
}

/** The account a gallery photo belongs to. */
export const photoOwner = (id: string) => (PHOTO_ID.test(id) ? id.slice(6, id.lastIndexOf('.')) : null)
