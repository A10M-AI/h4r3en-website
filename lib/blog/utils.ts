import type { Post } from './types'

const WORDS_PER_MINUTE = 200

type ReadableContent = Pick<
  Post,
  'intro' | 'takeaways' | 'sections' | 'conclusion'
>

export function countWords(post: ReadableContent): number {
  const text = [
    post.intro,
    ...post.takeaways,
    ...post.sections.flatMap((section) => [
      section.heading,
      ...section.paragraphs,
      ...section.points,
      section.callout?.text ?? '',
    ]),
    post.conclusion,
  ].join(' ')
  return text.split(/\s+/).filter(Boolean).length
}

export function estimateReadingTime(post: ReadableContent): number {
  return Math.max(1, Math.round(countWords(post) / WORDS_PER_MINUTE))
}

/** The author's read time when set, otherwise the calculated estimate. */
export function getReadingTime(post: ReadableContent & Pick<Post, 'readTime'>): number {
  return post.readTime ?? estimateReadingTime(post)
}

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatDate(date: string): string {
  const parsed = new Date(date)
  return Number.isNaN(parsed.getTime()) ? '' : dateFormatter.format(parsed)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

/** Splits multi-line text into trimmed, non-empty lines. */
export function toLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}
