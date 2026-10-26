import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import BlogCover from './BlogCover'
import { getPostIcon } from '@/lib/blog/icons'
import type { Post } from '@/lib/blog/types'
import { formatDate, getReadingTime } from '@/lib/blog/utils'

const cardClass =
  'group flex flex-col p-5 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 transition-all duration-300'

interface BlogCardProps {
  post: Omit<Post, 'id' | 'updatedAt'>
  /** Renders a non-interactive card, e.g. for the editor's live preview. */
  preview?: boolean
}

export default function BlogCard({ post, preview = false }: BlogCardProps) {
  const { slug, title, excerpt, category, date } = post
  const Icon = getPostIcon(post.icon)

  const content = (
    <>
      <BlogCover post={post} className="rounded-xl" />

      {/* Category + icon */}
      <div className="flex items-center justify-between gap-3 mt-6 mb-4">
        <span className="px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-700/30 text-xs font-semibold">
          {category}
        </span>
        <span className="w-9 h-9 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center group-hover:border-blue-300 dark:group-hover:border-blue-700/70 transition-colors">
          <Icon size={16} className="text-blue-600 dark:text-blue-400" />
        </span>
      </div>

      <h3 className="text-lg font-bold leading-snug text-slate-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {title}
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3 mb-6 flex-1">
        {excerpt}
      </p>

      {/* Meta */}
      <div className="pt-5 border-t border-slate-200 dark:border-slate-700/50 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <time dateTime={date}>{formatDate(date)}</time>
        <span className="inline-flex items-center gap-1.5 font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {getReadingTime(post)} min read
          <ArrowRight
            size={14}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </span>
      </div>
    </>
  )

  if (preview) return <div className={cardClass}>{content}</div>

  return (
    <Link
      href={`/blog/${slug}`}
      className={`${cardClass} hover:border-blue-300 dark:hover:border-blue-700/70 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1`}
    >
      {content}
    </Link>
  )
}
