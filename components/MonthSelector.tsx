'use client'

import { usePathname, useRouter } from 'next/navigation'

type Props = {
  year: number
  month: number
}

export default function MonthSelector({
  year,
  month,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()

  // =========================
  // 月移動
  // =========================
  function moveMonth(diff: number) {
    const date = new Date(
      year,
      month - 1 + diff,
      1
    )

    const newYear =
      date.getFullYear()

    const newMonth =
      date.getMonth() + 1

    router.push(
      `${pathname}?year=${newYear}&month=${newMonth}`
    )
  }

  // =========================
  // セレクト変更
  // =========================
  function handleMonthChange(
    value: string
  ) {
    const [
      selectedYear,
      selectedMonth,
    ] = value
      .split('-')
      .map(Number)

    router.push(
      `${pathname}?year=${selectedYear}&month=${selectedMonth}`
    )
  }

  // =========================
  // 選択候補
  // 前後12か月
  // =========================
  const options = []

  for (
    let diff = -12;
    diff <= 12;
    diff++
  ) {
    const date = new Date(
      year,
      month - 1 + diff,
      1
    )

    options.push({
      year:
        date.getFullYear(),

      month:
        date.getMonth() + 1,
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">

      {/* 前月 */}
      <button
        type="button"
        onClick={() =>
          moveMonth(-1)
        }
        className="rounded-lg border px-3 py-2 hover:bg-gray-50"
      >
        ←
      </button>

      {/* 年月選択 */}
      <select
        value={`${year}-${month}`}
        onChange={(e) =>
          handleMonthChange(
            e.target.value
          )
        }
        className="rounded-lg border px-4 py-2 font-medium"
      >
        {options.map(
          (item) => (
            <option
              key={`${item.year}-${item.month}`}
              value={`${item.year}-${item.month}`}
            >
              {item.year}年
              {item.month}月
            </option>
          )
        )}
      </select>

      {/* 翌月 */}
      <button
        type="button"
        onClick={() =>
          moveMonth(1)
        }
        className="rounded-lg border px-3 py-2 hover:bg-gray-50"
      >
        →
      </button>

    </div>
  )
}