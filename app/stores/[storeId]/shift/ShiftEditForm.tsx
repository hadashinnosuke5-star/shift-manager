'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Shift = {
  id?: string
  shift_date: string
  start_time: string | null
  end_time: string | null
  end_type: string
  is_off: boolean
  note: string | null
}

type DayData = {
  type: 'none' | 'work' | 'off'
  startTime: string
  endTime: string
  endType: 'time' | 'last'
  note: string
}

type Props = {
  storeId: string
  userId: string
  year: number
  month: number
  daysInMonth: number
  initialShifts: Shift[]

  // 店舗全体が確定済みか
  locked: boolean

  // 本人が提出済みか
  submitted: boolean
}

export default function ShiftEditForm({
  storeId,
  userId,
  year,
  month,
  daysInMonth,
  initialShifts,
  locked,
  submitted,
}: Props) {
  const router = useRouter()

  // =====================================
  // 提出済み or 店舗確定済みなら編集不可
  // =====================================
  const formLocked =
    locked || submitted

  // =====================================
  // 初期データ作成
  // =====================================
  function createInitialData() {
    const data: Record<number, DayData> = {}

    for (
      let day = 1;
      day <= daysInMonth;
      day++
    ) {
      const date =
        `${year}-${String(month).padStart(2, '0')}-${String(
          day
        ).padStart(2, '0')}`

      const shift =
        initialShifts.find(
          (item) =>
            item.shift_date === date
        )

      // データなし
      if (!shift) {
        data[day] = {
          type: 'none',
          startTime: '',
          endTime: '',
          endType: 'time',
          note: '',
        }

        continue
      }

      // 休み
      if (shift.is_off) {
        data[day] = {
          type: 'off',
          startTime: '',
          endTime: '',
          endType: 'time',
          note: shift.note ?? '',
        }

        continue
      }

      // 出勤
      data[day] = {
        type: 'work',

        startTime:
          shift.start_time?.slice(
            0,
            5
          ) ?? '',

        endTime:
          shift.end_time?.slice(
            0,
            5
          ) ?? '',

        endType:
          shift.end_type === 'last'
            ? 'last'
            : 'time',

        note:
          shift.note ?? '',
      }
    }

    return data
  }

  const [days, setDays] =
    useState<Record<number, DayData>>(
      createInitialData()
    )

  const [loading, setLoading] =
    useState(false)

  const [message, setMessage] =
    useState('')

  const [error, setError] =
    useState('')

  // =====================================
  // 1日の内容更新
  // =====================================
  function updateDay(
    day: number,
    values: Partial<DayData>
  ) {
    if (formLocked) {
      return
    }

    setDays((prev) => ({
      ...prev,

      [day]: {
        ...prev[day],
        ...values,
      },
    }))
  }

  // =====================================
  // 保存
  // =====================================
  async function handleSave() {
    if (locked) {
      setError(
        'この月のシフトは確定済みのため変更できません'
      )

      return
    }

    if (submitted) {
      setError(
        '提出済みです。修正する場合は先に提出を取り消してください'
      )

      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    const supabase =
      createClient()

    try {
      for (
        let day = 1;
        day <= daysInMonth;
        day++
      ) {
        const data =
          days[day]

        const shiftDate =
          `${year}-${String(month).padStart(2, '0')}-${String(
            day
          ).padStart(2, '0')}`

        // =================================
        // 未入力
        // 既存シフトがあれば削除
        // =================================
        if (
          data.type === 'none'
        ) {
          const {
            error: deleteError,
          } = await supabase
            .from('shifts')
            .delete()
            .eq(
              'store_id',
              storeId
            )
            .eq(
              'user_id',
              userId
            )
            .eq(
              'shift_date',
              shiftDate
            )

          if (deleteError) {
            throw deleteError
          }

          continue
        }

        // =================================
        // 休み
        // =================================
        if (
          data.type === 'off'
        ) {
          const {
            error: offError,
          } = await supabase
            .from('shifts')
            .upsert(
              {
                store_id:
                  storeId,

                user_id:
                  userId,

                shift_date:
                  shiftDate,

                start_time:
                  null,

                end_time:
                  null,

                end_type:
                  'time',

                is_off:
                  true,

                note:
                  data.note ||
                  null,
              },
              {
                onConflict:
                  'store_id,user_id,shift_date',
              }
            )

          if (offError) {
            throw offError
          }

          continue
        }

        // =================================
        // 出勤
        // =================================
        if (
          !data.startTime
        ) {
          throw new Error(
            `${day}日の出勤時間を入力してください`
          )
        }

        if (
          data.endType ===
            'time' &&
          !data.endTime
        ) {
          throw new Error(
            `${day}日の退勤時間を入力してください`
          )
        }

        const {
          error: workError,
        } = await supabase
          .from('shifts')
          .upsert(
            {
              store_id:
                storeId,

              user_id:
                userId,

              shift_date:
                shiftDate,

              start_time:
                data.startTime,

              end_time:
                data.endType ===
                'last'
                  ? null
                  : data.endTime,

              end_type:
                data.endType,

              is_off:
                false,

              note:
                data.note ||
                null,
            },
            {
              onConflict:
                'store_id,user_id,shift_date',
            }
          )

        if (workError) {
          throw workError
        }
      }

      setMessage(
        'シフトを保存しました'
      )

      router.refresh()
    } catch (err) {
      console.error(err)

      if (
        err instanceof Error
      ) {
        setError(
          err.message
        )
      } else {
        setError(
          '保存に失敗しました'
        )
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-6">

      {/* =================================
          店舗側で確定済み
      ================================= */}
      {locked && (
        <div className="mb-6 rounded-xl bg-gray-100 p-4 text-sm text-gray-600">
          <p className="font-medium">
            シフト確定済み
          </p>

          <p className="mt-1">
            この月のシフトは確定済みのため変更できません。
          </p>
        </div>
      )}

      {/* =================================
          本人提出済み
      ================================= */}
      {!locked &&
        submitted && (
          <div className="mb-6 rounded-xl bg-green-50 p-4 text-sm text-green-800">
            <p className="font-medium">
              シフト提出済み
            </p>

            <p className="mt-1">
              修正する場合は、下の「提出を取り消す」を押してから編集してください。
            </p>
          </div>
        )}

      {/* =================================
          日別入力
      ================================= */}
      <div className="space-y-3">

        {Array.from(
          {
            length:
              daysInMonth,
          },
          (_, i) =>
            i + 1
        ).map((day) => {
          const date =
            new Date(
              year,
              month - 1,
              day
            )

          const week =
            [
              '日',
              '月',
              '火',
              '水',
              '木',
              '金',
              '土',
            ][
              date.getDay()
            ]

          const data =
            days[day]

          return (
            <div
              key={day}
              className={
                formLocked
                  ? 'rounded-xl border bg-gray-50 p-4'
                  : 'rounded-xl border p-4'
              }
            >
              <div className="flex flex-wrap items-center gap-3">

                {/* 日付 */}
                <div className="w-20 font-medium">
                  {day}日

                  <span className="ml-1 text-sm text-gray-400">
                    ({week})
                  </span>
                </div>

                {/* 出勤種別 */}
                <select
                  value={
                    data.type
                  }
                  disabled={
                    formLocked
                  }
                  onChange={(
                    e
                  ) =>
                    updateDay(
                      day,
                      {
                        type:
                          e
                            .target
                            .value as
                            | 'none'
                            | 'work'
                            | 'off',
                      }
                    )
                  }
                  className="rounded-lg border px-3 py-2 disabled:bg-gray-100"
                >
                  <option value="none">
                    未入力
                  </option>

                  <option value="work">
                    出勤
                  </option>

                  <option value="off">
                    休み
                  </option>
                </select>

                {/* 出勤時 */}
                {data.type ===
                  'work' && (
                  <>
                    <input
                      type="time"
                      disabled={
                        formLocked
                      }
                      value={
                        data.startTime
                      }
                      onChange={(
                        e
                      ) =>
                        updateDay(
                          day,
                          {
                            startTime:
                              e
                                .target
                                .value,
                          }
                        )
                      }
                      className="rounded-lg border px-3 py-2 disabled:bg-gray-100"
                    />

                    <span>
                      〜
                    </span>

                    <select
                      disabled={
                        formLocked
                      }
                      value={
                        data.endType
                      }
                      onChange={(
                        e
                      ) =>
                        updateDay(
                          day,
                          {
                            endType:
                              e
                                .target
                                .value as
                                | 'time'
                                | 'last',
                          }
                        )
                      }
                      className="rounded-lg border px-3 py-2 disabled:bg-gray-100"
                    >
                      <option value="time">
                        時間指定
                      </option>

                      <option value="last">
                        LAST
                      </option>
                    </select>

                    {data.endType ===
                      'time' && (
                      <input
                        type="time"
                        disabled={
                          formLocked
                        }
                        value={
                          data.endTime
                        }
                        onChange={(
                          e
                        ) =>
                          updateDay(
                            day,
                            {
                              endTime:
                                e
                                  .target
                                  .value,
                            }
                          )
                        }
                        className="rounded-lg border px-3 py-2 disabled:bg-gray-100"
                      />
                    )}
                  </>
                )}

              </div>

              {/* 備考 */}
              {data.type !==
                'none' && (
                <input
                  type="text"
                  disabled={
                    formLocked
                  }
                  value={
                    data.note
                  }
                  onChange={(
                    e
                  ) =>
                    updateDay(
                      day,
                      {
                        note:
                          e
                            .target
                            .value,
                      }
                    )
                  }
                  placeholder="備考（任意）"
                  className="mt-3 w-full rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100"
                />
              )}

            </div>
          )
        })}
      </div>

      {/* =================================
          エラー
      ================================= */}
      {error && (
        <div className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* =================================
          保存成功
      ================================= */}
      {message && (
        <div className="mt-6 rounded-lg bg-green-50 p-4 text-sm text-green-700">
          {message}
        </div>
      )}

      {/* =================================
          保存ボタン
      ================================= */}
      {!formLocked && (
        <button
          type="button"
          onClick={
            handleSave
          }
          disabled={
            loading
          }
          className="mt-6 w-full rounded-xl bg-black py-4 font-medium text-white disabled:opacity-50"
        >
          {loading
            ? '保存中...'
            : 'シフトを保存'}
        </button>
      )}

    </div>
  )
}