'use client'

import { useActionState, useState } from 'react'
import { Eye, EyeOff, Lock, LogIn, LoaderCircle } from 'lucide-react'
import { loginAction } from '@/app/secure-blog/actions'

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [state, formAction, isPending] = useActionState(loginAction, undefined)

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <div
          role="alert"
          className="p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-sm text-red-600 dark:text-red-400 font-medium"
        >
          {state.error}
        </div>
      )}

      <div>
        <label
          htmlFor="admin-password"
          className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2"
        >
          Admin Password
        </label>
        <div className="relative">
          <input
            id="admin-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            placeholder="Enter secure admin password..."
            className="w-full pl-4 pr-11 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:pointer-events-none"
      >
        {isPending ? (
          <>
            <LoaderCircle size={18} className="animate-spin" />
            <span>Authenticating...</span>
          </>
        ) : (
          <>
            <Lock size={16} />
            <span>Sign In to Blog Dashboard</span>
          </>
        )}
      </button>
    </form>
  )
}

