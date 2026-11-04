import pg from 'pg'
import fs from 'node:fs'
import path from 'node:path'

// Read .env
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
if (!/^[a-z_][a-z0-9_]*$/i.test(tableName)) {
  console.error(`Invalid DB_TABLE_NAME: ${tableName}`)
  process.exit(1)
}
const table = `"${tableName}"`

const pool = new pg.Pool({
  host: env.DB_HOST,
  port: Number(env.DB_PORT ?? 5432),
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10_000,
})

async function migrate() {
  const client = await pool.connect()
  try {
    console.log(`Connected to database. Running safe migration on ${table}...`)
    await client.query('BEGIN')

    // 1. Ensure gen_random_uuid default on id
    await client.query(`ALTER TABLE ${table} ALTER COLUMN id SET DEFAULT gen_random_uuid()`)
    console.log('✓ gen_random_uuid default set on id')

    // 2. Add status column
    await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'published' NOT NULL`)
    console.log('✓ status column verified')

    // 3. Add cover_image_url column
    await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS cover_image_url TEXT`)
    console.log('✓ cover_image_url column verified')

    // 4. Add published_at column
    await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ`)
    console.log('✓ published_at column verified')

    // 5. Add created_at column
    await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()`)
    console.log('✓ created_at column verified')

    // 6. Sync existing rows
    await client.query(`
      UPDATE ${table}
      SET 
        cover_image_url = COALESCE(cover_image_url, cover->>'image', ''),
        published_at = COALESCE(published_at, date, "updatedAt", now()),
        created_at = COALESCE(created_at, "updatedAt", now()),
        status = COALESCE(status, 'published')
    `)
    console.log('✓ synced existing rows for new columns')

    // 7. Add performance indexes
    await client.query(`CREATE INDEX IF NOT EXISTS "${tableName}_status_idx" ON ${table} (status)`)
    await client.query(`CREATE INDEX IF NOT EXISTS "${tableName}_date_idx" ON ${table} (date DESC NULLS LAST)`)
    await client.query(`CREATE INDEX IF NOT EXISTS "${tableName}_category_idx" ON ${table} (category)`)
    await client.query(`CREATE INDEX IF NOT EXISTS "${tableName}_published_at_idx" ON ${table} (published_at DESC NULLS LAST)`)
    console.log('✓ performance indexes created/verified')

    await client.query('COMMIT')
    console.log(`\nMigration completed successfully for ${table}.`)
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Migration failed:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

migrate()

