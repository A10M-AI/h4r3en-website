import { readUpload } from '@/lib/blog/store'
import { MEDIA_NAME_PATTERN } from '@/lib/blog/validate'

const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params
  const match = MEDIA_NAME_PATTERN.exec(file)
  if (!match) return new Response('Not found', { status: 404 })

  try {
    const data = await readUpload(file)
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': CONTENT_TYPES[match[1]],
        // Upload names are unique, so the content never changes.
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
