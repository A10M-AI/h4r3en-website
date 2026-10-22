import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/blog/auth'
import { saveUpload } from '@/lib/blog/store'
import { MAX_UPLOAD_BYTES } from '@/lib/blog/types'
import { sniffImageExtension } from '@/lib/blog/validate'

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })
  }

  // Reject oversized bodies before buffering them.
  const declaredSize = Number(request.headers.get('content-length') ?? 0)
  if (declaredSize > MAX_UPLOAD_BYTES + 64 * 1024) {
    return NextResponse.json({ error: 'Image must be 5 MB or smaller.' }, { status: 413 })
  }

  const file = (await request.formData()).get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No image received.' }, { status: 400 })
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'Image must be 5 MB or smaller.' }, { status: 413 })
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const extension = sniffImageExtension(bytes)
  if (!extension) {
    return NextResponse.json(
      { error: 'Only PNG, JPG, WEBP, GIF or AVIF images are allowed.' },
      { status: 415 }
    )
  }

  const name = `${Date.now().toString(36)}-${randomBytes(6).toString('hex')}.${extension}`
  await saveUpload(name, bytes)
  return NextResponse.json({ url: `/api/blog/media/${name}` })
}
