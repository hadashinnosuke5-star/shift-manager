'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Props = {
  storeId: string
  year: number
  month: number
  currentStatus: 'draft' | 'submitted'
  locked: boolean
}

export default function ShiftSubmitButton({
  storeId,
  year,
  month,
  currentStatus,
  locked,
}: Props) {
  const router = useRouter()

  const [loading, setLoading] =
    useState(false)

  const submitted =
    currentStatus === 'submitted'

  async function handleClick() {
    if (locked) {
      alert('シフト確定後は変更できません')
      return
    }

    const message = submitted
      ? '提出を取り消しますか？'
      : 'この内容でシフトを提出しますか？'

    if (!window.confirm(message)) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch(
        '/api/shifts/submit',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            storeId,
            year,
            month,
            status: submitted
              ? 'draft'
              : 'submitted',
          }),
        }
      )

      const result =
        await response.json()

      if (!response.ok) {
        alert(
          result.error ||
          '処理に失敗しました'
        )

        return
      }

      router.refresh()

    } catch {
      alert(
        '通信エラーが発生しました'
      )

    } finally {
      setLoading(false)
    }
  }

  if (locked) {
    return (
      <div className="rounded-lg bg-gray-100 p-4 text-center text-sm text-gray-500">
        シフト確定済み
      </div>
    )
  }

  if (submitted) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full rounded-xl border border-gray-300 py-4 font-medium disabled:opacity-50"
      >
        {loading
          ? '処理中...'
          : '提出を取り消す'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="w-full rounded-xl bg-blue-600 py-4 font-medium text-white disabled:opacity-50"
    >
      {loading
        ? '提出中...'
        : 'シフトを提出'}
    </button>
  )
}