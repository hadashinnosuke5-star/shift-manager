'use client'

import { createClient } from '@/lib/supabase/client'

export default function LogoutButton() {
  async function handleLogout() {
    const supabase = createClient()

    await supabase.auth.signOut()

    window.location.replace('/login')
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
    >
      ログアウト
    </button>
  )
}