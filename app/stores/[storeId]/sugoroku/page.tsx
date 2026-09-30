'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import SugorokuAdmin from '@/components/sugoroku/SugorokuAdmin'
import { sugorokuSupabase } from '@/lib/sugoroku-supabase'

export default function SugorokuAdminPage() {
  const params = useParams<{ storeId: string }>()
  const router = useRouter()

  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    checkPermission()
  }, [])

  async function checkPermission() {
    const {
      data: { user },
      error: userError,
    } = await sugorokuSupabase.auth.getUser()

    if (userError || !user) {
      router.replace('/login')
      return
    }

    const { data: profile, error } =
      await sugorokuSupabase
        .from('profiles')
        .select('system_role')
        .eq('id', user.id)
        .single()

    if (
      error ||
      profile?.system_role !== 'super_admin'
    ) {
      setAllowed(false)
      setChecking(false)
      return
    }

    setAllowed(true)
    setChecking(false)
  }

  if (checking) {
    return (
      <main className="min-h-screen bg-zinc-50 p-6">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-sm">
          権限を確認しています...
        </div>
      </main>
    )
  }

  if (!allowed) {
    return (
      <main className="min-h-screen bg-zinc-50 p-6">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">
            アクセスできません
          </h1>

          <p className="mt-3 text-sm text-zinc-500">
            すごろく管理は super_admin のみ利用できます。
          </p>

          <button
            onClick={() => router.back()}
            className="mt-6 rounded-xl bg-black px-5 py-3 font-bold text-white"
          >
            戻る
          </button>
        </div>
      </main>
    )
  }

  return (
    <SugorokuAdmin
      storeId={params.storeId}
    />
  )
}
