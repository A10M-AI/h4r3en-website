import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CircleCheck,
  Clock,
  Info,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  Tag,
  TriangleAlert,
} from 'lucide-react'
import BlogCard from '@/components/BlogCard'
import BlogCover from '@/components/BlogCover'
import TableOfContents, { type TocItem } from '@/components/TableOfContents'
import { getAllPosts, getPostBySlug } from '@/lib/blog/store'
import type { Post, PostSection } from '@/lib/blog/types'
import { formatDate, getReadingTime, slugify, toLines } from '@/lib/blog/utils'

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return (await getAllPosts()).map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) return {}

  return {
    title: post.title,
    description: post.excerpt,
    keywords: post.tags,
    authors: [{ name: 'Hareen Desai' }],
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt,
      publishedTime: post.date,
      authors: ['Hareen Desai'],
      tags: post.tags,
      ...(post.cover.image && { images: [post.cover.image] }),
    },
  }
}

// Renders **bold** segments inside a line of text.
function renderInline(text: string) {
  return text.split('**').map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-slate-900 dark:text-white">
        {part}
      </strong>
    ) : (
      part
    )
  )
}

/** Unique anchor ids for section headings (null for sections without one). */
function headingIds(sections: PostSection[]): (string | null)[] {
  const used = new Set<string>()
  return sections.map((section, index) => {
    if (!section.heading) return null
    const base = slugify(section.heading) || `section-${index + 1}`
    let id = base
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`
    used.add(id)
    return id
  })
}

/** Other posts ranked by shared category and tags, newest first on ties. */
function relatedPosts(post: Post, all: Post[]): Post[] {
  return all
    .filter((p) => p.id !== post.id)
    .map((p) => ({
      post: p,
      score:
        (p.category === post.category ? 2 : 0) +
        p.tags.filter((tag) => post.tags.includes(tag)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ post }) => post)
}

const calloutStyles = {
  info: {
    icon: Info,
    label: 'Note',
    className: 'border-blue-200 dark:border-blue-900/60 [&_svg]:text-blue-600 dark:[&_svg]:text-blue-400',
  },
  tip: {
    icon: Lightbulb,
    label: 'Tip',
    className: 'border-emerald-200 dark:border-emerald-900/60 [&_svg]:text-emerald-600 dark:[&_svg]:text-emerald-400',
  },
  warning: {
    icon: TriangleAlert,
    label: 'Warning',
    className: 'border-amber-200 dark:border-amber-900/60 [&_svg]:text-amber-600 dark:[&_svg]:text-amber-400',
  },
}

function Quote({ text, className = '' }: { text: string; className?: string }) {
  return (
    <blockquote
      className={`pl-5 border-l-2 border-blue-500 dark:border-blue-400 italic text-[17px] leading-relaxed text-slate-700 dark:text-slate-200 ${className}`}
    >
      {renderInline(text)}
    </blockquote>
  )
}

function Callout({ callout }: { callout: NonNullable<PostSection['callout']> }) {
  if (callout.type === 'quote') return <Quote text={callout.text} className="my-8" />

  const { icon: Icon, label, className } = calloutStyles[callout.type]
  return (
    <aside
      className={`my-8 p-5 rounded-xl border bg-slate-50 dark:bg-slate-900/60 ${className}`}
    >
      <p className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-white">
        <Icon size={15} />
        {label}
      </p>
      <p className="text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
        {renderInline(callout.text)}
      </p>
    </aside>
  )
}

function Section({ section, id }: { section: PostSection; id: string | null }) {
  return (
    <section>
      {section.heading && id && (
        <h2
          id={id}
          className="scroll-mt-28 mt-14 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800 text-xl sm:text-2xl font-bold leading-snug text-slate-900 dark:text-white"
        >
          {section.heading}
        </h2>
      )}
      {section.paragraphs.map((paragraph, i) => (
        <p key={i} className="mb-5">
          {renderInline(paragraph)}
        </p>
      ))}
      {section.callout && <Callout callout={section.callout} />}
      {section.points.length > 0 && (
        <ul className="mb-8 space-y-3">
          {section.points.map((point, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-[11px] w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 shrink-0" />
              <span>{renderInline(point)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) notFound()

  const related = relatedPosts(post, await getAllPosts())
  const ids = headingIds(post.sections)
  const toc: TocItem[] = post.sections.flatMap((section, i) => {
    const id = ids[i]
    return id ? [{ id, text: section.heading }] : []
  })
  const showToc = toc.length >= 2

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Hero */}
      <header className="relative overflow-hidden pt-32 sm:pt-36 pb-14">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a08_1px,transparent_1px),linear-gradient(to_bottom,#0f172a08_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[40rem] h-[24rem] bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mb-6 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-700/30 font-semibold">
              {post.category}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={13} className="text-blue-600 dark:text-blue-400" />
              {getReadingTime(post)} min read
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={13} className="text-blue-600 dark:text-blue-400" />
              <time dateTime={post.date}>{formatDate(post.date)}</time>
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-slate-900 dark:text-white mb-5">
            {post.title}
          </h1>
          <p className="max-w-3xl mx-auto text-base sm:text-lg leading-relaxed text-slate-500 dark:text-slate-400">
            {post.excerpt}
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
          <div className="p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shadow-2xl shadow-blue-500/10">
            <BlogCover
              post={post}
              sizes="(min-width: 896px) 832px, 100vw"
              className="rounded-xl"
            />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-10 xl:gap-14 items-start">
          {/* Article */}
          <article className="min-w-0 text-[16px] leading-[1.85] text-slate-600 dark:text-slate-300">
            {showToc && (
              <details className="lg:hidden mb-10 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                <summary className="flex items-center gap-2 cursor-pointer text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-white">
                  <BookOpen size={14} className="text-blue-600 dark:text-blue-400" />
                  Table of Contents
                </summary>
                <ol className="mt-4 space-y-2 text-sm">
                  {toc.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        {item.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </details>
            )}

            {post.takeaways.length > 0 && (
              <aside className="mb-10 p-6 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-slate-900/60">
                <h2 className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                  <Sparkles size={14} />
                  Key Takeaways
                </h2>
                <ul className="space-y-3">
                  {post.takeaways.map((takeaway, i) => (
                    <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
                      <CircleCheck
                        size={16}
                        className="shrink-0 mt-1 text-blue-600 dark:text-blue-400"
                      />
                      <span>{renderInline(takeaway)}</span>
                    </li>
                  ))}
                </ul>
              </aside>
            )}

            {post.intro && <Quote text={post.intro} className="mb-10" />}

            {post.sections.map((section, i) => (
              <Section key={i} section={section} id={ids[i]} />
            ))}

            {post.conclusion && (
              <aside className="mt-14 p-6 sm:p-7 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-gradient-to-br from-blue-50 to-cyan-50/50 dark:from-slate-900/80 dark:to-blue-950/30">
                <h2 className="flex items-center gap-2 mb-3 text-base font-bold text-slate-900 dark:text-white">
                  <ShieldCheck size={18} className="text-blue-600 dark:text-blue-400" />
                  Summary &amp; Takeaway
                </h2>
                {toLines(post.conclusion).map((paragraph, i) => (
                  <p key={i} className="mb-3 last:mb-0 text-[15px] leading-relaxed">
                    {renderInline(paragraph)}
                  </p>
                ))}
              </aside>
            )}

            {post.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-12 pt-6 border-t border-slate-200 dark:border-slate-800">
                <span className="inline-flex items-center gap-1.5 mr-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <Tag size={13} className="text-blue-600 dark:text-blue-400" />
                  Tags:
                </span>
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs font-medium text-slate-600 dark:text-slate-300"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </article>

          {/* Sidebar */}
          <aside className="lg:sticky lg:top-24 space-y-6">
            {showToc && (
              <div className="hidden lg:block">
                <TableOfContents items={toc} />
              </div>
            )}
            <div className="relative overflow-hidden p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-center">
              <div className="absolute -top-12 -right-12 w-36 h-36 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />
              <div className="relative">
                <span className="mx-auto mb-4 w-11 h-11 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
                  <ShieldCheck size={20} className="text-blue-600 dark:text-blue-400" />
                </span>
                <h2 className="mb-2 text-base font-bold text-slate-900 dark:text-white">
                  Build AI That Works in Production
                </h2>
                <p className="mb-5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  Governed RAG, GenAI products and enterprise AI roadmaps —
                  let&apos;s talk about your use case.
                </p>
                <Link
                  href="/contact"
                  className="block w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-widest shadow-lg shadow-blue-500/25 transition-colors"
                >
                  Get in Touch
                </Link>
              </div>
            </div>
          </aside>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section
            aria-labelledby="related-articles"
            className="mt-24 pt-16 border-t border-slate-200 dark:border-slate-800"
          >
            <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
              <div>
                <h2
                  id="related-articles"
                  className="text-2xl font-bold text-slate-900 dark:text-white"
                >
                  Related Articles &amp; Research
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Explore more deep dives into enterprise AI, governed RAG and
                  production GenAI.
                </p>
              </div>
              <Link
                href="/blog"
                className="group inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400"
              >
                View all
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((p) => (
                <BlogCard key={p.id} post={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
