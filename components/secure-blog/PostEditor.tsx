'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CircleCheck,
  CloudUpload,
  Download,
  Eye,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react'
import BlogCard from '@/components/BlogCard'
import { savePostAction } from '@/app/secure-blog/actions'
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
} from '@/lib/blog/types'
import { estimateReadingTime, slugify, toLines } from '@/lib/blog/utils'
import { isValidCoverImage } from '@/lib/blog/validate'
import {
  hintClass,
  iconButtonClass,
  inputClass,
  labelClass,
  panelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from './styles'

/* ------------------------------------------------------------------ */
/* Editor state                                                        */
/* ------------------------------------------------------------------ */

interface SectionDraft {
  key: number
  heading: string
  /** One paragraph per line */
  paragraphs: string
  /** One bullet point per line */
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
  /** Digits only; empty uses the calculated estimate */
  readTime: string
  coverImage: string
  // Not editable in the form — preserved so existing covers don't change.
  coverMotif: CoverMotif
  coverLabel: string
  accent: string
  tags: string[]
  takeaways: TakeawayDraft[]
  sections: SectionDraft[]
  conclusion: string
}

const MAX_TAGS = 12
const MAX_TAKEAWAYS = 10

const CALLOUT_LABELS: Record<SectionDraft['calloutType'], string> = {
  none: 'None',
  info: 'Info note',
  tip: 'Tip',
  warning: 'Warning',
  quote: 'Pull quote',
}

// List keys only need to be unique within this page.
let lastKey = 0
const nextKey = () => ++lastKey

function emptySection(): SectionDraft {
  return {
    key: nextKey(),
    heading: '',
    paragraphs: '',
    points: '',
    calloutType: 'none',
    calloutText: '',
  }
}

function toDraft(post: Post | null, today: string): Draft {
  if (!post) {
    return {
      title: '',
      slug: '',
      excerpt: '',
      intro: '',
      category: CATEGORY_SUGGESTIONS[0],
      icon: POST_ICON_NAMES[0],
      date: today,
      readTime: '',
      coverImage: '',
      coverMotif: 'network',
      coverLabel: '',
      accent: DEFAULT_ACCENT,
      tags: [],
      takeaways: [{ key: nextKey(), text: '' }],
      sections: [emptySection()],
      conclusion: '',
    }
  }
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    intro: post.intro,
    category: post.category,
    icon: post.icon,
    date: post.date,
    readTime: post.readTime ? String(post.readTime) : '',
    coverImage: post.cover.image,
    coverMotif: post.cover.motif,
    coverLabel: post.cover.label,
    accent: post.cover.accent,
    tags: post.tags,
    takeaways: post.takeaways.map((text) => ({ key: nextKey(), text })),
    sections: post.sections.map((section) => ({
      key: nextKey(),
      heading: section.heading,
      paragraphs: section.paragraphs.join('\n'),
      points: section.points.join('\n'),
      calloutType: section.callout?.type ?? 'none',
      calloutText: section.callout?.text ?? '',
    })),
    conclusion: post.conclusion,
  }
}

function toInput(draft: Draft): PostInput {
  const readTime = Number.parseInt(draft.readTime, 10)
  return {
    slug: slugify(draft.slug),
    title: draft.title.trim(),
    excerpt: draft.excerpt.trim(),
    intro: draft.intro.trim(),
    category: draft.category.trim(),
    icon: draft.icon,
    date: draft.date,
    readTime: readTime > 0 ? readTime : null,
    cover: {
      image: draft.coverImage.trim(),
      motif: draft.coverMotif,
      label: draft.coverLabel.trim(),
      accent: draft.accent,
    },
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
  }
}

/** Lenient while typing; toInput() trims leading/trailing hyphens on save. */
function sanitizeSlugInput(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-/, '')
    .slice(0, 100)
}

