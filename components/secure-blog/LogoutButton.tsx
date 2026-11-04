'use client'

import { useState } from 'react'
import { LoaderCircle, LogOut } from 'lucide-react'
import { logoutAction } from '@/app/secure-blog/actions'
import { secondaryButtonClass } from './styles'

export default function LogoutButton() {
  const [pending, setPending] = useState(false)

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true)
        await logoutAction()
      }}
      aria-label="Sign out"
      className={secondaryButtonClass}
    >
      {pending ? (
        <LoaderCircle size={16} className="animate-spin" />
      ) : (
        <LogOut size={16} />
      )}
      <span className="hidden sm:inline">Sign out</span>
    </button>
  )
}

