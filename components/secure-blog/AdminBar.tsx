import Link from 'next/link'
import { ExternalLink, Layers, Plus } from 'lucide-react'
import LogoutButton from './LogoutButton'
import { primaryButtonClass, secondaryButtonClass } from './styles'

interface AdminBarProps {
  total: number
  publishedCount?: number
  draftCount?: number
}

export default function AdminBar({ total, publishedCount = 0, draftCount = 0 }: AdminBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
      <div className="flex items-center gap-3">
        <Link
          href="/secure-blog"
          className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-sm font-semibold hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
        >
          <Layers size={16} />
          All Blogs
          <span className="min-w-6 h-6 px-1.5 rounded-full bg-blue-600 text-white text-xs font-bold inline-flex items-center justify-center">
            {total}
          </span>
        </Link>
        <Link
          href="/blog"
          target="_blank"
          className={`hidden sm:inline-flex ${secondaryButtonClass} text-xs`}
        >
          <ExternalLink size={14} />
          <span>View Public Blog</span>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <LogoutButton />
        <Link href="/secure-blog/new" className={primaryButtonClass}>
          <Plus size={16} />
          Create New Blog
        </Link>
      </div>
    </div>
  )
}

