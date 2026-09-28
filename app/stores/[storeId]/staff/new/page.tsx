'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'

export default function NewStaffPage() {
  const params = useParams()
  const router = useRouter()

  const storeId = params.storeId as string

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'staff' | 'admin'>('staff')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    setError('')

    if (!name.trim()) {
      setError('名前を入力してください')
      return
    }

    if (!email.trim()) {
      setError('メールアドレスを入力してください')
      return
    }

    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(
        '/api/staff/create',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            storeId,
            name: name.trim(),
            email: email.trim(),
            password,
            role,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        setError(
          result.error ||
            'スタッフの登録に失敗しました'
        )
        return
      }

      alert('スタッフを追加しました')

      router.replace(
        `/stores/${storeId}/staff`
      )

      router.refresh()
    } catch (err) {
      console.error(err)

      setError(
        '通信エラーが発生しました'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-3 md:p-6">

      <div className="mx-auto max-w-xl">

        <div className="rounded-2xl bg-white p-5 shadow md:p-6">

          <Link
            href={`/stores/${storeId}/staff`}
            prefetch={false}
            className="text-sm text-gray-500"
          >
            ← スタッフ管理へ戻る
          </Link>

          <h1 className="mt-5 text-2xl font-bold">
            スタッフ追加
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            新しいスタッフのログインアカウントを作成します。
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-7 space-y-5"
          >

            {/* 名前 */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                名前
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                placeholder="例：はだ"
                className="w-full rounded-xl border px-4 py-3 text-base outline-none focus:border-black"
              />
            </div>

            {/* メール */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                メールアドレス
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="example@gmail.com"
                autoCapitalize="none"
                autoCorrect="off"
                className="w-full rounded-xl border px-4 py-3 text-base outline-none focus:border-black"
              />
            </div>

            {/* パスワード */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                初期パスワード
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="6文字以上"
                className="w-full rounded-xl border px-4 py-3 text-base outline-none focus:border-black"
              />

              <p className="mt-2 text-xs text-gray-400">
                登録後、このメールアドレスとパスワードでログインできます。
              </p>
            </div>

            {/* 権限 */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                権限
              </label>

              <select
                value={role}
                onChange={(e) =>
                  setRole(
                    e.target.value as
                      | 'staff'
                      | 'admin'
                  )
                }
                className="w-full rounded-xl border px-4 py-3 text-base"
              >
                <option value="staff">
                  スタッフ
                </option>

                <option value="admin">
                  幹部
                </option>
              </select>
            </div>

            {/* エラー */}
            {error && (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* 登録 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-black py-4 font-medium text-white disabled:opacity-50"
            >
              {loading
                ? '登録中...'
                : 'スタッフを追加'}
            </button>

          </form>
        </div>
      </div>
    </main>
  )
}