'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  checkPassword,
  createSession,
  destroySession,
  isAdmin,
  isAuthConfigured,
} from '@/lib/blog/auth'
import { deletePost, savePost } from '@/lib/blog/store'
import { parsePostInput } from '@/lib/blog/validate'

const SESSION_EXPIRED = 'Your session has expired. Please sign in again.'

export async function login(password: string): Promise<{ error: string }> {
  if (!isAuthConfigured()) {
    return { error: 'Admin access is not configured. Set BLOG_ADMIN_PASSWORD in .env.local.' }
  }
  if (typeof password !== 'string' || !checkPassword(password)) {
    // Slow down password guessing.
    await new Promise((resolve) => setTimeout(resolve, 1000))
    return { error: 'Incorrect password.' }
  }
  await createSession()
  redirect('/secure-blog')
}

export async function logout() {
  await destroySession()
  redirect('/secure-blog/login')
}

function revalidateBlog() {
  revalidatePath('/blog')
  revalidatePath('/blog/[slug]', 'page')
  revalidatePath('/secure-blog', 'layout')
}

export async function savePostAction(
  id: string | null,
  input: unknown
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!(await isAdmin())) return { ok: false, error: SESSION_EXPIRED }
  if (id !== null && typeof id !== 'string') return { ok: false, error: 'Invalid post.' }

  const parsed = parsePostInput(input)
  if (!parsed.ok) return parsed

  const result = await savePost(id, parsed.post)
  if (!result.ok) return result
  revalidateBlog()
  return { ok: true, id: result.post.id }
}

export async function deletePostAction(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await isAdmin())) return { ok: false, error: SESSION_EXPIRED }
  if (typeof id !== 'string' || !(await deletePost(id))) {
    return { ok: false, error: 'This post no longer exists.' }
  }
  revalidateBlog()
  return { ok: true }
}
