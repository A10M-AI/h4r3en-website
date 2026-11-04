'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  Calendar,
  Clock,
  ExternalLink,
  Eye,
  FileEdit,
  FileText,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react'
import BlogCover from '@/components/BlogCover'
import { deletePostAction } from '@/app/secure-blog/actions'
import type { Post } from '@/lib/blog/types'
import { formatDate, getReadingTime } from '@/lib/blog/utils'
import {
  iconButtonClass,
  inputClass,
  panelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from './styles'

export default function BlogManager({ posts }: { posts: Post[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [pendingDelete, setPendingDelete] = useState<Post | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const publishedCount = useMemo(() => posts.filter((p) => p.status === 'published').length, [posts])
  const draftCount = useMemo(() => posts.filter((p) => p.status === 'draft').length, [posts])

  const visible = useMemo(() => {
    let list = posts

    if (statusFilter !== 'all') {
      list = list.filter((p) => p.status === statusFilter)
    }

    const q = query.trim().toLowerCase()
    if (!q) return list

    return list.filter((post) =>
      [post.title, post.excerpt, post.category, post.slug, ...(post.tags || [])].some((value) =>
        value.toLowerCase().includes(q)
      )
    )
  }, [posts, statusFilter, query])

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    setError(null)
    try {
      const result = await deletePostAction(pendingDelete.id)
      if (!result.ok) {
        setError(result.error)
      } else {
        setPendingDelete(null)
        router.refresh()
      }
    } catch {
      setError('Could not delete the post. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className={`p-5 ${panelClass} flex items-center justify-between`}>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Total Articles
            </p>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {posts.length}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <BookOpen size={22} />
          </div>
        </div>

        <div className={`p-5 ${panelClass} flex items-center justify-between`}>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Published Blogs
            </p>
            <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {publishedCount}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Sparkles size={22} />
          </div>
        </div>

        <div className={`p-5 ${panelClass} flex items-center justify-between`}>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Drafts in Progress
            </p>
            <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {draftCount}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <FileEdit size={22} />
          </div>
        </div>
      </div>

      {/* Control Bar: Title, Search, Status Filter */}
      <div className={`p-6 mb-8 ${panelClass}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900 dark:text-white">
              <BookOpen size={24} className="text-blue-600 dark:text-blue-400" />
              Manage NeoPhoenix Blogs
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Showing {visible.length} of {posts.length} blog articles in your database.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Status Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 w-full sm:w-auto">
              {(['all', 'published', 'draft'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                    statusFilter === tab
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab === 'all' ? `All (${posts.length})` : tab === 'published' ? `Published (${publishedCount})` : `Drafts (${draftCount})`}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, tag, slug…"
                aria-label="Search posts"
                className={`${inputClass} pl-11 py-2 text-xs`}
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-6 p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}

      {/* Blog Cards Grid */}
      {visible.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visible.map((post) => (
            <AdminPostCard
              key={post.id}
              post={post}
              onDelete={() => setPendingDelete(post)}
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8">
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            {posts.length === 0
              ? 'No blog posts in the database yet. Write your first article.'
              : 'No posts match your search or status filter.'}
          </p>
          {posts.length === 0 ? (
            <Link href="/secure-blog/new" className={primaryButtonClass}>
              <Plus size={16} />
              Create First Blog
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setStatusFilter('all')
              }}
              className={secondaryButtonClass}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {pendingDelete && (
        <DeleteDialog
          post={pendingDelete}
          deleting={deleting}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      )}
    </>
  )
}

function AdminPostCard({ post, onDelete }: { post: Post; onDelete: () => void }) {
  const isDraft = post.status === 'draft'

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700/70 hover:shadow-xl transition-all duration-300">
      <div className="relative">
        <BlogCover post={post} />
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-slate-950/80 backdrop-blur-sm border border-cyan-400/30 font-mono text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
          {post.category}
        </span>
        <span
          className={`absolute top-3 right-3 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider shadow-md backdrop-blur-sm ${
            isDraft
              ? 'bg-amber-950/80 border border-amber-500/40 text-amber-300'
              : 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
          }`}
        >
          {isDraft ? 'Draft' : 'Published'}
        </span>
      </div>

      <div className="flex flex-col flex-1 p-5">
        <h2 className="text-lg font-bold leading-snug text-slate-900 dark:text-white mb-2 line-clamp-2">
          {post.title}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2 mb-4 flex-1">
          {post.excerpt || 'No excerpt configured.'}
        </p>

        {/* Date & Read time */}
        <div className="flex items-center justify-between font-mono text-xs text-slate-500 dark:text-slate-400 mb-4">
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={13} className="text-blue-600 dark:text-blue-400" />
            {formatDate(post.date)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock size={13} className="text-blue-600 dark:text-blue-400" />
            {getReadingTime(post)} min read
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Link
            href={`/secure-blog/edit/${post.id}`}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
          >
            <Pencil size={13} />
            Edit Post
          </Link>
          {!isDraft ? (
            <a
              href={`/blog/${post.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`View "${post.title}" on public blog`}
              title="View on public website"
              className={iconButtonClass}
            >
              <ExternalLink size={15} />
            </a>
          ) : (
            <Link
              href={`/secure-blog/edit/${post.id}`}
              title="Draft post - preview in editor"
              className={iconButtonClass}
            >
              <Eye size={15} />
            </Link>
          )}
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete "${post.title}"`}
            title="Delete post"
            className={`${iconButtonClass} text-red-500 dark:text-red-400 border-red-200 dark:border-red-900/60 hover:text-red-600 dark:hover:text-red-300 hover:border-red-400 dark:hover:border-red-700 hover:bg-red-50 dark:hover:bg-red-950/40`}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </article>
  )
}

function DeleteDialog({
  post,
  deleting,
  onCancel,
  onConfirm,
}: {
  post: Post
  deleting: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !deleting) onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [deleting, onCancel])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
      onClick={() => !deleting && onCancel()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-title"
        aria-describedby="delete-description"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl animate-fade-in"
      >
        <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center mb-5">
          <Trash2 size={22} className="text-red-600 dark:text-red-400" />
        </div>
        <h2 id="delete-title" className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          Delete this blog post?
        </h2>
        <p id="delete-description" className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
          &ldquo;<strong>{post.title}</strong>&rdquo; will be permanently deleted from PostgreSQL. This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            autoFocus
            disabled={deleting}
            onClick={onCancel}
            className={secondaryButtonClass}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={onConfirm}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-sm font-semibold transition"
          >
            {deleting && <LoaderCircle size={16} className="animate-spin" />}
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  )
}

