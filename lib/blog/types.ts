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
  /** ISO date, e.g. 2026-04-01 */
  date: string
  /** Minutes; null uses the estimate calculated from the word count */
  readTime: number | null
  cover: {
    /** Uploaded (/api/blog/media/...) or external image; empty uses the generated cover */
    image: string
    /** Generated cover art — not editable in the form, kept for existing posts */
    motif: CoverMotif
    /** Falls back to the category when empty */
    label: string
    /** Hex colour for the generated cover art */
    accent: string
  }
  tags: string[]
  takeaways: string[]
  sections: PostSection[]
  /** Paragraphs separated by new lines */
  conclusion: string
  updatedAt: string
}

export type PostInput = Omit<Post, 'id' | 'updatedAt'>

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
  'ERP Innovation',
]

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
export const UPLOAD_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
]
