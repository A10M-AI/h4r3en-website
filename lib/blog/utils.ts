import type { Post } from './types'

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Formats ISO date or string to 'DD MMM YYYY' (e.g. '03 Apr 2026') */
export function formatDate(dateString?: string | null): string {
  if (!dateString) return ''
  try {
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return dateString
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateString
  }
}

/** Words per minute reading speed assumption */
const WORDS_PER_MINUTE = 200

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function estimateReadingTime(post: Partial<Post>): number {
  if (typeof post.readTime === 'number' && post.readTime > 0) {
    return post.readTime
  }

  let totalWords = 0
  if (post.title) totalWords += countWords(post.title)
  if (post.excerpt) totalWords += countWords(post.excerpt)
  if (post.intro) totalWords += countWords(post.intro)
  if (post.conclusion) totalWords += countWords(post.conclusion)

  if (Array.isArray(post.takeaways)) {
    for (const point of post.takeaways) {
      totalWords += countWords(point)
    }
  }

  if (Array.isArray(post.sections)) {
    for (const section of post.sections) {
      if (section.heading) totalWords += countWords(section.heading)
      if (Array.isArray(section.paragraphs)) {
        for (const p of section.paragraphs) totalWords += countWords(p)
      }
      if (Array.isArray(section.points)) {
        for (const pt of section.points) totalWords += countWords(pt)
      }
      if (section.callout?.text) {
        totalWords += countWords(section.callout.text)
      }
    }
  }

  return Math.max(1, Math.ceil(totalWords / WORDS_PER_MINUTE))
}

export function getReadingTime(post: Post): number {
  return estimateReadingTime(post)
}

export function toLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
}

