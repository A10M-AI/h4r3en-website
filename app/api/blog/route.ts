import { NextResponse } from 'next/server'
import { getPublishedPosts } from '@/lib/blog/store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')?.toLowerCase().trim()

    let posts = await getPublishedPosts()

    if (category && category !== 'All') {
      posts = posts.filter(
        (p) => p.category.toLowerCase() === category.toLowerCase()
      )
    }

    if (search) {
      posts = posts.filter((p) => {
        const inTitle = p.title.toLowerCase().includes(search)
        const inExcerpt = p.excerpt.toLowerCase().includes(search)
        const inTags = p.tags.some((t) => t.toLowerCase().includes(search))
        return inTitle || inExcerpt || inTags
      })
    }

    return NextResponse.json({ posts })
  } catch (error) {
    console.error('API /api/blog error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch published blogs.' },
      { status: 500 }
    )
  }
}

