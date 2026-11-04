import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Info,
  Lightbulb,
  Share2,
  ShieldCheck,
  Sparkles,
  Tag,
  TriangleAlert,
} from 'lucide-react'
import BlogCard from '@/components/BlogCard'
import BlogCover from '@/components/BlogCover'
import TableOfContents, { type TocItem } from '@/components/TableOfContents'
import { getPublishedPostBySlug, getPublishedPosts } from '@/lib/blog/store'
import type { Post, PostSection } from '@/lib/blog/types'
import { formatDate, getReadingTime, slugify } from '@/lib/blog/utils'

type Props = { params: Promise<{ slug: string }> }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPublishedPostBySlug(slug)
  if (!post) {
    return {
      title: 'Article Not Found | Hareen Desai',
      description: 'The requested blog article could not be found.',
    }
  }

  const coverUrl = post.cover.image || post.cover_image_url || undefined

  return {
    title: `${post.title} | Hareen Desai`,
    description: post.excerpt,
    keywords: post.tags,
    authors: [{ name: 'Hareen Desai' }],
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt,
      publishedTime: post.published_at || post.date,
      modifiedTime: post.updatedAt,
      authors: ['Hareen Desai'],
      tags: post.tags,
      ...(coverUrl && { images: [{ url: coverUrl, alt: post.title }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      ...(coverUrl && { images: [coverUrl] }),
    },
  }
}

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

function relatedPosts(current: Post, all: Post[]): Post[] {
  return all
    .filter((p) => p.id !== current.id)
    .map((p) => ({
      post: p,
      score:
        (p.category === current.category ? 3 : 0) +
        p.tags.filter((tag) => current.tags.includes(tag)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ post }) => post)
}

const calloutStyles = {
  info: {
    icon: Info,
    label: 'Note',
    boxClass: 'border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200',
    iconClass: 'text-blue-600 dark:text-blue-400',
  },
  tip: {
    icon: Lightbulb,
    label: 'Pro Tip',
    boxClass: 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
  },
  warning: {
    icon: TriangleAlert,
    label: 'Caution',
    boxClass: 'border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200',
    iconClass: 'text-amber-600 dark:text-amber-400',
  },
  quote: {
    icon: Sparkles,
    label: 'Insight',
    boxClass: 'border-cyan-200 dark:border-cyan-900/60 bg-cyan-50/60 dark:bg-cyan-950/30 text-cyan-900 dark:text-cyan-200',
    iconClass: 'text-cyan-600 dark:text-cyan-400',
  },
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = await getPublishedPostBySlug(slug)

  if (!post) {
    notFound()
  }

  const allPosts = await getPublishedPosts()
  const related = relatedPosts(post, allPosts)
  const ids = headingIds(post.sections)

  const tocItems: TocItem[] = post.sections
    .map((section, i) =>
      section.heading && ids[i]
        ? { id: ids[i] as string, text: section.heading }
        : null
    )
    .filter((item): item is TocItem => item !== null)

  const coverUrl = post.cover.image || post.cover_image_url || ''

  // Structured Data (Schema.org JSON-LD)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.published_at || post.date,
    dateModified: post.updatedAt,
    author: {
      '@type': 'Person',
      name: 'Hareen Desai',
      jobTitle: 'CEO & AI Strategist',
      url: 'https://neophoenix.ai',
    },
    publisher: {
      '@type': 'Organization',
      name: 'NeoPhoenix',
      url: 'https://neophoenix.ai',
    },
    articleSection: post.category,
    keywords: post.tags.join(', '),
    ...(coverUrl && { image: [coverUrl] }),
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 pt-28 pb-24">
      {/* Article Schema JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <div className="mb-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
          >
            <ArrowLeft size={16} />
            <span>Back to All Articles</span>
          </Link>
        </div>

        {/* Article Header */}
        <header className="mb-10">
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-700/40 text-xs font-semibold">
              {post.category}
            </span>
            <span className="text-slate-300 dark:text-slate-700">&bull;</span>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
              <Calendar size={13} className="text-blue-600 dark:text-blue-400" />
              <time dateTime={post.date}>{formatDate(post.date)}</time>
            </span>
            <span className="text-slate-300 dark:text-slate-700">&bull;</span>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
              <Clock size={13} className="text-blue-600 dark:text-blue-400" />
              <span>{getReadingTime(post)} min read</span>
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.2] mb-6">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              {post.excerpt}
            </p>
          )}
        </header>

        {/* Cover Image */}
        <div className="mb-12 overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
          <BlogCover
            post={post}
            sizes="(min-width: 1024px) 896px, 100vw"
            className="w-full aspect-[16/9]"
          />
        </div>

        {/* Article Body Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-12 items-start">
          <div className="min-w-0 space-y-10">
            {/* Lead Intro Quote */}
            {post.intro && (
              <blockquote className="p-6 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border-l-4 border-blue-500 dark:border-blue-400 text-base sm:text-lg italic text-slate-700 dark:text-slate-300 leading-relaxed shadow-sm">
                &ldquo;{post.intro}&rdquo;
              </blockquote>
            )}

            {/* Key Takeaways Card */}
            {post.takeaways && post.takeaways.length > 0 && (
              <div className="p-6 sm:p-7 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  <ShieldCheck size={18} className="text-blue-600 dark:text-blue-400" />
                  <span>Key Architectural Takeaways</span>
                </div>
                <ul className="space-y-3">
                  {post.takeaways.map((point, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      <CheckCircle2 size={16} className="text-blue-600 dark:text-blue-400 shrink-0 mt-1" />
                      <span>{renderInline(point)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Article Sections */}
            {post.sections && post.sections.map((section, idx) => {
              const id = ids[idx]
              return (
                <section key={idx} className="space-y-4 pt-2">
                  {section.heading && (
                    <h2
                      id={id ?? undefined}
                      className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight pt-2 scroll-mt-28"
                    >
                      {section.heading}
                    </h2>
                  )}

                  {section.paragraphs && section.paragraphs.map((para, pIdx) => (
                    <p
                      key={pIdx}
                      className="text-base sm:text-[17px] text-slate-700 dark:text-slate-300 leading-relaxed"
                    >
                      {renderInline(para)}
                    </p>
                  ))}

                  {section.points && section.points.length > 0 && (
                    <ul className="space-y-2.5 my-4 pl-2">
                      {section.points.map((pt, ptIdx) => (
                        <li key={ptIdx} className="flex items-start gap-3 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-2.5" />
                          <span>{renderInline(pt)}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {section.callout && (
                    <div
                      className={`p-5 rounded-2xl border ${
                        calloutStyles[section.callout.type]?.boxClass || calloutStyles.info.boxClass
                      } my-6`}
                    >
                      <div className="flex items-start gap-3">
                        {(() => {
                          const CalloutIcon = calloutStyles[section.callout.type]?.icon || Info
                          return (
                            <CalloutIcon
                              size={20}
                              className={`shrink-0 mt-0.5 ${
                                calloutStyles[section.callout.type]?.iconClass || 'text-blue-500'
                              }`}
                            />
                          )
                        })()}
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-90">
                            {calloutStyles[section.callout.type]?.label || 'Note'}
                          </p>
                          <p className="text-sm sm:text-[15px] leading-relaxed">
                            {renderInline(section.callout.text)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              )
            })}

            {/* Conclusion */}
            {post.conclusion && (
              <div className="pt-8 border-t border-slate-200 dark:border-slate-800 space-y-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Conclusion
                </h3>
                {post.conclusion.split(/\r?\n/).filter(Boolean).map((para, cIdx) => (
                  <p key={cIdx} className="text-base sm:text-[17px] text-slate-700 dark:text-slate-300 leading-relaxed">
                    {renderInline(para)}
                  </p>
                ))}
              </div>
            )}

            {/* Tags Strip */}
            {post.tags && post.tags.length > 0 && (
              <div className="pt-6 flex flex-wrap items-center gap-2">
                <Tag size={15} className="text-slate-400 mr-1" />
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Sticky Sidebar: Table of Contents */}
          <aside className="hidden lg:block sticky top-24 space-y-6">
            <TableOfContents items={tocItems} />

            {/* Author Card */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-center">
              <div className="w-14 h-14 rounded-full bg-blue-600 text-white font-bold text-lg flex items-center justify-center mx-auto mb-3 shadow-md shadow-blue-500/20">
                HD
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Hareen Desai
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                CEO at Neophoenix.ai &middot; CTO &amp; Co-founder at Inventam
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition"
              >
                <span>Connect</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </aside>
        </div>

        {/* Related Articles Section */}
        {related.length > 0 && (
          <section className="mt-24 pt-16 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5 mb-8">
              <BookOpen size={20} className="text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Related Articles
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((relPost) => (
                <BlogCard key={relPost.id} post={relPost} />
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  )
}

