import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/blog/auth'
import { uploadToS3, saveLocalUpload } from '@/lib/blog/s3'
import { MAX_UPLOAD_BYTES, UPLOAD_MIME_TYPES } from '@/lib/blog/types'
import { sniffImageExtension } from '@/lib/blog/validate'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: 'Image file must be 5 MB or smaller.' },
        { status: 400 }
      )
    }

    const contentType = file.type || 'application/octet-stream'
    if (!UPLOAD_MIME_TYPES.includes(contentType.toLowerCase())) {
      return NextResponse.json(
        { error: `Unsupported file type: ${contentType}. Allowed: JPEG, PNG, WEBP, GIF, AVIF.` },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Validate file magic bytes to prevent spoofed file extensions
    const sniffed = sniffImageExtension(new Uint8Array(buffer.slice(0, 32)))
    if (!sniffed) {
      return NextResponse.json(
        { error: 'The uploaded file does not have a valid image signature.' },
        { status: 400 }
      )
    }

    // Attempt direct AWS S3 upload first
    try {
      const s3Result = await uploadToS3(buffer, file.name, contentType)
      return NextResponse.json({
        ok: true,
        canonicalUrl: s3Result.canonicalUrl,
        key: s3Result.key,
        storage: 's3',
      })
    } catch (s3Error: unknown) {
      console.warn('AWS S3 upload attempt failed, falling back to local storage:', s3Error)
      const localResult = await saveLocalUpload(buffer, file.name)
      return NextResponse.json({
        ok: true,
        canonicalUrl: localResult.canonicalUrl,
        key: localResult.key,
        storage: 'local',
        warning: (s3Error as Error).message,
      })
    }
  } catch (error: unknown) {
    console.error('API /api/blog/admin/upload error:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to upload image.' },
      { status: 500 }
    )
  }
}

