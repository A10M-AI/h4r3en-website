import { Pool, type PoolConfig } from 'pg'

const REQUIRED_ENV = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'] as const

function readConfig(): PoolConfig {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key])
  if (missing.length) {
    throw new Error(`Blog database is not configured: set ${missing.join(', ')} in environment.`)
  }

  const isSsl = process.env.DB_SSL === 'true'

  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: isSsl ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  }
}

const globalForPg = globalThis as unknown as { blogPool?: { key: string; pool: Pool } }

export function getPool(): Pool {
  const config = readConfig()
  const key = `${config.host}:${config.port}:${config.database}:${config.user}:${config.ssl ? 'ssl' : 'nossl'}`
  const cached = globalForPg.blogPool
  if (cached?.key === key) return cached.pool

  cached?.pool.end().catch(() => undefined)
  const pool = new Pool(config)
  pool.on('error', (error) => console.error('PostgreSQL pool background error:', error.message))
  globalForPg.blogPool = { key, pool }
  return pool
}

const TABLE_NAME_PATTERN = /^[a-z_][a-z0-9_]*$/i

export function getTableName(): string {
  const name = process.env.DB_TABLE_NAME ?? 'hareen_blogs'
  if (!TABLE_NAME_PATTERN.test(name)) {
    throw new Error(`Invalid DB_TABLE_NAME: ${name}`)
  }
  return name
}

/** The safely quoted blog table name for SQL interpolation. */
export const POSTS_TABLE = `"${getTableName()}"`

