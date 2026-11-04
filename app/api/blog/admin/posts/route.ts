import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/blog/auth'
import { getAllPostsAdmin, isSlugTaken, savePost } from '@/lib/blog/store'
import type { PostInput } from '@/lib/blog/types'
import { validatePostInput } from '@/lib/blog/validate'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const posts = await getAllPostsAdmin()
    return NextResponse.json({ posts })
  } catch (error) {
    console.error('API /api/blog/admin/posts GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin blog posts.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const input: PostInput = await request.json()
    const validationErrors = validatePostInput(input)
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: validationErrors[0].message, errors: validationErrors },
        { status: 400 }
      )
    }

    const taken = await isSlugTaken(input.slug)
    if (taken) {
      return NextResponse.json(
        { error: `The slug "${input.slug}" is already taken.` },
        { status: 409 }
      )
    }

    const result = await savePost(null, input)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ post: result.post }, { status: 201 })
  } catch (error) {
    console.error('API /api/blog/admin/posts POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create blog post.' },
      { status: 500 }
    )
  }
}

