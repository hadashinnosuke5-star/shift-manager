'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Props = {
  storeId: string
  userId: string
  initialName: string
  initialRole: string
  initialActive: boolean
}

export default function StaffEditForm({
  storeId,
  userId,
  initialName,
  initialRole,
  initialActive,
}: Props) {
  const router = useRouter()

  const [name, setName] = useState(initialName)

  const [role, setRole] = useState<'staff' | 'admin'>(
    initialRole === 'admin'
      ? 'admin'
      : 'staff'
  )

  const [active, setActive] =
    useState(initialActive)

  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState('')

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault()

    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        '/api/staff/update',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            storeId,
            userId,
            name,
            role,
            active,
          }),
        }
      )

      const result =
        await response.json()

      if (!response.ok) {
        setError(
          result.error ||
          '更新に失敗しました'
        )

        setLoading(false)
        return
      }

      router.push(
        `/stores/${storeId}/staff`
      )

      router.refresh()

    } catch {
      setError(
        '通信エラーが発生しました'
      )

      setLoading(false)
    }
  }

  return (
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
          onChange={(e) =>
            setName(e.target.value)
          }
          required
          className="w-full rounded-lg border px-4 py-3"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">
          権限
        </label>

        <select
          value={role}
          onChange={(e) =>
            setRole(
              e.target.value as
              'staff' | 'admin'
            )
          }
          className="w-full rounded-lg border px-4 py-3"
        >
          <option value="staff">
            スタッフ
          </option>

          <option value="admin">
            幹部
          </option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">
          在籍状態
        </label>

        <select
          value={
            active
              ? 'active'
              : 'inactive'
          }
          onChange={(e) =>
            setActive(
              e.target.value ===
              'active'
            )
          }
          className="w-full rounded-lg border px-4 py-3"
        >
          <option value="active">
            在籍
          </option>

          <option value="inactive">
            退店
          </option>
        </select>
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
        {loading
          ? '保存中...'
          : '変更を保存'}
      </button>

    </form>
  )
}