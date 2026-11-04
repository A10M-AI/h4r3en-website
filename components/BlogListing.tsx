'use client'

import { useMemo, useState } from 'react'
import { BookOpen, Search, Sparkles, X } from 'lucide-react'
import BlogCard from '@/components/BlogCard'
import type { Post } from '@/lib/blog/types'

interface BlogListingProps {
  initialPosts: Post[]
  categories: string[]
}

const PAGE_SIZE = 9

export default function BlogListing({ initialPosts, categories }: BlogListingProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE)

  const allCategories = useMemo(() => {
    return ['All', ...categories]
  }, [categories])

  const filteredPosts = useMemo(() => {
    let result = initialPosts

    if (selectedCategory !== 'All') {
      result = result.filter(
        (p) => p.category.toLowerCase() === selectedCategory.toLowerCase()
      )
    }

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      result = result.filter((p) => {
        const inTitle = p.title.toLowerCase().includes(q)
        const inExcerpt = p.excerpt.toLowerCase().includes(q)
        const inCategory = p.category.toLowerCase().includes(q)
        const inTags = p.tags.some((t) => t.toLowerCase().includes(q))
        return inTitle || inExcerpt || inCategory || inTags
      })
    }

    return result
  }, [initialPosts, selectedCategory, searchQuery])

  const displayedPosts = useMemo(() => {
    return filteredPosts.slice(0, visibleCount)
  }, [filteredPosts, visibleCount])

  const hasMore = visibleCount < filteredPosts.length

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + PAGE_SIZE)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategory('All')
    setVisibleCount(PAGE_SIZE)
  }

  return (
    <div>
      {/* Controls: Search and Categories */}
      <div className="mb-12 space-y-6">
        {/* Search bar */}
        <div className="relative max-w-xl mx-auto">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setVisibleCount(PAGE_SIZE)
            }}
            placeholder="Search articles by title, topic, or keyword..."
            aria-label="Search articles"
            className="w-full pl-12 pr-10 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Category filter pills */}
        {allCategories.length > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto">
            {allCategories.map((cat) => {
              const active = selectedCategory === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat)
                    setVisibleCount(PAGE_SIZE)
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 ${
                    active
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-105'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60'
                  }`}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Header bar */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <BookOpen size={20} className="text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {selectedCategory === 'All' ? 'All Articles' : `${selectedCategory} Articles`}
          </h2>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {filteredPosts.length}
          </span>
        </div>

        {(searchQuery || selectedCategory !== 'All') && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Grid of Articles */}
      {displayedPosts.length > 0 ? (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedPosts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="mt-12 text-center">
              <button
                type="button"
                onClick={handleLoadMore}
                className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-900 text-sm font-semibold transition hover:-translate-y-0.5 shadow-sm"
              >
                Load More Articles ({filteredPosts.length - displayedPosts.length} remaining)
              </button>
            </div>
          )}
        </>
      ) : (
        /* Empty State */
        <div className="py-20 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center mx-auto mb-4 text-blue-600 dark:text-blue-400">
            <Sparkles size={20} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            No published articles found
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
            {searchQuery || selectedCategory !== 'All'
              ? 'No articles match your current search criteria. Try clearing filters or searching for different keywords.'
              : 'Articles will appear here as soon as they are published from the admin dashboard.'}
          </p>
          {(searchQuery || selectedCategory !== 'All') && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
            >
              Clear Search &amp; Filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}

