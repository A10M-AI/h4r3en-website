import { NextResponse } from 'next/server'
import {
  checkRateLimit,
  createSession,
  destroySession,
  isAdmin,
  recordLoginFailure,
  resetLoginAttempts,
  verifyPassword,
} from '@/lib/blog/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const authenticated = await isAdmin()
  return NextResponse.json({ authenticated })
}

export async function POST(request: Request) {
  try {
    const { password } = await request.json()

    if (typeof password !== 'string' || !password) {
      return NextResponse.json({ error: 'Password is required.' }, { status: 400 })
    }

    const rateLimit = checkRateLimit()
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many failed attempts. Please wait ${rateLimit.waitSeconds} seconds.`,
        },
        { status: 429 }
      )
    }

    const isValid = verifyPassword(password)
    if (!isValid) {
      recordLoginFailure()
      return NextResponse.json({ error: 'Invalid admin password.' }, { status: 401 })
    }

    resetLoginAttempts()
    await createSession()

    return NextResponse.json({ success: true, message: 'Authenticated successfully.' })
  } catch (error) {
    console.error('API /api/blog/admin/auth error:', error)
    return NextResponse.json({ error: 'Authentication failed.' }, { status: 500 })
  }
}

export async function DELETE() {
  await destroySession()
  return NextResponse.json({ success: true, message: 'Logged out successfully.' })
}

