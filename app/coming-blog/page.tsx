import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Sparkles,
  Rocket,
  ShieldCheck,
  Bot,
  TrendingUp,
  Cpu,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react'
import ComingSoonSubscribe from '@/components/ComingSoonSubscribe'

export const metadata: Metadata = {
  title: 'Blog Coming Soon | Hareen Desai',
  description:
    'Insights on governed RAG, production GenAI, AI agents, and building revenue-producing enterprise AI systems — launching soon by Hareen Desai.',
}

const upcomingTopics = [
  {
    icon: ShieldCheck,
    title: 'Governed RAG in Enterprise Production',
    description:
      'Permission-aware retrieval, zero-hallucination pipelines, and identity-based access controls for enterprise datasets.',
    category: 'RAG Architecture',
  },
  {
    icon: Bot,
    title: 'Observability & Evaluation for AI Agents',
    description:
      'Measuring what multi-step agentic systems actually do in production, tracking drifts, and mitigating failure loops.',
    category: 'AI Engineering',
  },
  {
    icon: TrendingUp,
    title: 'Moving from AI Proof-of-Concept to Revenue',
    description:
      'The engineering and product playbook for transitioning boardroom AI demos into durable, measurable business outcomes.',
    category: 'AI Strategy',
  },
  {
    icon: Cpu,
    title: 'Reliable Production GenAI Infrastructure',
    description:
      'Latency optimization, semantic caching, intelligent fallback routing, and cost control across high-scale models.',
    category: 'Infrastructure',
  },
]

export default function ComingBlogPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a08_1px,transparent_1px),linear-gradient(to_bottom,#0f172a08_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black_35%,transparent_75%)] pointer-events-none" />

      {/* Ambient glowing radial orbs */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[46rem] h-[28rem] bg-gradient-to-b from-blue-500/20 via-cyan-500/15 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-96 -left-32 w-80 h-80 bg-blue-600/10 dark:bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-96 -right-32 w-80 h-80 bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-36 pb-24 sm:pt-44 sm:pb-32">
        {/* Hero Section */}
        <div className="max-w-3xl mx-auto text-center mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 text-sm font-semibold mb-8 animate-fade-in shadow-sm">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
            <Rocket size={15} className="text-blue-600 dark:text-blue-400" />
            <span>Blog Launching Soon</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.15] mb-6">
            Insights, Ideas &amp;
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 dark:from-blue-400 dark:via-cyan-400 dark:to-indigo-400">
              Latest Updates Coming Soon
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto mb-10">
            We are currently crafting in-depth engineering deep-dives, architectural blueprints,
            and executive playbooks on governed RAG, production GenAI systems, and autonomous
            AI agents. The official publications will launch shortly!
          </p>

          {/* Email Notification Subscription Form */}
          <div className="mb-10">
            <p className="text-xs uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400 mb-3">
              Get notified when the first article drops
            </p>
            <ComingSoonSubscribe />
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold transition shadow-md hover:-translate-y-0.5"
            >
              <ArrowLeft size={16} />
              Back to Home
            </Link>
            <Link
              href="/#projects"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-slate-50 dark:hover:bg-slate-900 text-sm font-semibold transition hover:-translate-y-0.5"
            >
              Explore Projects
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5"
            >
              Get in Touch
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Sneak Peek / Upcoming Topics Grid */}
        <section aria-labelledby="upcoming-heading" className="mt-20">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <Sparkles size={20} className="text-blue-600 dark:text-blue-400" />
              <h2
                id="upcoming-heading"
                className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white"
              >
                Upcoming Publications Preview
              </h2>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              In Editorial Review
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {upcomingTopics.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.title}
                  className="group relative p-6 sm:p-7 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm shadow-sm hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-800/80 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 group-hover:scale-105 transition-transform">
                      <Icon size={22} />
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-800/40">
                      {item.category}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 font-medium">
                    <span>Drafting in progress</span>
                    <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                      Coming Soon
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
