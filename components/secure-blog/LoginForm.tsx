'use client'

import { useState } from 'react'
import { Eye, EyeOff, KeyRound, LoaderCircle, Lock } from 'lucide-react'
import { login } from '@/app/secure-blog/actions'
import { inputClass, labelClass, panelClass, primaryButtonClass } from './styles'

export default function LoginForm({ configured }: { configured: boolean }) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    // On success the action redirects, so this only returns on failure.
    const result = await login(password)
    setError(result?.error ?? null)
    setPending(false)
  }

  return (
    <div className="relative flex justify-center py-8 sm:py-16">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className={`relative w-full max-w-md p-8 sm:p-10 ${panelClass}`}>
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30 mb-6">
          <Lock size={24} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Blog Manager
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
          Sign in to create, edit and publish articles on your website.
        </p>

        {!configured && (
          <p className="mb-6 p-4 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 text-sm text-amber-700 dark:text-amber-300">
            Admin access isn&apos;t set up yet. Add{' '}
            <code className="font-mono text-xs">BLOG_ADMIN_PASSWORD</code> to{' '}
            <code className="font-mono text-xs">.env.local</code> and restart
            the server.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="password" className={labelClass}>
              Password
            </label>
            <div className="relative">
              <KeyRound
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                autoFocus
                required
                disabled={!configured}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className={`${inputClass} pl-11 pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || !configured || !password}
            className={`${primaryButtonClass} w-full py-3`}
          >
            {pending && <LoaderCircle size={16} className="animate-spin" />}
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
