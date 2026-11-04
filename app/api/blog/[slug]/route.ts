import { NextResponse } from 'next/server'
import { getPublishedPostBySlug } from '@/lib/blog/store'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function GET(request: Request, { params }: Props) {
  try {
    const { slug } = await params
    const post = await getPublishedPostBySlug(slug)

    if (!post) {
      return NextResponse.json(
        { error: 'Article not found or not published.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ post })
  } catch (error) {
    console.error('API /api/blog/[slug] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch article.' },
      { status: 500 }
    )
  }
}

