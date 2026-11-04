import { execSync } from 'child_process'
import pg from 'pg'
import fs from 'node:fs'
import path from 'node:path'

const envPath = path.join(process.cwd(), '.env')
const envContent = fs.readFileSync(envPath, 'utf8')
const env = {}
for (const line of envContent.split(/\r?\n/)) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const idx = trimmed.indexOf('=')
  if (idx !== -1) {
    let val = trimmed.slice(idx + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    env[trimmed.slice(0, idx).trim()] = val
  }
}

const tableName = env.DB_TABLE_NAME ?? 'hareen_blogs'
const table = `"${tableName}"`

const pool = new pg.Pool({
  host: env.DB_HOST,
  port: Number(env.DB_PORT ?? 5432),
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
})

async function checkJsonPosts() {
  const jsonRaw = execSync('git show 762999b~1:data/blog/posts.json', { encoding: 'utf8' })
  const posts = JSON.parse(jsonRaw)
  console.log(`Found ${posts.length} posts in git history posts.json`)

  const client = await pool.connect()
  try {
    for (const post of posts) {
      const { rows } = await client.query(`SELECT id, slug, title FROM ${table} WHERE slug = $1`, [post.slug])
      if (rows.length > 0) {
        console.log(`✓ Post already in DB: "${post.title}" (${post.slug})`)
      } else {
        console.log(`+ Inserting missing post: "${post.title}" (${post.slug})`)
        await client.query(`
          INSERT INTO ${table} (
            id, slug, title, excerpt, intro, category, icon, date, "readTime",
            cover, tags, takeaways, sections, conclusion, "updatedAt",
            status, cover_image_url, published_at, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9,
            $10, $11, $12, $13, $14, $15,
            'published', $16, $17, $18
          )
        `, [
          post.id,
          post.slug,
          post.title,
          post.excerpt,
          post.intro || '',
          post.category,
          post.icon || 'Workflow',
          post.date,
          post.readTime,
          JSON.stringify(post.cover || {}),
          JSON.stringify(post.tags || []),
          JSON.stringify(post.takeaways || []),
          JSON.stringify(post.sections || []),
          post.conclusion || '',
          post.updatedAt,
          post.cover?.image || '',
          post.date || new Date().toISOString(),
          post.updatedAt || new Date().toISOString(),
        ])
      }
    }
  } finally {
    client.release()
    await pool.end()
  }
}

checkJsonPosts().catch(console.error)

