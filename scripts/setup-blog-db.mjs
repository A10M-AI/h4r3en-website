// Creates the blog posts table and imports any posts left in data/blog/posts.json.
// Usage: npm run db:setup   (reads the DB_* settings from .env.local)
//
// Safe to run more than once: the table is only created when missing, and
// posts whose id or slug already exist in the table are skipped.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import pg from 'pg'

const POSTS_FILE = path.join(process.cwd(), 'data', 'blog', 'posts.json')

const tableName = process.env.DB_TABLE_NAME ?? 'hareen_blogs'
if (!/^[a-z_][a-z0-9_]*$/.test(tableName)) fail(`Invalid DB_TABLE_NAME: ${tableName}`)
const table = `"${tableName}"`

for (const key of ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']) {
  if (!process.env[key]) fail(`${key} is not set in .env.local.`)
}

// Matches the hareen_blogs table on RDS; keep in sync with lib/blog/store.ts.
const CREATE_TABLE = `
  CREATE TABLE ${table} (
    id          UUID PRIMARY KEY,
    slug        VARCHAR(255) NOT NULL UNIQUE,
    title       VARCHAR(500) NOT NULL,
    excerpt     TEXT,
    intro       TEXT DEFAULT '',
    category    VARCHAR(255),
    icon        VARCHAR(100),
    date        DATE,
    "readTime"  INTEGER,
    cover       JSONB,
    tags        JSONB DEFAULT '[]',
    takeaways   JSONB DEFAULT '[]',
    sections    JSONB DEFAULT '[]',
    conclusion  TEXT,
    "updatedAt" TIMESTAMPTZ
  )`

const REQUIRED_COLUMNS = [
  'id', 'slug', 'title', 'excerpt', 'intro', 'category', 'icon', 'date', 'readTime',
  'cover', 'tags', 'takeaways', 'sections', 'conclusion', 'updatedAt',
]

function fail(message) {
  console.error(`\n✗ ${message}\n`)
  process.exit(1)
}

async function readLocalPosts() {
  try {
    return JSON.parse(await fs.readFile(POSTS_FILE, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10_000,
})

const client = await pool.connect().catch((error) =>
  fail(`Could not connect to ${process.env.DB_HOST}: ${error.message}`)
)

try {
  console.log(`Connected to ${process.env.DB_NAME} on ${process.env.DB_HOST}`)

  const { rows: existing } = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = current_schema() AND table_name = $1`,
    [tableName]
  )

  if (existing.length === 0) {
    await client.query(CREATE_TABLE)
    console.log(`✓ Created table ${tableName}`)
  } else {
    const names = new Set(existing.map((row) => row.column_name))
    const missing = REQUIRED_COLUMNS.filter((column) => !names.has(column))
    if (missing.length) {
      fail(
        `Table ${tableName} already exists but is missing columns: ${missing.join(', ')}.\n` +
          `  Existing columns: ${[...names].join(', ')}\n` +
          '  Nothing was changed.'
      )
    }
    console.log(`✓ Table ${tableName} already exists with the expected columns`)
  }

  const posts = await readLocalPosts()
  if (posts) {
    await client.query('BEGIN')
    let imported = 0
    for (const post of posts) {
      const { rowCount } = await client.query(
        `INSERT INTO ${table} (
           id, slug, title, excerpt, intro, category, icon, date, "readTime",
           cover, tags, takeaways, sections, conclusion, "updatedAt"
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT DO NOTHING`,
        [
          post.id,
          post.slug,
          post.title,
          post.excerpt,
          post.intro,
          post.category,
          post.icon,
          post.date,
          post.readTime,
          JSON.stringify(post.cover),
          JSON.stringify(post.tags),
          JSON.stringify(post.takeaways),
          JSON.stringify(post.sections),
          post.conclusion,
          post.updatedAt,
        ]
      )
      imported += rowCount
      console.log(`  ${rowCount ? '+ imported' : '= already in table'}: ${post.slug}`)
    }
    await client.query('COMMIT')
    await fs.unlink(POSTS_FILE)
    console.log(`✓ Imported ${imported} of ${posts.length} posts and removed data/blog/posts.json`)
  }

  const { rows } = await client.query(`SELECT count(*)::int AS total FROM ${table}`)
  console.log(`\nDone — ${tableName} has ${rows[0].total} post(s).\n`)
} catch (error) {
  await client.query('ROLLBACK').catch(() => {})
  fail(error.message)
} finally {
  client.release()
  await pool.end()
}
