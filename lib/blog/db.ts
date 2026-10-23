import { Pool, type PoolConfig } from 'pg'

const REQUIRED_ENV = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'] as const

// Connection settings come from .env.local (see .env.example).
function readConfig(): PoolConfig {
  // pg treats an empty password as none and fails with an unhelpful SASL error.
  const missing = REQUIRED_ENV.filter((key) => !process.env[key])
  if (missing.length) {
    throw new Error(`Blog database is not configured: set ${missing.join(', ')} in .env.local.`)
  }
  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    // AWS RDS certificates aren't in Node's default trust store.
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  }
}

// One pool, kept across hot reloads in development but rebuilt when the
// settings change, so editing .env.local takes effect without a restart.
const globalForPg = globalThis as unknown as { blogPool?: { key: string; pool: Pool } }

export function getPool(): Pool {
  const config = readConfig()
  const key = JSON.stringify(config)
  const cached = globalForPg.blogPool
  if (cached?.key === key) return cached.pool

  cached?.pool.end().catch(() => undefined)
  const pool = new Pool(config)
  // Without a listener, an idle client dropped by the server crashes the process.
  pool.on('error', (error) => console.error('PostgreSQL pool error:', error.message))
  globalForPg.blogPool = { key, pool }
  return pool
}

const TABLE_NAME_PATTERN = /^[a-z_][a-z0-9_]*$/

function tableName(): string {
  const name = process.env.DB_TABLE_NAME ?? 'hareen_blogs'
  // Interpolated into SQL, so it must never come from untrusted input.
  if (!TABLE_NAME_PATTERN.test(name)) throw new Error(`Invalid DB_TABLE_NAME: ${name}`)
  return name
}

/** The quoted posts table name, safe to interpolate into a query. */
export const POSTS_TABLE = `"${tableName()}"`
