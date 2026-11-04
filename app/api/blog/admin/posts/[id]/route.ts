import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/blog/auth'
import { deletePost, getPostByIdAdmin, isSlugTaken, savePost } from '@/lib/blog/store'
import type { PostInput } from '@/lib/blog/types'
import { validatePostInput } from '@/lib/blog/validate'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Props) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { id } = await params
    const post = await getPostByIdAdmin(id)

    if (!post) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 })
    }

    return NextResponse.json({ post })
  } catch (error) {
    console.error('API /api/blog/admin/posts/[id] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch post.' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: Props) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { id } = await params
    const input: PostInput = await request.json()

    const validationErrors = validatePostInput(input)
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: validationErrors[0].message, errors: validationErrors },
        { status: 400 }
      )
    }

    const taken = await isSlugTaken(input.slug, id)
    if (taken) {
      return NextResponse.json(
        { error: `The slug "${input.slug}" is already taken by another article.` },
        { status: 409 }
      )
    }

    const result = await savePost(id, input)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ post: result.post })
  } catch (error) {
    console.error('API /api/blog/admin/posts/[id] PUT error:', error)
    return NextResponse.json({ error: 'Failed to update post.' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: Props) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { id } = await params
    const deleted = await deletePost(id)

    if (!deleted) {
      return NextResponse.json({ error: 'Post not found or already deleted.' }, { status: 404 })
    }

    return NextResponse.json({ success: true, deletedPost: deleted })
  } catch (error) {
    console.error('API /api/blog/admin/posts/[id] DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete post.' }, { status: 500 })
  }
}

