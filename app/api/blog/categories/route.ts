import { NextResponse } from 'next/server'
import { getPublishedCategories } from '@/lib/blog/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const categories = await getPublishedCategories()
    return NextResponse.json({ categories })
  } catch (error) {
    console.error('API /api/blog/categories error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories.' },
      { status: 500 }
    )
  }
}

