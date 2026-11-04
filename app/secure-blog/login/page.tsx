import { redirect } from 'next/navigation'
import { Lock, ShieldCheck } from 'lucide-react'
import { isAdmin } from '@/lib/blog/auth'
import LoginForm from '@/components/secure-blog/LoginForm'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  if (await isAdmin()) {
    redirect('/secure-blog')
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-md">
        {/* Glow behind card */}
        <div className="relative">
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-72 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto mb-4 shadow-sm">
                <ShieldCheck size={28} />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                NeoPhoenix Admin
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Enter your administrative password to manage blog publications.
              </p>
            </div>

            {/* Login form with server-side validation */}
            <LoginForm />

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/80 text-center">
              <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1.5 font-mono">
                <Lock size={12} />
                <span>Protected Session &middot; Rate Limited &middot; SameSite Lax</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

