import { MAX_UPLOAD_BYTES, UPLOAD_MIME_TYPES, type PostInput } from './types'

export function isValidCoverImage(url: string): boolean {
  if (!url) return true
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return url.startsWith('/')
  }
}

/** Check file magic numbers for png, jpeg, webp, gif, avif */
export function sniffImageExtension(bytes: Uint8Array): 'png' | 'jpg' | 'webp' | 'gif' | 'avif' | null {
  if (bytes.length < 12) return null

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'png'
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpg'
  }

  // GIF: 47 49 46 38
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return 'gif'
  }

  // WEBP: RIFF .... WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'webp'
  }

  // AVIF: .... ftypavif or ftypavis
  if (
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70 &&
    bytes[8] === 0x61 &&
    bytes[9] === 0x76 &&
    bytes[10] === 0x69
  ) {
    return 'avif'
  }

  return null
}

export interface ValidationError {
  field: string
  message: string
}

export function validatePostInput(input: PostInput): ValidationError[] {
  const errors: ValidationError[] = []

  if (!input.title || input.title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Title is required.' })
  } else if (input.title.length > 500) {
    errors.push({ field: 'title', message: 'Title must be 500 characters or fewer.' })
  }

  if (!input.slug || input.slug.trim().length === 0) {
    errors.push({ field: 'slug', message: 'Slug is required.' })
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) {
    errors.push({
      field: 'slug',
      message: 'Slug must contain only lowercase alphanumeric characters and hyphens.',
    })
  } else if (input.slug.length > 255) {
    errors.push({ field: 'slug', message: 'Slug must be 255 characters or fewer.' })
  }

  if (input.cover?.image && !isValidCoverImage(input.cover.image)) {
    errors.push({ field: 'cover', message: 'Cover image must be a valid HTTPS URL.' })
  }

  if (input.status !== 'published' && input.status !== 'draft') {
    errors.push({ field: 'status', message: "Status must be either 'draft' or 'published'." })
  }

  return errors
}
