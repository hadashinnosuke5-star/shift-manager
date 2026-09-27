'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Props = {
  storeId: string
  year: number
  month: number
  currentStatus: 'none' | 'open' | 'locked'
}

export default function ShiftLockButton({
  storeId,
  year,
  month,
  currentStatus,
}: Props) {
  const router = useRouter()

  const [loading, setLoading] =
    useState(false)

  // =========================
  // 状態
  // =========================

  const notStarted =
    currentStatus === 'none'

  const isOpen =
    currentStatus === 'open'

  const isLocked =
    currentStatus === 'locked'

  // =========================
  // API実行
  // =========================

  async function updateStatus(
    newStatus: 'open' | 'locked'
  ) {
    setLoading(true)

    try {
      const response = await fetch(
        '/api/shifts/lock',
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
            status: newStatus,
          }),
        }
      )

      const result =
        await response.json()

      if (!response.ok) {
        alert(
          result.error ||
            '変更に失敗しました'
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

  // =========================
  // クリック
  // =========================

  async function handleClick() {
    // まだ受付を作っていない月
    if (notStarted) {
      const confirmed =
        window.confirm(
          `${year}年${month}月のシフト受付を開始しますか？`
        )

      if (!confirmed) {
        return
      }

      await updateStatus('open')

      return
    }

    // 受付中 → 確定
    if (isOpen) {
      const confirmed =
        window.confirm(
          'シフトを確定しますか？\n\n確定するとスタッフはシフトの編集・提出取消ができなくなります。'
        )

      if (!confirmed) {
        return
      }

      await updateStatus('locked')

      return
    }

    // 確定済み → 解除
    if (isLocked) {
      const confirmed =
        window.confirm(
          'シフト確定を解除しますか？\n\n解除するとスタッフが再び編集できるようになります。'
        )

      if (!confirmed) {
        return
      }

      await updateStatus('open')
    }
  }

  // =========================
  // 未開始
  // =========================

  if (notStarted) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {loading
          ? '開始中...'
          : 'シフト受付を開始'}
      </button>
    )
  }

  // =========================
  // 確定済み
  // =========================

  if (isLocked) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="rounded-lg border border-gray-300 px-4 py-2 disabled:opacity-50"
      >
        {loading
          ? '処理中...'
          : '確定解除'}
      </button>
    )
  }

  // =========================
  // 受付中
  // =========================

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
    >
      {loading
        ? '処理中...'
        : 'シフト確定'}
    </button>
  )
}