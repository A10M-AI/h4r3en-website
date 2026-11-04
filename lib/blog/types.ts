// Shared by server code and client components — keep free of Node imports.

export const COVER_MOTIFS = ['network', 'pipeline', 'trace'] as const
export type CoverMotif = (typeof COVER_MOTIFS)[number]

export const CALLOUT_TYPES = ['info', 'tip', 'warning', 'quote'] as const
export type CalloutType = (typeof CALLOUT_TYPES)[number]

export interface PostSection {
  /** Optional — a section without a heading continues the previous one */
  heading: string
  paragraphs: string[]
  points: string[]
  callout: { type: CalloutType; text: string } | null
}

export type PostStatus = 'draft' | 'published'

// Inline **bold** is supported in paragraphs, points, callouts, takeaways and the conclusion.
export interface Post {
  id: string
  slug: string
  title: string
  excerpt: string
  /** Optional italic lead quote shown at the start of the article */
  intro: string
  category: string
  /** Name from POST_ICONS in lib/blog/icons.ts */
  icon: string
  /** ISO date string, e.g. 2026-04-01 */
  date: string
  /** Reading time in minutes; null or 0 uses the estimate calculated from the word count */
  readTime: number | null
  cover: {
    /** Uploaded S3 URL or external image; empty uses generated cover art */
    image: string
    /** Generated cover art motif */
    motif: CoverMotif
    /** Cover art label; falls back to category when empty */
    label: string
    /** Hex color for generated cover art */
    accent: string
  }
  cover_image_url?: string
  tags: string[]
  takeaways: string[]
  sections: PostSection[]
  /** Paragraphs separated by new lines */
  conclusion: string
  status: PostStatus
  published_at?: string
  created_at?: string
  updatedAt: string
}

export type PostInput = Omit<Post, 'id' | 'updatedAt' | 'created_at'>

export const DEFAULT_ACCENT = '#22d3ee'

export const ACCENT_PRESETS = [
  { name: 'Cyan', value: '#22d3ee' },
  { name: 'Blue', value: '#60a5fa' },
  { name: 'Indigo', value: '#818cf8' },
  { name: 'Violet', value: '#a78bfa' },
  { name: 'Emerald', value: '#34d399' },
  { name: 'Amber', value: '#fbbf24' },
]

export const CATEGORY_SUGGESTIONS = [
  'Enterprise AI',
  'RAG Architecture',
  'AI Engineering',
  'Product Strategy',
  'GenAI',
  'Data Governance',
  'Cloud & DevOps',
  'Tech Leadership',
  'Infrastructure',
]

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
export const UPLOAD_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
]

export const COVER_IMAGE_HOST = 'blogs-neo.s3.ap-south-1.amazonaws.com'

