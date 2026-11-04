'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle,
  CloudUpload,
  Eye,
  FileCheck,
  FileEdit,
  Globe,
  ImageIcon,
  LoaderCircle,
  Plus,
  Save,
  Send,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from 'lucide-react'
import BlogCard from '@/components/BlogCard'
import { checkSlugAction, savePostAction } from '@/app/secure-blog/actions'
import { POST_ICON_NAMES, getPostIcon } from '@/lib/blog/icons'
import {
  ACCENT_PRESETS,
  CALLOUT_TYPES,
  CATEGORY_SUGGESTIONS,
  DEFAULT_ACCENT,
  MAX_UPLOAD_BYTES,
  UPLOAD_MIME_TYPES,
  type CalloutType,
  type CoverMotif,
  type Post,
  type PostInput,
  type PostStatus,
} from '@/lib/blog/types'
import { estimateReadingTime, slugify, toLines } from '@/lib/blog/utils'
import {
  hintClass,
  iconButtonClass,
  inputClass,
  labelClass,
  panelClass,
  primaryButtonClass,
  secondaryButtonClass,
  selectClass,
  textareaClass,
} from './styles'

/* ------------------------------------------------------------------ */
/* Types & Defaults                                                   */
/* ------------------------------------------------------------------ */

interface SectionDraft {
  key: number
  heading: string
  paragraphs: string
  points: string
  calloutType: CalloutType | 'none'
  calloutText: string
}

interface TakeawayDraft {
  key: number
  text: string
}

interface Draft {
  title: string
  slug: string
  excerpt: string
  intro: string
  category: string
  icon: string
  date: string
  readTime: string
  coverImage: string
  coverMotif: CoverMotif
  coverLabel: string
  accent: string
  tags: string[]
  takeaways: TakeawayDraft[]
  sections: SectionDraft[]
  conclusion: string
  status: PostStatus
}

let keyCounter = 0
const getNextKey = () => ++keyCounter

function emptySection(): SectionDraft {
  return {
    key: getNextKey(),
    heading: '',
    paragraphs: '',
    points: '',
    calloutType: 'none',
    calloutText: '',
  }
}

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10)
}

function postToDraft(post: Post | null): Draft {
  if (!post) {
    return {
      title: '',
      slug: '',
      excerpt: '',
      intro: '',
      category: CATEGORY_SUGGESTIONS[0],
      icon: POST_ICON_NAMES[0],
      date: getTodayString(),
      readTime: '',
      coverImage: '',
      coverMotif: 'network',
      coverLabel: '',
      accent: DEFAULT_ACCENT,
      tags: [],
      takeaways: [{ key: getNextKey(), text: '' }],
      sections: [emptySection()],
      conclusion: '',
      status: 'published',
    }
  }

  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    intro: post.intro,
    category: post.category,
    icon: post.icon,
    date: post.date || getTodayString(),
    readTime: post.readTime ? String(post.readTime) : '',
    coverImage: post.cover?.image || post.cover_image_url || '',
    coverMotif: post.cover?.motif ?? 'network',
    coverLabel: post.cover?.label ?? '',
    accent: post.cover?.accent ?? DEFAULT_ACCENT,
    tags: Array.isArray(post.tags) ? post.tags : [],
    takeaways: (post.takeaways || []).map((text) => ({ key: getNextKey(), text })),
    sections: (post.sections || []).map((section) => ({
      key: getNextKey(),
      heading: section.heading,
      paragraphs: section.paragraphs.join('\n'),
      points: section.points.join('\n'),
      calloutType: section.callout?.type ?? 'none',
      calloutText: section.callout?.text ?? '',
    })),
    conclusion: post.conclusion,
    status: post.status === 'draft' ? 'draft' : 'published',
  }
}

