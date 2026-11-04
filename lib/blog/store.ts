import { getPool, POSTS_TABLE } from './db'
import { deleteS3Object } from './s3'
import { DEFAULT_ACCENT, type Post, type PostInput, type PostSection } from './types'

const UNIQUE_VIOLATION = '23505'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface PostRow {
  id: string
  slug: string
  title: string
  excerpt: string | null
  intro: string | null
  category: string | null
  icon: string | null
  date: string | null
  readTime: number | null
  cover: Partial<Post['cover']> | null
  cover_image_url: string | null
  tags: string[] | null
  takeaways: string[] | null
  sections: Partial<PostSection>[] | null
  conclusion: string | null
  status: 'draft' | 'published' | null
  published_at: Date | null
  created_at: Date | null
  updatedAt: Date | null
}

const SELECT_COLUMNS = `
  id, slug, title, excerpt, intro, category, icon,
  to_char(date, 'YYYY-MM-DD') AS date,
  "readTime", cover, cover_image_url, tags, takeaways, sections, conclusion,
  COALESCE(status, 'published') AS status,
  published_at, created_at, "updatedAt"
`

function toPost(row: PostRow): Post {
  const coverImage = row.cover_image_url || row.cover?.image || ''
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? '',
    intro: row.intro ?? '',
    category: row.category ?? '',
    icon: row.icon ?? '',
    date: row.date ?? '',
    readTime: row.readTime,
    cover: {
      image: coverImage,
      motif: row.cover?.motif ?? 'network',
      label: row.cover?.label ?? '',
      accent: row.cover?.accent ?? DEFAULT_ACCENT,
    },
    cover_image_url: coverImage,
    tags: Array.isArray(row.tags) ? row.tags : [],
    takeaways: Array.isArray(row.takeaways) ? row.takeaways : [],
    sections: (Array.isArray(row.sections) ? row.sections : []).map((section) => ({
      heading: section.heading ?? '',
      paragraphs: Array.isArray(section.paragraphs) ? section.paragraphs : [],
      points: Array.isArray(section.points) ? section.points : [],
      callout: section.callout ?? null,
    })),
    conclusion: row.conclusion ?? '',
    status: row.status === 'draft' ? 'draft' : 'published',
    published_at: row.published_at?.toISOString() ?? '',
    created_at: row.created_at?.toISOString() ?? '',
    updatedAt: row.updatedAt?.toISOString() ?? '',
  }
}

/**
 * Public: Fetch all published blog articles.
 * Never returns draft articles.
 */
export async function getPublishedPosts(): Promise<Post[]> {
  const { rows } = await getPool().query<PostRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${POSTS_TABLE}
     WHERE status = 'published'
     ORDER BY published_at DESC NULLS LAST, date DESC NULLS LAST, "updatedAt" DESC NULLS LAST`
  )
  return rows.map(toPost)
}

/**
 * Public: Fetch published blog by slug.
 * Drafts are not returned to the public.
 */
export async function getPublishedPostBySlug(slug: string): Promise<Post | undefined> {
  const { rows } = await getPool().query<PostRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${POSTS_TABLE}
     WHERE slug = $1 AND status = 'published'`,
    [slug]
  )
  return rows[0] ? toPost(rows[0]) : undefined
}

/**
 * Public: Fetch all distinct categories for published articles.
 */
export async function getPublishedCategories(): Promise<string[]> {
  const { rows } = await getPool().query<{ category: string }>(
    `SELECT DISTINCT category FROM ${POSTS_TABLE}
     WHERE status = 'published' AND category IS NOT NULL AND category != ''
     ORDER BY category ASC`
  )
  return rows.map((r) => r.category)
}

/**
 * Admin: Fetch all blog articles (both drafts and published).
 */
export async function getAllPostsAdmin(): Promise<Post[]> {
  const { rows } = await getPool().query<PostRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${POSTS_TABLE}
     ORDER BY "updatedAt" DESC NULLS LAST, created_at DESC NULLS LAST`
  )
  return rows.map(toPost)
}

/**
 * Admin: Fetch any single blog by UUID.
 */
export async function getPostByIdAdmin(id: string): Promise<Post | undefined> {
  if (!UUID_PATTERN.test(id)) return undefined
  const { rows } = await getPool().query<PostRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${POSTS_TABLE} WHERE id = $1`,
    [id]
  )
  return rows[0] ? toPost(rows[0]) : undefined
}

/**
 * Check if a slug is already in use by another article.
 */
export async function isSlugTaken(slug: string, excludeId?: string | null): Promise<boolean> {
  if (excludeId && UUID_PATTERN.test(excludeId)) {
    const { rows } = await getPool().query<{ id: string }>(
      `SELECT id FROM ${POSTS_TABLE} WHERE slug = $1 AND id != $2`,
      [slug, excludeId]
    )
    return rows.length > 0
  }

  const { rows } = await getPool().query<{ id: string }>(
    `SELECT id FROM ${POSTS_TABLE} WHERE slug = $1`,
    [slug]
  )
  return rows.length > 0
}

export type SaveResult =
  | { ok: true; post: Post }
  | { ok: false; error: string }

/**
 * Admin: Save or update a blog post.
 */
