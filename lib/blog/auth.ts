import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const SESSION_COOKIE = 'blog_admin_session'
const SESSION_TTL_SECONDS = 60 * 60 * 12

// Set in code rather than an environment variable, as requested.
// Anyone who can read this repository can sign in to /secure-blog.
const ADMIN_PASSWORD = 'neophoenix@123'

// Keyed on the password, so changing it signs out every existing session.
function sign(value: string): string {
  return createHmac('sha256', `blog-session:${ADMIN_PASSWORD}`)
    .update(value)
    .digest('base64url')
}

function safeEqual(a: string, b: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(a), digest(b))
}

export function checkPassword(password: string): boolean {
  return safeEqual(password, ADMIN_PASSWORD)
}

export async function createSession() {
  const expires = String(Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS)
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, `${expires}.${sign(expires)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
}

export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return false
  const [expires, signature] = token.split('.')
  if (!expires || !signature || Number(expires) < Date.now() / 1000) return false
  return safeEqual(signature, sign(expires))
}

/** Use at the top of every /secure-blog page. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect('/secure-blog/login')
}
