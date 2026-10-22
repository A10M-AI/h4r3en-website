import Link from 'next/link'
import { ArrowRight, Zap } from 'lucide-react'

export default function BlogCTA() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-6 py-14 sm:px-12 sm:py-16 text-center">
      {/* Ambient glows */}
      <div className="absolute -top-24 -right-20 w-80 h-80 bg-blue-500/10 dark:bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-28 -left-20 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 border border-blue-200/70 dark:border-blue-700/40 text-blue-700 dark:text-blue-300 text-xs font-semibold uppercase tracking-widest mb-6">
          <Zap size={12} className="shrink-0" />
          Revenue-First AI
        </span>
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4 max-w-2xl mx-auto leading-tight">
          Building AI that has to work in{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400">
            production
          </span>
          ?
        </h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed mb-10 text-[15px]">
          Whether it&apos;s a governed RAG platform, a GenAI product, or an
          enterprise AI roadmap — let&apos;s talk about turning AI into
          measurable business outcomes.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/contact"
            className="group inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 w-full sm:w-auto"
          >
            Get in Touch
            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
          <Link
            href="/#ventures"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-700 font-medium transition-all duration-200 hover:-translate-y-0.5 w-full sm:w-auto"
          >
            Explore Ventures
          </Link>
        </div>
      </div>
    </section>
  )
}
