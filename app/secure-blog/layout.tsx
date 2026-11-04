import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blog Management Dashboard | NeoPhoenix Admin',
  robots: {
    index: false,
    follow: false,
  },
}

export default function SecureBlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  )
}