function move<T>(items: T[], index: number, offset: number): T[] {
  const target = index + offset
  if (target < 0 || target >= items.length) return items
  const next = [...items]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

/* ------------------------------------------------------------------ */
/* Editor                                                              */
/* ------------------------------------------------------------------ */

interface PostEditorProps {
  post: Post | null
  today: string
  notice?: string
}

/** `content` is the serialised post the message refers to; it hides once edited. */
type Message = { type: 'success' | 'error'; text: string; content: string }

export default function PostEditor({ post, today, notice }: PostEditorProps) {
  const router = useRouter()
  const postId = post?.id ?? null
  const [initialDraft] = useState(() => toDraft(post, today))
  const [draft, setDraft] = useState(initialDraft)
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify(toInput(initialDraft))
  )
  const [slugTouched, setSlugTouched] = useState(Boolean(post))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<Message | null>(
    notice ? { type: 'success', text: notice, content: savedSnapshot } : null
  )

  const input = toInput(draft)
  const content = JSON.stringify(input)
  const dirty = content !== savedSnapshot
  const visibleMessage = message?.content === content ? message : null
  const estimate = estimateReadingTime(input)

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  const updateSection = (key: number, patch: Partial<SectionDraft>) =>
    setDraft((d) => ({
      ...d,
      sections: d.sections.map((s) => (s.key === key ? { ...s, ...patch } : s)),
    }))

  const updateTakeaway = (key: number, text: string) =>
    setDraft((d) => ({
      ...d,
      takeaways: d.takeaways.map((t) => (t.key === key ? { ...t, text } : t)),
    }))

  // Warn before closing the tab with unsaved work.
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  async function handleSave() {
    if (saving) return
    setSaving(true)
    setMessage(null)
    try {
      const result = await savePostAction(postId, input)
      if (!result.ok) {
        setMessage({ type: 'error', text: result.error, content })
        return
      }
      setSavedSnapshot(content)
      if (!postId) {
        router.replace(`/secure-blog/edit/${result.id}?created=1`)
        return
      }
      setMessage({
        type: 'success',
        text: 'Post saved and published.',
        content,
      })
      router.refresh()
    } catch {
      setMessage({
        type: 'error',
        text: 'Could not save. Check your connection and try again.',
        content,
      })
    } finally {
      setSaving(false)
    }
  }

  // Ctrl/Cmd + S saves.
  const saveRef = useRef(handleSave)
  saveRef.current = handleSave
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        saveRef.current()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function exportJson() {
    const data = JSON.stringify({ id: postId, ...input }, null, 2)
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${input.slug || 'untitled-post'}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  function removeSection(section: SectionDraft) {
    const hasContent =
      section.heading || section.paragraphs || section.points || section.calloutText
    if (hasContent && !window.confirm('Remove this section and its content?')) return
    setDraft((d) => ({ ...d, sections: d.sections.filter((s) => s.key !== section.key) }))
  }

  const previewPost = {
    ...input,
    title: input.title || 'Untitled Post',
    excerpt: input.excerpt || 'No excerpt yet. Add one in Basics & Metadata.',
    category: input.category || 'Uncategorised',
    cover: {
      ...input.cover,
      image: isValidCoverImage(input.cover.image) ? input.cover.image : '',
    },
  }

  const SelectedIcon = getPostIcon(draft.icon)

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Link
          href="/secure-blog"
          onClick={(event) => {
            if (dirty && !window.confirm('Leave without saving your changes?')) {
              event.preventDefault()
            }
          }}
          className={secondaryButtonClass}
        >
          <ArrowLeft size={16} />
          Back to All Blogs
        </Link>
        <p className="text-sm text-slate-500 dark:text-slate-400 min-w-0 truncate">
          {postId ? 'Now editing:' : 'New post:'}{' '}
          <span className="font-semibold text-slate-900 dark:text-white">
            {draft.title.trim() || 'Untitled Post'}
          </span>
        </p>
        {dirty && (
          <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-xs font-semibold">
            Unsaved changes
          </span>
        )}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-8 items-start">
        <div className="space-y-6 min-w-0">
          {/* Basics & Metadata */}
          <Panel
            title="Basics & Metadata"
            action={
              <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                {postId ? `ID: ${postId.slice(0, 8)}` : 'New post'}
              </span>
            }
          >
            <div className="space-y-5">
              <Field label="Post Title" htmlFor="title">
                <input
                  id="title"
                  value={draft.title}
                  maxLength={160}
                  onChange={(e) => {
                    const title = e.target.value
                    update(slugTouched ? { title } : { title, slug: slugify(title) })
                  }}
                  placeholder="Enter a compelling title…"
                  className={inputClass}
                />
              </Field>

              <Field
                label="URL Slug"
                htmlFor="slug"
                hint={`Public URL: /blog/${input.slug || 'your-post-slug'}`}
              >
                <input
                  id="slug"
                  value={draft.slug}
                  onChange={(e) => {
                    setSlugTouched(true)
                    update({ slug: sanitizeSlugInput(e.target.value) })
                  }}
                  placeholder="your-post-slug"
                  className={`${inputClass} font-mono`}
                />
              </Field>

              <Field
                label="Excerpt"
                htmlFor="excerpt"
                hint={`Shown on blog cards and social previews · ${draft.excerpt.length}/400`}
              >
                <textarea
                  id="excerpt"
                  rows={3}
                  maxLength={400}
                  value={draft.excerpt}
                  onChange={(e) => update({ excerpt: e.target.value })}
                  placeholder="Write a brief, engaging summary…"
                  className={`${inputClass} resize-y`}
                />
              </Field>

              <Field
                label="Introduction / Lead Quote"
                htmlFor="intro"
                hint="Optional italic quote shown at the start of the article, after the key takeaways."
              >
                <textarea
                  id="intro"
                  rows={3}
                  maxLength={1000}
                  value={draft.intro}
                  onChange={(e) => update({ intro: e.target.value })}
                  placeholder="Enter an introductory overview or opening hook…"
                  className={`${inputClass} resize-y`}
                />
              </Field>

              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Category" htmlFor="category" hint="Pick one or type your own.">
                  <input
                    id="category"
                    list="category-options"
                    maxLength={40}
                    value={draft.category}
                    onChange={(e) => update({ category: e.target.value })}
                    className={inputClass}
                  />
                  <datalist id="category-options">
                    {CATEGORY_SUGGESTIONS.map((category) => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                </Field>

                <Field label="Card Icon" htmlFor="icon" hint="Shown on the card and cover.">
                  <div className="relative">
                    <SelectedIcon
                      size={16}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 dark:text-blue-400 pointer-events-none"
                    />
                    <select
                      id="icon"
                      value={draft.icon}
                      onChange={(e) => update({ icon: e.target.value })}
                      className={`${inputClass} pl-11`}
                    >
                      {POST_ICON_NAMES.map((name) => (
                        <option key={name} value={name}>
                          {name.replace(/([a-z])([A-Z])/g, '$1 $2')}
                        </option>
                      ))}
                    </select>
                  </div>
                </Field>

                <Field label="Published Date" htmlFor="date">
                  <input
                    id="date"
                    type="date"
                    value={draft.date}
                    onChange={(e) => update({ date: e.target.value })}
                    className={inputClass}
                  />
                </Field>

                <Field
                  label="Read Time"
                  htmlFor="read-time"
                  hint={`Calculated estimate: ~${estimate} min read${
                    draft.readTime ? '' : ' (used while empty)'
                  }`}
                >
                  <div className="relative">
                    <input
                      id="read-time"
                      inputMode="numeric"
                      maxLength={3}
                      value={draft.readTime}
                      onChange={(e) =>
                        update({ readTime: e.target.value.replace(/\D/g, '') })
                      }
                      placeholder={String(estimate)}
                      className={`${inputClass} pr-24`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-slate-500 pointer-events-none">
                      min read
                    </span>
                  </div>
                </Field>
              </div>

              <Field label="Tags" htmlFor="tags" hint={`Used for search and SEO keywords · ${draft.tags.length}/${MAX_TAGS}`}>
                <TagInput tags={draft.tags} onChange={(tags) => update({ tags })} />
              </Field>
            </div>
          </Panel>

          {/* Cover */}
          <Panel
            title="Cover Design"
            description="Upload a cover image, or pick the accent colour of the generated cover art."
          >
            <div className="space-y-5">
              <div>
                <span className={labelClass}>Cover Image</span>
                <CoverImageField
                  value={draft.coverImage}
                  onChange={(coverImage) => update({ coverImage })}
                />
              </div>

              <div>
                <span className={labelClass}>Brand Accent</span>
                <div className="flex flex-wrap items-center gap-2.5">
                  {ACCENT_PRESETS.map(({ name, value }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => update({ accent: value })}
                      aria-label={`${name} accent`}
                      aria-pressed={draft.accent === value}
                      title={name}
                      className={`w-9 h-9 rounded-full border-2 transition-transform hover:scale-110 ${
                        draft.accent === value
                          ? 'border-slate-900 dark:border-white scale-110'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: value }}
                    />
                  ))}
                  <label className="inline-flex items-center gap-2 ml-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/70 bg-white dark:bg-slate-950/60 text-xs font-mono text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="color"
                      value={draft.accent}
                      onChange={(e) => update({ accent: e.target.value })}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent"
                      aria-label="Custom accent colour"
                    />
                    {draft.accent}
                  </label>
                </div>
                <p className={hintClass}>
                  Colours the generated cover art. Not used when a cover image is set.
                </p>
              </div>
            </div>
          </Panel>

          {/* Key takeaways */}
          <Panel
            title="Key Takeaways"
            description="Shown in a highlighted box at the top of the article."
            action={
              <button
                type="button"
                disabled={draft.takeaways.length >= MAX_TAKEAWAYS}
                onClick={() =>
                  update({ takeaways: [...draft.takeaways, { key: nextKey(), text: '' }] })
                }
                className={`${secondaryButtonClass} py-2`}
              >
                <Plus size={14} />
                Add Takeaway
              </button>
            }
          >
            {draft.takeaways.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No takeaways. The box is hidden on the article.
              </p>
            ) : (
              <ol className="space-y-3">
                {draft.takeaways.map((takeaway, index) => (
                  <li key={takeaway.key} className="flex gap-3">
                    <span className="mt-3 w-6 text-right text-sm font-semibold text-slate-400">
                      {index + 1}.
                    </span>
                    <textarea
                      rows={2}
                      maxLength={300}
                      value={takeaway.text}
                      onChange={(e) => updateTakeaway(takeaway.key, e.target.value)}
                      placeholder={`Key takeaway #${index + 1}…`}
                      aria-label={`Key takeaway ${index + 1}`}
                      className={`${inputClass} resize-y`}
                    />
                    <ItemControls
                      label={`takeaway ${index + 1}`}
                      isFirst={index === 0}
                      isLast={index === draft.takeaways.length - 1}
                      onMove={(offset) =>
                        update({ takeaways: move(draft.takeaways, index, offset) })
                      }
                      onRemove={() =>
                        update({
                          takeaways: draft.takeaways.filter((t) => t.key !== takeaway.key),
                        })
                      }
                    />
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          {/* Body sections */}
          <Panel
            title="Article Body Sections"
            description="Headings appear in the article's table of contents. The callout shows after the paragraphs, before the key points. Use **text** for bold."
            action={
              <button
                type="button"
                onClick={() => update({ sections: [...draft.sections, emptySection()] })}
                className={`${secondaryButtonClass} py-2`}
              >
                <Plus size={14} />
                Add Section
              </button>
            }
          >
            <div className="space-y-5">
              {draft.sections.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No sections yet. Add one to start writing.
                </p>
              )}
              {draft.sections.map((section, index) => (
                <div
                  key={section.key}
                  className="p-5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-950/40 space-y-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 shrink-0 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <input
                      value={section.heading}
                      maxLength={160}
                      onChange={(e) => updateSection(section.key, { heading: e.target.value })}
                      placeholder="Section heading (optional)"
                      aria-label={`Section ${index + 1} heading`}
                      className={`${inputClass} font-semibold`}
                    />
                    <ItemControls
                      horizontal
                      label={`section ${index + 1}`}
                      isFirst={index === 0}
                      isLast={index === draft.sections.length - 1}
                      onMove={(offset) =>
                        update({ sections: move(draft.sections, index, offset) })
                      }
                      onRemove={() => removeSection(section)}
                    />
                  </div>

                  <Field
                    label="Paragraphs"
                    htmlFor={`paragraphs-${section.key}`}
                    hint="One paragraph per line."
                  >
                    <textarea
                      id={`paragraphs-${section.key}`}
                      rows={6}
                      value={section.paragraphs}
                      onChange={(e) =>
                        updateSection(section.key, { paragraphs: e.target.value })
                      }
                      placeholder="Enter body text paragraphs…"
                      className={`${inputClass} resize-y leading-relaxed`}
                    />
                  </Field>

                  <Field
                    label="Key Points"
                    htmlFor={`points-${section.key}`}
                    hint="Optional bullet points. One point per line."
                  >
                    <textarea
                      id={`points-${section.key}`}
                      rows={3}
                      value={section.points}
                      onChange={(e) => updateSection(section.key, { points: e.target.value })}
                      placeholder="Optional bullet points…"
                      className={`${inputClass} resize-y`}
                    />
                  </Field>

                  <div className="grid sm:grid-cols-[180px_minmax(0,1fr)] gap-4">
                    <Field label="Callout Type" htmlFor={`callout-type-${section.key}`}>
                      <select
                        id={`callout-type-${section.key}`}
                        value={section.calloutType}
                        onChange={(e) =>
                          updateSection(section.key, {
                            calloutType: e.target.value as SectionDraft['calloutType'],
                          })
                        }
                        className={inputClass}
                      >
                        {(['none', ...CALLOUT_TYPES] as const).map((type) => (
                          <option key={type} value={type}>
                            {CALLOUT_LABELS[type]}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Callout Text" htmlFor={`callout-text-${section.key}`}>
                      <textarea
                        id={`callout-text-${section.key}`}
                        rows={2}
                        maxLength={1000}
                        disabled={section.calloutType === 'none'}
                        value={section.calloutText}
                        onChange={(e) =>
                          updateSection(section.key, { calloutText: e.target.value })
                        }
                        placeholder={
                          section.calloutType === 'none'
                            ? 'Choose a callout type first'
                            : 'Callout text…'
                        }
                        className={`${inputClass} resize-y`}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Conclusion */}
          <Panel title="Summary & Conclusion">
            <Field
              label="Conclusion & Takeaway"
              htmlFor="conclusion"
              hint="Shown in the “Summary & Takeaway” card at the end of the article. One paragraph per line."
            >
              <textarea
                id="conclusion"
                rows={4}
                maxLength={5000}
                value={draft.conclusion}
                onChange={(e) => update({ conclusion: e.target.value })}
                placeholder="Enter a concluding thought or final summary…"
                className={`${inputClass} resize-y leading-relaxed`}
              />
            </Field>
          </Panel>

          {/* Action bar */}
          <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-xl shadow-slate-900/10">
            <button type="button" onClick={exportJson} className={secondaryButtonClass}>
              <Download size={16} />
              Export JSON
            </button>

            <div className="flex-1 min-w-0 text-sm" aria-live="polite">
              {visibleMessage && (
                <p
                  className={`inline-flex items-start gap-2 ${
                    visibleMessage.type === 'success'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {visibleMessage.type === 'success' ? (
                    <CircleCheck size={16} className="shrink-0 mt-0.5" />
                  ) : (
                    <TriangleAlert size={16} className="shrink-0 mt-0.5" />
                  )}
                  {visibleMessage.text}
                </p>
              )}
            </div>

            {post && (
              <a
                href={`/blog/${post.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className={secondaryButtonClass}
              >
                <Eye size={16} />
                View
              </a>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              title="Save (Ctrl+S)"
              className={primaryButtonClass}
            >
              {saving ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Save Post
            </button>
          </div>
        </div>

        {/* Live preview */}
        <aside className="lg:sticky lg:top-24 space-y-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            <Eye size={14} />
            Live Card Preview
          </p>
          <BlogCard post={previewPost} preview />
        </aside>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className={`p-6 sm:p-7 ${panelClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-4 pb-5 mb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
          {description && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
      </label>
      {children}
      {hint && <p className={hintClass}>{hint}</p>}
    </div>
  )
}

function ItemControls({
  label,
  isFirst,
  isLast,
  onMove,
  onRemove,
  horizontal = false,
}: {
  label: string
  isFirst: boolean
  isLast: boolean
  onMove: (offset: number) => void
  onRemove: () => void
  horizontal?: boolean
}) {
  return (
    <div className={`flex gap-1.5 shrink-0 ${horizontal ? 'flex-row' : 'flex-col'}`}>
      <button
        type="button"
        disabled={isFirst}
        onClick={() => onMove(-1)}
        aria-label={`Move ${label} up`}
        className={iconButtonClass}
      >
        <ArrowUp size={14} />
      </button>
      <button
        type="button"
        disabled={isLast}
        onClick={() => onMove(1)}
        aria-label={`Move ${label} down`}
        className={iconButtonClass}
      >
        <ArrowDown size={14} />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className={`${iconButtonClass} hover:!text-red-600 dark:hover:!text-red-400 hover:!border-red-300 dark:hover:!border-red-800`}
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

function TagInput({
  tags,
  onChange,
}: {
  tags: string[]
  onChange: (tags: string[]) => void
}) {
  const [value, setValue] = useState('')

  function addTag() {
    const tag = value.trim().replace(/,+$/, '')
    const exists = tags.some((t) => t.toLowerCase() === tag.toLowerCase())
    if (tag && !exists && tags.length < MAX_TAGS) onChange([...tags, tag])
    setValue('')
  }

  return (
    <>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full bg-blue-600 text-white text-xs font-semibold"
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(tags.filter((t) => t !== tag))}
                aria-label={`Remove tag ${tag}`}
                className="p-0.5 rounded-full hover:bg-white/20"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          id="tags"
          value={value}
          maxLength={32}
          disabled={tags.length >= MAX_TAGS}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              addTag()
            }
          }}
          placeholder="Type a tag and press Enter"
          className={inputClass}
        />
        <button
          type="button"
          onClick={addTag}
          disabled={!value.trim() || tags.length >= MAX_TAGS}
          className={`${secondaryButtonClass} shrink-0 whitespace-nowrap`}
        >
          Add Tag
        </button>
      </div>
    </>
  )
}

function CoverImageField({
  value,
  onChange,
}: {
  value: string
  onChange: (url: string) => void
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUrlInput, setShowUrlInput] = useState(value.startsWith('https://'))

  async function upload(file: File) {
    setError(null)
    if (!UPLOAD_MIME_TYPES.includes(file.type)) {
      setError('Only PNG, JPG, WEBP, GIF or AVIF images are allowed.')
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('Image must be 5 MB or smaller.')
      return
    }
    setUploading(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const response = await fetch('/api/blog/upload', { method: 'POST', body })
      const data = (await response.json().catch(() => ({}))) as {
        url?: string
        error?: string
      }
      if (!response.ok || !data.url) throw new Error(data.error ?? 'Upload failed.')
      onChange(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const openPicker = () => fileInput.current?.click()

  return (
    <div>
      {value && isValidCoverImage(value) ? (
        <div className="relative aspect-[16/9] max-w-md overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700/70 bg-slate-950">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Cover preview" className="w-full h-full object-cover" />
          <div className="absolute top-2 right-2 flex gap-2">
            <button
              type="button"
              onClick={openPicker}
              disabled={uploading}
              className="px-3 py-1.5 rounded-lg bg-slate-950/80 backdrop-blur text-white text-xs font-semibold hover:bg-slate-900"
            >
              {uploading ? 'Uploading…' : 'Replace'}
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="px-3 py-1.5 rounded-lg bg-red-600/90 text-white text-xs font-semibold hover:bg-red-600"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={openPicker}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              openPicker()
            }
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            const file = e.dataTransfer.files[0]
            if (file) upload(file)
          }}
          className={`flex flex-col items-center justify-center gap-3 px-6 py-10 rounded-xl border-2 border-dashed text-center cursor-pointer transition-colors ${
            dragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
              : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 bg-white dark:bg-slate-950/40'
          }`}
        >
          <span className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
            {uploading ? (
              <LoaderCircle size={20} className="animate-spin text-blue-600 dark:text-blue-400" />
            ) : (
              <CloudUpload size={20} className="text-blue-600 dark:text-blue-400" />
            )}
          </span>
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            {uploading ? 'Uploading…' : 'Click to upload image or drag & drop'}
          </span>
          <span className="text-xs text-slate-500">
            PNG, JPG, WEBP, GIF or AVIF (max 5 MB)
          </span>
        </div>
      )}

      <input
        ref={fileInput}
        type="file"
        accept={UPLOAD_MIME_TYPES.join(',')}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) upload(file)
          e.target.value = ''
        }}
      />

      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => setShowUrlInput((v) => !v)}
        className="mt-3 text-xs text-blue-600 dark:text-blue-400 underline underline-offset-2"
      >
        {showUrlInput ? 'Hide image URL field' : 'Or enter an image URL manually'}
      </button>
      {showUrlInput && (
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.com/cover.jpg"
          aria-label="Cover image URL"
          className={`${inputClass} mt-2`}
        />
      )}
      <p className={hintClass}>Without an image, the generated cover below is used.</p>
    </div>
  )
}
