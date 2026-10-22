'use client'

import { useEffect, useState } from 'react'
import { BookOpen } from 'lucide-react'

export interface TocItem {
  id: string
  text: string
}

export default function TableOfContents({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id)

  // Highlight the last heading that has scrolled past the top third of the screen.
  useEffect(() => {
    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null)

    const onScroll = () => {
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      let current = headings[0]?.id
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= window.innerHeight * 0.3) {
          current = heading.id
        }
      }
      setActiveId(atBottom ? headings[headings.length - 1]?.id : current)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [items])

  return (
    <nav
      aria-label="Table of contents"
      className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60"
    >
      <p className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-white">
        <BookOpen size={14} className="text-blue-600 dark:text-blue-400" />
        Table of Contents
      </p>
      <ol className="space-y-1">
        {items.map((item) => {
          const active = item.id === activeId
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={active ? 'location' : undefined}
                className={`block pl-3 pr-2 py-1.5 border-l-2 rounded-r-lg text-[13px] leading-snug transition-colors ${
                  active
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                {item.text}
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
