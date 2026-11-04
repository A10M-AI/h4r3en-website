'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  checkRateLimit,
  createSession,
  destroySession,
  isAdmin,
  recordLoginFailure,
  resetLoginAttempts,
  verifyPassword,
} from '@/lib/blog/auth'
import { deletePost, isSlugTaken, savePost, type SaveResult } from '@/lib/blog/store'
import type { PostInput } from '@/lib/blog/types'
import { validatePostInput } from '@/lib/blog/validate'

export async function loginAction(
  prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const password = formData.get('password')

  if (typeof password !== 'string' || !password) {
    return { error: 'Please enter the admin password.' }
  }

  // Check rate limiting
  const rateLimit = checkRateLimit()
  if (!rateLimit.allowed) {
    return {
      error: `Too many failed login attempts. Please wait ${rateLimit.waitSeconds} seconds before trying again.`,
    }
  }

  const isValid = verifyPassword(password)
  if (!isValid) {
    recordLoginFailure()
    return { error: 'Invalid admin password. Access denied.' }
  }

  // Successful login
  resetLoginAttempts()
  await createSession()
  redirect('/secure-blog')
}

export async function logoutAction() {
  await destroySession()
  redirect('/secure-blog/login')
}

export async function checkSlugAction(
  slug: string,
  excludeId?: string | null
): Promise<{ available: boolean }> {
  if (!(await isAdmin())) {
    return { available: false }
  }
  const taken = await isSlugTaken(slug, excludeId)
  return { available: !taken }
}

export async function savePostAction(
  id: string | null,
  input: PostInput
): Promise<SaveResult> {
  if (!(await isAdmin())) {
    return { ok: false, error: 'Unauthorized. Please sign in again.' }
  }

  // Validate input fields
  const validationErrors = validatePostInput(input)
  if (validationErrors.length > 0) {
    return { ok: false, error: validationErrors[0].message }
  }

  // Check slug uniqueness
  const taken = await isSlugTaken(input.slug, id)
  if (taken) {
    return {
      ok: false,
      error: `Another article already uses the URL slug "/blog/${input.slug}". Please choose a different slug.`,
    }
  }

  const result = await savePost(id, input)

  if (result.ok) {
    revalidatePath('/blog')
    revalidatePath(`/blog/${result.post.slug}`)
    revalidatePath('/secure-blog')
  }

  return result
}

export async function deletePostAction(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await isAdmin())) {
    return { ok: false, error: 'Unauthorized. Please sign in again.' }
  }

  const deleted = await deletePost(id)
  if (!deleted) {
    return { ok: false, error: 'Post could not be found or has already been deleted.' }
  }

  revalidatePath('/blog')
  revalidatePath(`/blog/${deleted.slug}`)
  revalidatePath('/secure-blog')

  return { ok: true }
}

