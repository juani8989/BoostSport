/** Post images and audio are stored as data URLs; pages get a cacheable link instead of the bytes inline. */
export function postImageSrc(postId: number, mediaUrl: string | null) {
  if (!mediaUrl) return null
  return mediaUrl.startsWith('data:') ? `/api/media/post/${postId}` : mediaUrl
}

export const postAudioSrc = (postId: number) => `/api/media/audio/${postId}`

/** Turns a `data:<type>;base64,<data>` string into a binary response. */
export function dataUrlResponse(dataUrl: string) {
  const match = /^data:([\w/+.-]+);base64,([\s\S]*)$/.exec(dataUrl)
  if (!match) return new Response('Not found', { status: 404 })
  const bytes = Buffer.from(match[2], 'base64')
  return new Response(bytes, {
    headers: {
      'Content-Type': match[1],
      'Content-Length': String(bytes.length),
      // Posts can't be edited, so the bytes behind an id never change.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