export default function PostEditor({ post = null }: { post?: Post | null }) {
  const router = useRouter()
  const isEditing = Boolean(post)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [draft, setDraft] = useState<Draft>(() => postToDraft(post))
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(isEditing)
  const [tagInput, setTagInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveActionType, setSaveActionType] = useState<PostStatus>('published')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')

  // Auto-slugify when title changes (unless manually edited)
  const handleTitleChange = (newTitle: string) => {
    setDraft((prev) => ({
      ...prev,
      title: newTitle,
      slug: slugManuallyEdited ? prev.slug : slugify(newTitle),
    }))
  }

  // Check slug uniqueness with debounce
  useEffect(() => {
    if (!draft.slug) {
      setSlugStatus('idle')
      return
    }

    setSlugStatus('checking')
    const timer = setTimeout(async () => {
      try {
        const { available } = await checkSlugAction(draft.slug, post?.id)
        setSlugStatus(available ? 'available' : 'taken')
      } catch {
        setSlugStatus('idle')
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [draft.slug, post?.id])

  // Handle secure image upload via server API (uploads to S3 without browser CORS issues)
  const handleFileUpload = async (file: File) => {
    if (file.size > MAX_UPLOAD_BYTES) {
      setErrorMessage('Image file must be 5 MB or smaller.')
      return
    }

    if (!UPLOAD_MIME_TYPES.includes(file.type.toLowerCase())) {
      setErrorMessage('Allowed image formats: JPEG, PNG, WEBP, GIF, AVIF.')
      return
    }

    setUploading(true)
    setUploadProgress('Uploading cover image...')
    setErrorMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/blog/admin/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload image.')
      }

      setDraft((prev) => ({
        ...prev,
        coverImage: data.canonicalUrl,
      }))
      setUploadProgress(null)
      if (data.storage === 'local' && data.warning) {
        setSuccessMessage(`Cover image saved locally (${data.warning})`)
      } else {
        setSuccessMessage('Cover image uploaded to AWS S3 successfully!')
      }
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch (err: unknown) {
      console.error('Image upload error:', err)
      setErrorMessage((err as Error).message || 'Failed to upload cover image.')
      setUploadProgress(null)
    } finally {
      setUploading(false)
    }
  }

  // Tag management
  const addTag = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || draft.tags.includes(trimmed)) return
    setDraft((prev) => ({ ...prev, tags: [...prev.tags, trimmed] }))
    setTagInput('')
  }

  const removeTag = (tagToRemove: string) => {
    setDraft((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagToRemove),
    }))
  }

  // Section management
  const addSection = () => {
    setDraft((prev) => ({
      ...prev,
      sections: [...prev.sections, emptySection()],
    }))
  }

  const removeSection = (key: number) => {
    if (draft.sections.length <= 1) return
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.key !== key),
    }))
  }

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= draft.sections.length) return
    const newSections = [...draft.sections]
    const temp = newSections[index]
    newSections[index] = newSections[targetIndex]
    newSections[targetIndex] = temp
    setDraft((prev) => ({ ...prev, sections: newSections }))
  }

  // Takeaway management
  const addTakeaway = () => {
    setDraft((prev) => ({
      ...prev,
      takeaways: [...prev.takeaways, { key: getNextKey(), text: '' }],
    }))
  }

  const removeTakeaway = (key: number) => {
    setDraft((prev) => ({
      ...prev,
      takeaways: prev.takeaways.filter((t) => t.key !== key),
    }))
  }

  // Preview Post Object for live preview
  const previewPost: Post = useMemo(() => {
    const readTimeInt = Number.parseInt(draft.readTime, 10)
    return {
      id: post?.id || 'preview',
      slug: slugify(draft.slug) || 'slug-preview',
      title: draft.title || 'Your Article Title Goes Here',
      excerpt: draft.excerpt || 'Write a compelling excerpt describing your article...',
      intro: draft.intro,
      category: draft.category || 'Enterprise AI',
      icon: draft.icon || 'ShieldCheck',
      date: draft.date || getTodayString(),
      readTime: !isNaN(readTimeInt) && readTimeInt > 0 ? readTimeInt : null,
      cover: {
        image: draft.coverImage,
        motif: draft.coverMotif,
        label: draft.coverLabel || draft.category,
        accent: draft.accent,
      },
      cover_image_url: draft.coverImage,
      tags: draft.tags,
      takeaways: draft.takeaways.map((t) => t.text).filter(Boolean),
      sections: draft.sections.map((s) => ({
        heading: s.heading,
        paragraphs: toLines(s.paragraphs),
        points: toLines(s.points),
        callout: s.calloutType !== 'none' && s.calloutText ? { type: s.calloutType, text: s.calloutText } : null,
      })),
      conclusion: draft.conclusion,
      status: draft.status,
      updatedAt: new Date().toISOString(),
    }
  }, [draft, post?.id])

  // Save handler (Draft or Publish)
  const handleSave = async (statusToSet: PostStatus) => {
    setSaving(true)
    setSaveActionType(statusToSet)
    setErrorMessage(null)

    const finalSlug = slugify(draft.slug)
    if (!finalSlug) {
      setErrorMessage('Please provide a valid URL slug.')
      setSaving(false)
      return
    }

    if (!draft.title.trim()) {
      setErrorMessage('Please enter an article title.')
      setSaving(false)
      return
    }

    const readTimeNum = Number.parseInt(draft.readTime, 10)
    const input: PostInput = {
      slug: finalSlug,
      title: draft.title.trim(),
      excerpt: draft.excerpt.trim(),
      intro: draft.intro.trim(),
      category: draft.category.trim() || 'General',
      icon: draft.icon,
      date: draft.date || getTodayString(),
      readTime: !isNaN(readTimeNum) && readTimeNum > 0 ? readTimeNum : null,
      cover: {
        image: draft.coverImage.trim(),
        motif: draft.coverMotif,
        label: draft.coverLabel.trim(),
        accent: draft.accent,
      },
      cover_image_url: draft.coverImage.trim(),
      tags: draft.tags,
      takeaways: draft.takeaways.map((t) => t.text.trim()).filter(Boolean),
      sections: draft.sections.map((section) => ({
        heading: section.heading.trim(),
        paragraphs: toLines(section.paragraphs),
        points: toLines(section.points),
        callout:
          section.calloutType !== 'none' && section.calloutText.trim()
            ? { type: section.calloutType, text: section.calloutText.trim() }
            : null,
      })),
      conclusion: toLines(draft.conclusion).join('\n'),
      status: statusToSet,
    }

    try {
      const result = await savePostAction(post?.id ?? null, input)
      if (!result.ok) {
        setErrorMessage(result.error)
        setSaving(false)
        return
      }

      setSuccessMessage(
        statusToSet === 'published'
          ? 'Article published successfully to live website!'
          : 'Draft saved successfully.'
      )

      setTimeout(() => {
        router.push('/secure-blog')
        router.refresh()
      }, 800)
    } catch (err: unknown) {
      console.error('Save error:', err)
      setErrorMessage((err as Error).message || 'Failed to save blog post to PostgreSQL.')
      setSaving(false)
    }
  }

  return (
    <div className="pb-24">
      {/* Top Header & Actions Bar */}
      <div className={`p-5 sm:p-6 mb-8 ${panelClass} sticky top-20 z-30 backdrop-blur-md bg-white/95 dark:bg-slate-900/95`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/secure-blog"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Back to dashboard"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {isEditing ? 'Edit Blog Article' : 'Add New Blog'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEditing ? `Editing "${post?.title}"` : 'Create and publish articles directly to PostgreSQL & S3'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/secure-blog"
              className={secondaryButtonClass}
            >
              Cancel
            </Link>

            {/* Save as Draft */}
            <button
              type="button"
              disabled={saving || uploading}
              onClick={() => handleSave('draft')}
              className={`${secondaryButtonClass} border-amber-300/50 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30`}
            >
              {saving && saveActionType === 'draft' ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              <span>Save as Draft</span>
            </button>

            {/* Publish */}
            <button
              type="button"
              disabled={saving || uploading}
              onClick={() => handleSave('published')}
              className={primaryButtonClass}
            >
              {saving && saveActionType === 'published' ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              <span>Publish Article</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-sm text-red-600 dark:text-red-400 flex items-center gap-3">
          <TriangleAlert size={18} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-3">
          <CheckCircle size={18} className="shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
        {/* Left Column: Form Cards */}
        <div className="space-y-8 min-w-0">
          {/* Card 1: Basic Information */}
          <section className={`p-6 sm:p-7 ${panelClass}`}>
            <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-5 flex items-center gap-2">
              <FileEdit size={18} className="text-blue-500" />
              Basic Information
            </h2>

            <div className="space-y-5">
              {/* Title */}
              <div>
                <label className={labelClass}>Article Title *</label>
                <input
                  type="text"
                  value={draft.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. Enterprise AI Security in Production"
                  required
                  className={inputClass}
                />
              </div>

              {/* Slug with Real-Time Validation */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={labelClass}>URL Slug *</label>
                  {draft.slug && (
                    <span className="text-xs font-mono">
                      {slugStatus === 'checking' && <span className="text-slate-400">Checking...</span>}
                      {slugStatus === 'available' && (
                        <span className="text-emerald-500 font-semibold flex items-center gap-1">
                          <CheckCircle size={12} /> Slug available
                        </span>
                      )}
                      {slugStatus === 'taken' && (
                        <span className="text-red-500 font-semibold flex items-center gap-1">
                          <TriangleAlert size={12} /> Slug already in use
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                  <span className="pl-4 pr-1 text-xs text-slate-400 font-mono select-none">
                    /blog/
                  </span>
                  <input
                    type="text"
                    value={draft.slug}
                    onChange={(e) => {
                      setSlugManuallyEdited(true)
                      setDraft((prev) => ({ ...prev, slug: slugify(e.target.value) }))
                    }}
                    placeholder="enterprise-ai-security"
                    className="flex-1 py-2.5 pr-4 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none font-mono"
                  />
                </div>
                <p className={hintClass}>
                  Generated automatically from the title. You can customize it anytime.
                </p>
              </div>

              {/* Excerpt */}
              <div>
                <label className={labelClass}>Excerpt (Article Summary) *</label>
                <textarea
                  rows={3}
                  value={draft.excerpt}
                  onChange={(e) => setDraft((prev) => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="A concise summary of the article for blog cards and search engine previews..."
                  className={textareaClass}
                />
              </div>

              {/* Intro / Lead Quote */}
              <div>
                <label className={labelClass}>Introduction Lead (Italic Quote)</label>
                <textarea
                  rows={2}
                  value={draft.intro}
                  onChange={(e) => setDraft((prev) => ({ ...prev, intro: e.target.value }))}
                  placeholder="An opening thesis or thought-provoking lead statement..."
                  className={textareaClass}
                />
              </div>

              {/* Category, Date & Read Time Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Category *</label>
                  <select
                    value={draft.category}
                    onChange={(e) => setDraft((prev) => ({ ...prev, category: e.target.value }))}
                    className={selectClass}
                  >
                    {CATEGORY_SUGGESTIONS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Publication Date</label>
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(e) => setDraft((prev) => ({ ...prev, date: e.target.value }))}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Read Time (Minutes)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder={`Auto (${estimateReadingTime(previewPost)}m)`}
                    value={draft.readTime}
                    onChange={(e) => setDraft((prev) => ({ ...prev, readTime: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <label className={labelClass}>Publication Status</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, status: 'published' }))}
                    className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                      draft.status === 'published'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    <CheckCircle size={14} />
                    <span>Published</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, status: 'draft' }))}
                    className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                      draft.status === 'draft'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    <FileEdit size={14} />
                    <span>Draft</span>
                  </button>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className={labelClass}>Article Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {draft.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 text-xs font-semibold text-blue-700 dark:text-blue-300"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-blue-400 hover:text-blue-700 dark:hover:text-white"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTag(tagInput)
                      }
                    }}
                    placeholder="Add a tag and press Enter (e.g. RAG, GenAI, Security)..."
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => addTag(tagInput)}
                    className={secondaryButtonClass}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Card 2: Cover Image & AWS S3 Upload */}
          <section className={`p-6 sm:p-7 ${panelClass}`}>
            <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-5 flex items-center gap-2">
              <ImageIcon size={18} className="text-blue-500" />
              Cover Image (AWS S3)
            </h2>

            <div className="space-y-5">
              {/* Dropzone Upload */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  if (e.dataTransfer.files?.[0]) {
                    handleFileUpload(e.dataTransfer.files[0])
                  }
                }}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
                  uploading
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                    : 'border-slate-300 dark:border-slate-700 hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-950/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileUpload(e.target.files[0])
                    }
                  }}
                />

                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto mb-3">
                  {uploading ? (
                    <LoaderCircle size={22} className="animate-spin" />
                  ) : (
                    <CloudUpload size={22} />
                  )}
                </div>

                <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                  {uploading ? uploadProgress : 'Click to upload or drag and drop image'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  PNG, JPEG, WebP, GIF up to 5 MB &bull; Uploads directly to bucket blogs-neo
                </p>
              </div>

              {/* S3 Image URL input (auto-populated or manual override) */}
              <div>
                <label className={labelClass}>Direct S3 Image URL</label>
                <input
                  type="url"
                  value={draft.coverImage}
                  onChange={(e) => setDraft((prev) => ({ ...prev, coverImage: e.target.value }))}
                  placeholder="https://blogs-neo.s3.ap-south-1.amazonaws.com/blogs/..."
                  className={inputClass}
                />
                <p className={hintClass}>
                  Populated automatically upon upload. Local paths and external HTTPS images are also supported.
                </p>
              </div>

              {/* Fallback Artwork Settings (accent, motif, icon) */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                  Fallback Visual Design (When no custom image is set)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Accent Presets */}
                  <div>
                    <label className={labelClass}>Accent Color</label>
                    <div className="flex items-center gap-2">
                      {ACCENT_PRESETS.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setDraft((prev) => ({ ...prev, accent: p.value }))}
                          style={{ backgroundColor: p.value }}
                          className={`w-6 h-6 rounded-full border-2 transition ${
                            draft.accent === p.value ? 'scale-110 border-white' : 'border-transparent'
                          }`}
                          title={p.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Motif */}
                  <div>
                    <label className={labelClass}>Geometric Motif</label>
                    <select
                      value={draft.coverMotif}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, coverMotif: e.target.value as CoverMotif }))
                      }
                      className={selectClass}
                    >
                      <option value="network">Network Grid</option>
                      <option value="pipeline">Data Pipeline</option>
                      <option value="trace">Trace Analytics</option>
                    </select>
                  </div>

                  {/* Icon */}
                  <div>
                    <label className={labelClass}>Theme Icon</label>
                    <select
                      value={draft.icon}
                      onChange={(e) => setDraft((prev) => ({ ...prev, icon: e.target.value }))}
                      className={selectClass}
                    >
                      {POST_ICON_NAMES.map((iconName) => (
                        <option key={iconName} value={iconName}>
                          {iconName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Card 3: Key Takeaways */}
          <section className={`p-6 sm:p-7 ${panelClass}`}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <FileCheck size={18} className="text-blue-500" />
                Key Architectural Takeaways
              </h2>
              <button
                type="button"
                onClick={addTakeaway}
                className={`text-xs ${secondaryButtonClass} py-1.5 px-3`}
              >
                <Plus size={14} />
                Add Point
              </button>
            </div>

            <div className="space-y-3">
              {draft.takeaways.map((item, index) => (
                <div key={item.key} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => {
                      const newText = e.target.value
                      setDraft((prev) => ({
                        ...prev,
                        takeaways: prev.takeaways.map((t) =>
                          t.key === item.key ? { ...t, text: newText } : t
                        ),
                      }))
                    }}
                    placeholder="Enter an important key takeaway point..."
                    className={inputClass}
                  />
                  {draft.takeaways.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTakeaway(item.key)}
                      className={iconButtonClass}
                      title="Remove point"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Card 4: Article Sections */}
          <section className={`p-6 sm:p-7 ${panelClass}`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Article Sections
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Organize your article into modular headings, paragraphs, bullet lists, and callout boxes.
                </p>
              </div>
              <button
                type="button"
                onClick={addSection}
                className={primaryButtonClass}
              >
                <Plus size={15} />
                Add Section
              </button>
            </div>

            <div className="space-y-6">
              {draft.sections.map((section, idx) => (
                <div
                  key={section.key}
                  className="p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-4"
                >
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      Section {idx + 1}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveSection(idx, 'up')}
                        className={`${iconButtonClass} p-1.5 disabled:opacity-30`}
                        title="Move Up"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === draft.sections.length - 1}
                        onClick={() => moveSection(idx, 'down')}
                        className={`${iconButtonClass} p-1.5 disabled:opacity-30`}
                        title="Move Down"
                      >
                        <ArrowDown size={14} />
                      </button>
                      {draft.sections.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSection(section.key)}
                          className={`${iconButtonClass} p-1.5 text-red-500 hover:text-red-700`}
                          title="Delete Section"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Section Heading */}
                  <div>
                    <label className={labelClass}>Section Heading</label>
                    <input
                      type="text"
                      value={section.heading}
                      onChange={(e) => {
                        const val = e.target.value
                        setDraft((prev) => ({
                          ...prev,
                          sections: prev.sections.map((s) =>
                            s.key === section.key ? { ...s, heading: val } : s
                          ),
                        }))
                      }}
                      placeholder="e.g. 1. Fragile ingestion pipelines in production"
                      className={inputClass}
                    />
                  </div>

                  {/* Paragraphs */}
                  <div>
                    <label className={labelClass}>Paragraphs (Enter each paragraph on a new line)</label>
                    <textarea
                      rows={4}
                      value={section.paragraphs}
                      onChange={(e) => {
                        const val = e.target.value
                        setDraft((prev) => ({
                          ...prev,
                          sections: prev.sections.map((s) =>
                            s.key === section.key ? { ...s, paragraphs: val } : s
                          ),
                        }))
                      }}
                      placeholder="Write your article narrative here. Use **bold** for emphasized text..."
                      className={textareaClass}
                    />
                  </div>

                  {/* Bullet Points */}
                  <div>
                    <label className={labelClass}>Bullet Points (Optional - 1 per line)</label>
                    <textarea
                      rows={2}
                      value={section.points}
                      onChange={(e) => {
                        const val = e.target.value
                        setDraft((prev) => ({
                          ...prev,
                          sections: prev.sections.map((s) =>
                            s.key === section.key ? { ...s, points: val } : s
                          ),
                        }))
                      }}
                      placeholder="Bullet point item 1&#10;Bullet point item 2"
                      className={textareaClass}
                    />
                  </div>

                  {/* Callout box */}
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3">
                    <div>
                      <label className={labelClass}>Callout Box</label>
                      <select
                        value={section.calloutType}
                        onChange={(e) => {
                          const val = e.target.value as SectionDraft['calloutType']
                          setDraft((prev) => ({
                            ...prev,
                            sections: prev.sections.map((s) =>
                              s.key === section.key ? { ...s, calloutType: val } : s
                            ),
                          }))
                        }}
                        className={selectClass}
                      >
                        <option value="none">None</option>
                        <option value="info">Info note</option>
                        <option value="tip">Pro tip</option>
                        <option value="warning">Warning</option>
                        <option value="quote">Pull quote</option>
                      </select>
                    </div>

                    {section.calloutType !== 'none' && (
                      <div>
                        <label className={labelClass}>Callout Content</label>
                        <input
                          type="text"
                          value={section.calloutText}
                          onChange={(e) => {
                            const val = e.target.value
                            setDraft((prev) => ({
                              ...prev,
                              sections: prev.sections.map((s) =>
                                s.key === section.key ? { ...s, calloutText: val } : s
                              ),
                            }))
                          }}
                          placeholder="Highlight key takeaway, caution, or architectural quote..."
                          className={inputClass}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Card 5: Conclusion */}
          <section className={`p-6 sm:p-7 ${panelClass}`}>
            <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
              Conclusion
            </h2>
            <textarea
              rows={4}
              value={draft.conclusion}
              onChange={(e) => setDraft((prev) => ({ ...prev, conclusion: e.target.value }))}
              placeholder="Wrap up the article with strategic takeaways or final engineering guidance..."
              className={textareaClass}
            />
          </section>
        </div>

        {/* Right Column: Live Card Preview & Publishing Summary */}
        <aside className="sticky top-44 space-y-6">
          {/* Card Preview */}
          <div className={`p-5 ${panelClass}`}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Eye size={14} className="text-blue-500" />
                Live Card Preview
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                /blog
              </span>
            </div>

            <div className="pointer-events-none">
              <BlogCard post={previewPost} preview />
            </div>
          </div>

          {/* Publishing Meta Information */}
          <div className={`p-5 ${panelClass} text-xs space-y-3`}>
            <p className="font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-2">
              Publishing Meta
            </p>

            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Status:</span>
              <span
                className={`font-semibold capitalize px-2 py-0.5 rounded ${
                  draft.status === 'published'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                {draft.status}
              </span>
            </div>

            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Estimated read time:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {estimateReadingTime(previewPost)} min
              </span>
            </div>

            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Article sections:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {draft.sections.length}
              </span>
            </div>

            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Cover Image:</span>
              <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[150px]">
                {draft.coverImage ? (draft.coverImage.includes('s3') ? 'AWS S3' : draft.coverImage.startsWith('/uploads') ? 'Local' : 'External') : 'Generated'}
              </span>
            </div>

            {isEditing && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between text-slate-400">
                <span>Database ID:</span>
                <span className="font-mono text-[10px] truncate max-w-[150px]">{post?.id}</span>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
