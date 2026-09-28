'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Store = {
  id: string
  name: string
}

export default function RegisterPage() {
  const router = useRouter()

  const [stores, setStores] = useState<Store[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedStores, setSelectedStores] = useState<string[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadStores() {
      const supabase = createClient()

      const { data } = await supabase
        .from('stores')
        .select('id, name')
        .eq('active', true)
        .order('name')

      setStores(data ?? [])
    }

    loadStores()
  }, [])

  function toggleStore(storeId: string) {
    setSelectedStores((prev) => {
      if (prev.includes(storeId)) {
        return prev.filter((id) => id !== storeId)
      }

      return [...prev, storeId]
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    setError('')

    if (selectedStores.length === 0) {
      setError('所属店舗を1つ以上選択してください')
      return
    }

    if (password.length < 6) {
      setError('パスワードは6文字以上にしてください')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
          storeIds: selectedStores,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || '登録に失敗しました')
        setLoading(false)
        return
      }

      // 登録後、そのままログイン
      const supabase = createClient()

      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        })

      if (loginError) {
        setError(
          '登録は完了しましたが、ログインに失敗しました。ログイン画面からお試しください。'
        )
        setLoading(false)
        return
      }

      window.location.replace('/dashboard')

    } catch {
      setError('通信エラーが発生しました')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-6 shadow">

        <Link
          href="/login"
          className="text-sm text-gray-500 hover:text-black"
        >
          ← ログインへ戻る
        </Link>

        <h1 className="mt-4 text-2xl font-bold">
          新規登録
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          シフト管理を利用するスタッフ情報を登録してください。
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-5"
        >

          <div>
            <label className="mb-2 block text-sm font-medium">
              名前
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border px-4 py-3"
              placeholder="例：はだ"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              所属店舗
            </label>

            <p className="mb-3 text-xs text-gray-500">
              複数選択できます
            </p>

            <div className="space-y-2">
              {stores.map((store) => (
                <label
                  key={store.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border p-3"
                >
                  <input
                    type="checkbox"
                    checked={selectedStores.includes(store.id)}
                    onChange={() => toggleStore(store.id)}
                  />

                  <span>
                    {store.name}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              メールアドレス
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border px-4 py-3"
              placeholder="example@gmail.com"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              パスワード
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border px-4 py-3"
            />

            <p className="mt-1 text-xs text-gray-500">
              6文字以上
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black py-3 font-medium text-white disabled:opacity-50"
          >
            {loading ? '登録中...' : '登録する'}
          </button>

        </form>
      </div>
    </main>
  )
}