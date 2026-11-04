import type { Metadata } from 'next'
import { Sparkles } from 'lucide-react'
import BlogListing from '@/components/BlogListing'
import BlogCTA from '@/components/BlogCTA'
import { getPublishedCategories, getPublishedPosts } from '@/lib/blog/store'
import type { Post } from '@/lib/blog/types'

export const metadata: Metadata = {
  title: 'Blog & Engineering Insights | Hareen Desai',
  description:
    'Deep-dives, architectural blueprints, and executive playbooks on governed RAG, production GenAI, AI agents, and revenue-producing enterprise AI systems — by Hareen Desai.',
  openGraph: {
    type: 'website',
    title: 'Blog & Engineering Insights | Hareen Desai',
    description:
      'Insights on governed RAG, production GenAI, AI agents, and enterprise AI engineering by Hareen Desai.',
    siteName: 'Hareen Desai - NeoPhoenix',
  },
}

export const dynamic = 'force-dynamic'

export default async function BlogPage() {
  let posts: Post[] = []
  let categories: string[] = []
  let hasError = false

  try {
    const [fetchedPosts, fetchedCategories] = await Promise.all([
      getPublishedPosts(),
      getPublishedCategories(),
    ])
    posts = fetchedPosts
    categories = fetchedCategories
  } catch (error) {
    console.error('Failed to load published blogs from database:', error)
    hasError = true
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-36 pb-16 sm:pt-40 sm:pb-20">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a08_1px,transparent_1px),linear-gradient(to_bottom,#0f172a08_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)] pointer-events-none" />

        {/* Ambient glow orbs */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[44rem] h-[26rem] bg-gradient-to-b from-blue-500/20 via-cyan-500/15 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-48 -left-24 w-72 h-72 bg-blue-600/10 dark:bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-48 -right-24 w-72 h-72 bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 text-sm font-semibold mb-8 shadow-sm">
            <Sparkles size={14} className="shrink-0 text-blue-600 dark:text-blue-400" />
            <span>AI Strategy &amp; Engineering Blueprint</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.15] mb-6">
            Insights, Ideas &amp;
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 dark:from-blue-400 dark:via-cyan-400 dark:to-indigo-400">
              Latest Engineering Publications
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Practical architectures, enterprise governance models, and real-world implementation
            guides on production GenAI, autonomous AI agents, and revenue-producing intelligent systems.
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-28">
        {hasError ? (
          <div className="p-8 rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-center max-w-lg mx-auto my-12">
            <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2">
              Unable to load blog articles
            </h3>
            <p className="text-sm text-red-600 dark:text-red-300">
              We encountered a temporary database connectivity issue. Please refresh the page or try again in a few moments.
            </p>
          </div>
        ) : (
          <BlogListing initialPosts={posts} categories={categories} />
        )}

        <div className="mt-24">
          <BlogCTA />
        </div>
      </main>
    </div>
  )
}
