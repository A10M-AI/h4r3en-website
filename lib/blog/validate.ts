import { POST_ICONS } from './icons'
import {
  CALLOUT_TYPES,
  COVER_MOTIFS,
  type PostInput,
  type PostSection,
} from './types'

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const MEDIA_NAME_PATTERN = /^[a-z0-9-]+\.(png|jpg|webp|gif|avif)$/
const MEDIA_URL_PATTERN = /^\/api\/blog\/media\/[a-z0-9-]+\.(png|jpg|webp|gif|avif)$/
const EXTERNAL_URL_PATTERN = /^https:\/\/[^\s"'<>]+$/
const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function isValidCoverImage(value: string): boolean {
  return MEDIA_URL_PATTERN.test(value) || EXTERNAL_URL_PATTERN.test(value)
}

class ValidationError extends Error {}

function fail(message: string): never {
  throw new ValidationError(message)
}

function text(value: unknown, field: string, max: number, required = false): string {
  if (typeof value !== 'string') fail(`${field} is invalid.`)
  const trimmed = value.trim()
  if (required && !trimmed) fail(`${field} is required.`)
  if (trimmed.length > max) fail(`${field} must be ${max} characters or fewer.`)
  return trimmed
}

function list(value: unknown, field: string, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) fail(`${field} is invalid.`)
  const items = value.map((item) => text(item, field, maxLength)).filter(Boolean)
  if (items.length > maxItems) fail(`${field} can have at most ${maxItems} items.`)
  return items
}

function oneOf<T extends string>(value: unknown, options: readonly T[], field: string): T {
  if (!options.includes(value as T)) fail(`${field} is invalid.`)
  return value as T
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(`${field} is invalid.`)
  }
  return value as Record<string, unknown>
}

function section(value: unknown, index: number): PostSection {
  const raw = record(value, `Section ${index + 1}`)
  const label = `Section ${index + 1}`
  let callout: PostSection['callout'] = null
  if (raw.callout !== null && raw.callout !== undefined) {
    const c = record(raw.callout, `${label} callout`)
    const calloutText = text(c.text, `${label} callout text`, 1000)
    if (calloutText) {
      callout = {
        type: oneOf(c.type, CALLOUT_TYPES, `${label} callout type`),
        text: calloutText,
      }
    }
  }
  return {
    heading: text(raw.heading, `${label} heading`, 160),
    paragraphs: list(raw.paragraphs, `${label} paragraphs`, 40, 5000),
    points: list(raw.points, `${label} key points`, 30, 600),
    callout,
  }
}

export type ParseResult =
  | { ok: true; post: PostInput }
  | { ok: false; error: string }

/** Validates and normalises untrusted post data coming from the editor. */
export function parsePostInput(input: unknown): ParseResult {
  try {
    const raw = record(input, 'Post')
    const cover = record(raw.cover, 'Cover')

    const slug = text(raw.slug, 'URL slug', 100, true)
    if (!SLUG_PATTERN.test(slug)) {
      fail('URL slug can only contain lowercase letters, numbers and single hyphens.')
    }

    const date = text(raw.date, 'Published date', 10, true)
    if (!DATE_PATTERN.test(date) || Number.isNaN(new Date(date).getTime())) {
      fail('Published date is invalid.')
    }

    const readTime = raw.readTime ?? null
    if (
      readTime !== null &&
      (!Number.isInteger(readTime) || (readTime as number) < 1 || (readTime as number) > 120)
    ) {
      fail('Read time must be a whole number of minutes between 1 and 120.')
    }

    const icon = text(raw.icon, 'Card icon', 40, true)
    if (!(icon in POST_ICONS)) fail('Card icon is invalid.')

    const image = text(cover.image, 'Cover image', 500)
    if (image && !isValidCoverImage(image)) {
      fail('Cover image must be an uploaded image or an https:// URL.')
    }

    const accent = text(cover.accent, 'Accent colour', 7, true)
    if (!HEX_PATTERN.test(accent)) fail('Accent colour must be a hex colour like #22d3ee.')

    if (!Array.isArray(raw.sections)) fail('Sections are invalid.')
    if (raw.sections.length > 60) fail('An article can have at most 60 sections.')
    const sections = raw.sections
      .map(section)
      .filter((s) => s.heading || s.paragraphs.length || s.points.length || s.callout)

    const tags = Array.from(
      new Map(
        list(raw.tags, 'Tags', 12, 32).map((tag) => [tag.toLowerCase(), tag])
      ).values()
    )

    const post: PostInput = {
      slug,
      title: text(raw.title, 'Title', 160, true),
      excerpt: text(raw.excerpt, 'Excerpt', 400, true),
      intro: text(raw.intro, 'Introduction', 1000),
      category: text(raw.category, 'Category', 40, true),
      icon,
      date,
      readTime: readTime as number | null,
      cover: {
        image,
        motif: oneOf(cover.motif, COVER_MOTIFS, 'Cover style'),
        label: text(cover.label, 'Cover label', 40),
        accent: accent.toLowerCase(),
      },
      tags,
      takeaways: list(raw.takeaways, 'Key takeaways', 10, 300),
      sections,
      conclusion: text(raw.conclusion, 'Conclusion', 5000),
    }

    if (!sections.some((s) => s.paragraphs.length)) {
      fail('Add at least one paragraph to the article body.')
    }

    return { ok: true, post }
  } catch (error) {
    if (error instanceof ValidationError) return { ok: false, error: error.message }
    throw error
  }
}

/** Identifies an uploaded image from its leading bytes; never trusts the client MIME type. */
export function sniffImageExtension(bytes: Uint8Array): string | null {
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...Array.from(bytes.subarray(start, end)))
  if (bytes.length < 12) return null
  if (bytes[0] === 0x89 && ascii(1, 4) === 'PNG') return 'png'
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg'
  if (ascii(0, 4) === 'GIF8') return 'gif'
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'webp'
  if (ascii(4, 8) === 'ftyp' && ['avif', 'avis'].includes(ascii(8, 12))) return 'avif'
  return null
}
