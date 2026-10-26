import type { Metadata } from 'next'
import { BookOpen, Sparkles } from 'lucide-react'
import BlogCard from '@/components/BlogCard'
import BlogCTA from '@/components/BlogCTA'
import { getAllPosts } from '@/lib/blog/store'

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Insights on governed RAG, production GenAI, AI agents, and building revenue-producing enterprise AI systems — by Hareen Desai.',
}

// Read from the database on every request so edits show up immediately.
export const dynamic = 'force-dynamic'

export default async function Blog() {
  const posts = await getAllPosts()

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Hero */}
      <section className="relative overflow-hidden pt-36 pb-16 sm:pt-40 sm:pb-20">
        {/* Subtle grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a08_1px,transparent_1px),linear-gradient(to_bottom,#0f172a08_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />

        {/* Ambient glow */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[40rem] h-[24rem] bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 text-sm font-medium mb-8">
            <Sparkles size={14} className="shrink-0" />
            AI Strategy &amp; Engineering
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight mb-6">
            Insights, Ideas &amp;
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400">
              Latest Updates Insights
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Welcome to our blog, your destination for insightful articles, practical guides, fresh ideas, and valuable resources. Explore our latest posts to learn something new, stay updated on important topics, gain useful knowledge, and discover information that helps you make better decisions.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-28">
        {/* Articles */}
        <section aria-labelledby="all-articles" className="mb-24">
          <div className="flex items-center gap-3 mb-8">
            <BookOpen size={20} className="text-blue-600 dark:text-blue-400" />
            <h2
              id="all-articles"
              className="text-xl font-bold text-slate-900 dark:text-white"
            >
              All Articles
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {posts.length}
            </span>
          </div>

          {posts.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <p className="py-16 text-center text-slate-500 dark:text-slate-400 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              New articles are on the way. Check back soon.
            </p>
          )}
        </section>

        <BlogCTA />
      </div>
    </div>
  )
}
