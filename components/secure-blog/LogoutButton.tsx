'use client'

import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { logout } from '@/app/secure-blog/actions'
import { secondaryButtonClass } from './styles'

export default function LogoutButton() {
  const [pending, setPending] = useState(false)

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true)
        await logout()
      }}
      aria-label="Sign out"
      className={secondaryButtonClass}
    >
      <LogOut size={16} />
      <span className="hidden sm:inline">Sign out</span>
    </button>
  )
}
