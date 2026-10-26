import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blog Manager',
  robots: { index: false, follow: false },
}

export default function SecureBlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {children}
      </div>
    </div>
  )
}
