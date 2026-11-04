import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const SESSION_COOKIE = 'blog_admin_session'
const SESSION_TTL_SECONDS = 60 * 60 * 12 // 12 hours

// In-memory rate limiting map for login attempts: ip/key -> { count, lastAttempt }
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>()

function getSecretKey(): string {
  const secret = process.env.BLOG_SESSION_SECRET
  if (!secret) {
    throw new Error('BLOG_SESSION_SECRET environment variable is not configured.')
  }
  return secret
}

function getAdminPassword(): string {
  const password = process.env.BLOG_ADMIN_PASSWORD
  if (!password) {
    throw new Error('BLOG_ADMIN_PASSWORD environment variable is not configured.')
  }
  return password
}

function sign(value: string): string {
  return createHmac('sha256', getSecretKey())
    .update(value)
    .digest('base64url')
}

function safeEqual(a: string, b: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(a), digest(b))
}

export function checkRateLimit(clientId = 'default'): { allowed: boolean; waitSeconds?: number } {
  const now = Date.now()
  const record = loginAttempts.get(clientId)

  if (record && record.lockedUntil > now) {
    return {
      allowed: false,
      waitSeconds: Math.ceil((record.lockedUntil - now) / 1000),
    }
  }

  return { allowed: true }
}

export function recordLoginFailure(clientId = 'default') {
  const now = Date.now()
  const record = loginAttempts.get(clientId) || { count: 0, lockedUntil: 0 }
  record.count += 1

  if (record.count >= 5) {
    // Lock for 15 minutes after 5 consecutive failures
    record.lockedUntil = now + 15 * 60 * 1000
    record.count = 0
  }

  loginAttempts.set(clientId, record)
}

export function resetLoginAttempts(clientId = 'default') {
  loginAttempts.delete(clientId)
}

export function verifyPassword(password: string): boolean {
  try {
    const adminPassword = getAdminPassword()
    return safeEqual(password, adminPassword)
  } catch (error) {
    console.error('Password verification error:', error)
    return false
  }
}

export async function createSession() {
  const expires = String(Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS)
  const signature = sign(expires)
  const token = `${expires}.${signature}`

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
}

export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function isAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value
    if (!token) return false

    const [expires, signature] = token.split('.')
    if (!expires || !signature) return false

    const expiryTime = Number(expires)
    if (isNaN(expiryTime) || expiryTime < Date.now() / 1000) {
      return false
    }

    const expectedSignature = sign(expires)
    return safeEqual(signature, expectedSignature)
  } catch (err) {
    console.error('Session validation error:', err)
    return false
  }
}

/**
 * Route protection helper. Call at the top of server-rendered admin pages.
 */
export async function requireAdmin() {
  if (!(await isAdmin())) {
    redirect('/secure-blog/login')
  }
}
