import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { getPool, POSTS_TABLE } from './db'
import { DEFAULT_ACCENT, type Post, type PostInput, type PostSection } from './types'

// Posts live in the PostgreSQL table named by DB_TABLE_NAME, whose columns
// mirror the Post fields. Uploaded images are still stored in
// data/blog/uploads, which needs a writable filesystem.
const UPLOADS_DIR = path.join(process.cwd(), 'data', 'blog', 'uploads')

const UNIQUE_VIOLATION = '23505'
// The id column is a uuid; querying it with anything else is a SQL error.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Most columns are nullable, so rows added straight into the table may have gaps.
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
  tags: string[] | null
  takeaways: string[] | null
  sections: Partial<PostSection>[] | null
  conclusion: string | null
  updatedAt: Date | null
}

// to_char keeps the date as YYYY-MM-DD instead of a timezone-shifted Date.
const COLUMNS = `
  id, slug, title, excerpt, intro, category, icon,
  to_char(date, 'YYYY-MM-DD') AS date,
  "readTime", cover, tags, takeaways, sections, conclusion, "updatedAt"`

const WRITE_COLUMNS = `
  slug, title, excerpt, intro, category, icon, date,
  "readTime", cover, tags, takeaways, sections, conclusion`

function toPost(row: PostRow): Post {
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
    cover: { image: '', motif: 'network', label: '', accent: DEFAULT_ACCENT, ...row.cover },
    tags: row.tags ?? [],
    takeaways: row.takeaways ?? [],
    sections: (row.sections ?? []).map((section) => ({
      heading: section.heading ?? '',
      paragraphs: section.paragraphs ?? [],
      points: section.points ?? [],
      callout: section.callout ?? null,
    })),
    conclusion: row.conclusion ?? '',
    updatedAt: row.updatedAt?.toISOString() ?? '',
  }
}

// In the same order as WRITE_COLUMNS. JSONB values must be stringified,
// or pg sends arrays as Postgres arrays.
function toValues(input: PostInput) {
  return [
    input.slug,
    input.title,
    input.excerpt,
    input.intro,
    input.category,
    input.icon,
    input.date,
    input.readTime,
    JSON.stringify(input.cover),
    JSON.stringify(input.tags),
    JSON.stringify(input.takeaways),
    JSON.stringify(input.sections),
    input.conclusion,
  ]
}

export async function getAllPosts(): Promise<Post[]> {
  const { rows } = await getPool().query<PostRow>(
    `SELECT ${COLUMNS} FROM ${POSTS_TABLE}
     ORDER BY date DESC NULLS LAST, "updatedAt" DESC NULLS LAST`
  )
  return rows.map(toPost)
}

export async function getPostBySlug(slug: string): Promise<Post | undefined> {
  const { rows } = await getPool().query<PostRow>(
    `SELECT ${COLUMNS} FROM ${POSTS_TABLE} WHERE slug = $1`,
    [slug]
  )
  return rows[0] && toPost(rows[0])
}

export type SaveResult =
  | { ok: true; post: Post }
  | { ok: false; error: string }

export async function savePost(id: string | null, input: PostInput): Promise<SaveResult> {
  const missing: SaveResult = { ok: false, error: 'This post no longer exists.' }
  if (id !== null && !UUID_PATTERN.test(id)) return missing

  const values = toValues(input)
  // $1 is the id; the post's fields follow from $2.
  const placeholders = values.map((_, i) => `$${i + 2}`).join(', ')

  try {
    const { rows } = id
      ? await getPool().query<PostRow>(
          `UPDATE ${POSTS_TABLE}
           SET (${WRITE_COLUMNS}, "updatedAt") = (${placeholders}, now())
           WHERE id = $1
           RETURNING ${COLUMNS}`,
          [id, ...values]
        )
      : await getPool().query<PostRow>(
          `INSERT INTO ${POSTS_TABLE} (id, ${WRITE_COLUMNS}, "updatedAt")
           VALUES ($1, ${placeholders}, now())
           RETURNING ${COLUMNS}`,
          [randomUUID(), ...values]
        )
    if (!rows[0]) return missing
    return { ok: true, post: toPost(rows[0]) }
  } catch (error) {
    if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
      return { ok: false, error: `Another post already uses the URL /blog/${input.slug}.` }
    }
    throw error
  }
}

export async function deletePost(id: string): Promise<Post | undefined> {
  if (!UUID_PATTERN.test(id)) return undefined
  const { rows } = await getPool().query<PostRow>(
    `DELETE FROM ${POSTS_TABLE} WHERE id = $1 RETURNING ${COLUMNS}`,
    [id]
  )
  return rows[0] && toPost(rows[0])
}

// `name` must already be validated against MEDIA_NAME_PATTERN.
export async function saveUpload(name: string, bytes: Uint8Array) {
  await fs.mkdir(UPLOADS_DIR, { recursive: true })
  await fs.writeFile(path.join(UPLOADS_DIR, name), bytes)
}

export function readUpload(name: string): Promise<Buffer> {
  return fs.readFile(path.join(UPLOADS_DIR, name))
}