export async function savePost(id: string | null, input: PostInput): Promise<SaveResult> {
  const missing: SaveResult = { ok: false, error: 'This post no longer exists.' }
  if (id !== null && !UUID_PATTERN.test(id)) return missing

  // Ensure cover object has the latest image
  const coverImage = input.cover?.image || input.cover_image_url || ''
  const coverObj = {
    image: coverImage,
    motif: input.cover?.motif ?? 'network',
    label: input.cover?.label ?? '',
    accent: input.cover?.accent ?? DEFAULT_ACCENT,
  }

  const status = input.status === 'draft' ? 'draft' : 'published'
  const publishedAt = status === 'published' ? (input.date ? new Date(input.date) : new Date()) : null

  try {
    if (id) {
      // UPDATE existing post
      const query = `
        UPDATE ${POSTS_TABLE}
        SET
          slug = $2,
          title = $3,
          excerpt = $4,
          intro = $5,
          category = $6,
          icon = $7,
          date = $8,
          "readTime" = $9,
          cover = $10,
          cover_image_url = $11,
          tags = $12,
          takeaways = $13,
          sections = $14,
          conclusion = $15,
          status = $16,
          published_at = COALESCE(published_at, $17),
          "updatedAt" = now()
        WHERE id = $1
        RETURNING ${SELECT_COLUMNS}
      `
      const values = [
        id,
        input.slug,
        input.title,
        input.excerpt,
        input.intro,
        input.category,
        input.icon,
        input.date || null,
        input.readTime || null,
        JSON.stringify(coverObj),
        coverImage,
        JSON.stringify(input.tags || []),
        JSON.stringify(input.takeaways || []),
        JSON.stringify(input.sections || []),
        input.conclusion,
        status,
        publishedAt,
      ]

      const { rows } = await getPool().query<PostRow>(query, values)
      if (!rows[0]) return missing
      return { ok: true, post: toPost(rows[0]) }
    } else {
      // INSERT new post (id generated by PostgreSQL default)
      const query = `
        INSERT INTO ${POSTS_TABLE} (
          slug, title, excerpt, intro, category, icon, date,
          "readTime", cover, cover_image_url, tags, takeaways, sections,
          conclusion, status, published_at, created_at, "updatedAt"
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13,
          $14, $15, $16, now(), now()
        )
        RETURNING ${SELECT_COLUMNS}
      `
      const values = [
        input.slug,
        input.title,
        input.excerpt,
        input.intro,
        input.category,
        input.icon,
        input.date || null,
        input.readTime || null,
        JSON.stringify(coverObj),
        coverImage,
        JSON.stringify(input.tags || []),
        JSON.stringify(input.takeaways || []),
        JSON.stringify(input.sections || []),
        input.conclusion,
        status,
        publishedAt,
      ]

      const { rows } = await getPool().query<PostRow>(query, values)
      if (!rows[0]) return { ok: false, error: 'Could not create the blog post.' }
      return { ok: true, post: toPost(rows[0]) }
    }
  } catch (error) {
    if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
      return { ok: false, error: `Another post already uses the slug "/blog/${input.slug}". Please choose a unique slug.` }
    }
    console.error('Error saving blog post:', error)
    return { ok: false, error: 'A database error occurred while saving the post.' }
  }
}

/**
 * Admin: Delete a post and optionally cleanup unshared S3 images.
 */
export async function deletePost(id: string): Promise<Post | undefined> {
  if (!UUID_PATTERN.test(id)) return undefined

  // First fetch the post so we know its cover image
  const post = await getPostByIdAdmin(id)
  if (!post) return undefined

  const { rows } = await getPool().query<PostRow>(
    `DELETE FROM ${POSTS_TABLE} WHERE id = $1 RETURNING ${SELECT_COLUMNS}`,
    [id]
  )

  if (!rows[0]) return undefined
  const deleted = toPost(rows[0])

  // Cover Image cleanup: Check if the cover image is used anywhere else before deleting
  const coverImage = deleted.cover.image
  if (coverImage && coverImage.includes('blogs-neo.s3')) {
    try {
      const { rows: otherPosts } = await getPool().query<{ id: string }>(
        `SELECT id FROM ${POSTS_TABLE} 
         WHERE (cover_image_url = $1 OR cover->>'image' = $1) AND id != $2 
         LIMIT 1`,
        [coverImage, id]
      )
      // Only delete if NO other post is referencing this image
      if (otherPosts.length === 0) {
        await deleteS3Object(coverImage)
      }
    } catch (err) {
      console.warn('Failed to clean up S3 image for deleted post:', err)
    }
  } else if (coverImage && coverImage.startsWith('/uploads/blogs/')) {
    try {
      const { rows: otherPosts } = await getPool().query<{ id: string }>(
        `SELECT id FROM ${POSTS_TABLE} 
         WHERE (cover_image_url = $1 OR cover->>'image' = $1) AND id != $2 
         LIMIT 1`,
        [coverImage, id]
      )
      if (otherPosts.length === 0) {
        const fs = await import('node:fs/promises')
        const path = await import('node:path')
        const filePath = path.join(process.cwd(), 'public', coverImage.replace(/^\/+/, ''))
        await fs.unlink(filePath).catch(() => undefined)
      }
    } catch (err) {
      console.warn('Failed to clean up local image for deleted post:', err)
    }
  }

  return deleted
}
