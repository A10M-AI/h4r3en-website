import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/blog/auth'
import { generatePresignedUploadUrl } from '@/lib/blog/s3'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await request.json()
    const { filename, contentType, fileSize } = body

    if (!filename || !contentType || !fileSize) {
      return NextResponse.json(
        { error: 'Missing required fields: filename, contentType, fileSize.' },
        { status: 400 }
      )
    }

    const result = generatePresignedUploadUrl(filename, contentType, Number(fileSize))
    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('API /api/blog/admin/upload-url error:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to generate S3 upload URL.' },
      { status: 400 }
    )
  }
}

