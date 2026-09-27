import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/components/LogoutButton'
import MonthSelector from '@/components/MonthSelector'
import ShiftPdfButton from '@/components/ShiftPdfButton'
import ShiftLockButton from './ShiftLockButton'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = {
  params: Promise<{
    storeId: string
  }>
  searchParams: Promise<{
    year?: string
    month?: string
  }>
}

export default async function StorePage({
  params,
  searchParams,
}: Props) {
  const { storeId } = await params
  const query = await searchParams

  const supabase = await createClient()

  // =========================
  // ログイン確認
  // =========================
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // =========================
  // 自分のプロフィール
  // =========================
  const {
    data: myProfile,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select(
      'id, name, system_role, active'
    )
    .eq('id', user.id)
    .single()

  if (
    profileError ||
    !myProfile
  ) {
    return (
      <main className="min-h-screen bg-gray-100 p-6">
        <div className="mx-auto max-w-6xl rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold">
            プロフィール情報を取得できませんでした
          </h1>

          <pre className="mt-4 whitespace-pre-wrap rounded bg-gray-100 p-4 text-sm">
            {JSON.stringify(
              profileError,
              null,
              2
            )}
          </pre>
        </div>
      </main>
    )
  }

  // =========================
  // 店舗取得
  // =========================
  const {
    data: store,
    error: storeError,
  } = await supabase
    .from('stores')
    .select(
      'id, name, active'
    )
    .eq('id', storeId)
    .single()

  if (
    storeError ||
    !store
  ) {
    return (
      <main className="min-h-screen bg-gray-100 p-6">
        <div className="mx-auto max-w-6xl rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold">
            店舗が見つかりません
          </h1>

          <pre className="mt-4 whitespace-pre-wrap rounded bg-gray-100 p-4 text-sm">
            {JSON.stringify(
              storeError,
              null,
              2
            )}
          </pre>
        </div>
      </main>
    )
  }

  // =========================
  // 店舗での自分の権限
  // =========================
  const {
    data: myMembership,
  } = await supabase
    .from(
      'store_memberships'
    )
    .select(
      'role, active'
    )
    .eq(
      'store_id',
      storeId
    )
    .eq(
      'user_id',
      user.id
    )
    .eq(
      'active',
      true
    )
    .maybeSingle()

  const isSuperAdmin =
    myProfile.system_role ===
    'super_admin'

  const isStoreAdmin =
    myMembership?.role ===
    'admin'

  const canManage =
    isSuperAdmin ||
    isStoreAdmin

  if (
    !isSuperAdmin &&
    !myMembership
  ) {
    return (
      <main className="min-h-screen bg-gray-100 p-6">
        <div className="mx-auto max-w-6xl rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold">
            この店舗を閲覧する権限がありません
          </h1>

          <Link
            href="/dashboard"
            prefetch={false}
            className="mt-4 inline-block text-gray-500 hover:text-black"
          >
            ← 戻る
          </Link>
        </div>
      </main>
    )
  }

  // =========================
  // 年月
  // URL指定なしなら現在年月
  // =========================
  const now =
    new Date()

  const requestedYear =
    Number(query.year)

  const requestedMonth =
    Number(query.month)

  const year =
    Number.isInteger(
      requestedYear
    ) &&
    requestedYear >= 2020 &&
    requestedYear <= 2100
      ? requestedYear
      : now.getFullYear()

  const month =
    Number.isInteger(
      requestedMonth
    ) &&
    requestedMonth >= 1 &&
    requestedMonth <= 12
      ? requestedMonth
      : now.getMonth() + 1

  // =========================
  // 対象期間
  // =========================
  const firstDay =
    `${year}-${String(
      month
    ).padStart(
      2,
      '0'
    )}-01`

  const lastDateNumber =
    new Date(
      year,
      month,
      0
    ).getDate()

  const lastDay =
    `${year}-${String(
      month
    ).padStart(
      2,
      '0'
    )}-${String(
      lastDateNumber
    ).padStart(
      2,
      '0'
    )}`

  // =========================
  // シフト受付状態
  // =========================
  const {
    data: shiftPeriod,
  } = await supabase
    .from(
      'shift_periods'
    )
    .select(
      'status, deadline'
    )
    .eq(
      'store_id',
      storeId
    )
    .eq(
      'year',
      year
    )
    .eq(
      'month',
      month
    )
    .maybeSingle()

  const shiftStatus:
    | 'none'
    | 'open'
    | 'locked' =
    !shiftPeriod
      ? 'none'
      : shiftPeriod.status ===
          'locked'
        ? 'locked'
        : 'open'

  // =========================
  // 所属スタッフ
  // =========================
  const {
    data: memberships,
    error:
      membershipError,
  } = await supabase
    .from(
      'store_memberships'
    )
    .select(`
      id,
      role,
      user_id,
      active,
      created_at,
      profiles (
        id,
        name,
        active
      )
    `)
    .eq(
      'store_id',
      storeId
    )
    .eq(
      'active',
      true
    )
    .order('created_at')

  // =========================
  // 対象月シフト
  // =========================
  const {
    data: shifts,
    error: shiftsError,
  } = await supabase
    .from('shifts')
    .select(`
      id,
      user_id,
      shift_date,
      start_time,
      end_time,
      end_type,
      is_off,
      note
    `)
    .eq(
      'store_id',
      storeId
    )
    .gte(
      'shift_date',
      firstDay
    )
    .lte(
      'shift_date',
      lastDay
    )

  // =========================
  // 提出状況
  // =========================
  const {
    data: submissions,
    error:
      submissionsError,
  } = await supabase
    .from(
      'shift_submissions'
    )
    .select(`
      user_id,
      status,
      submitted_at
    `)
    .eq(
      'store_id',
      storeId
    )
    .eq(
      'year',
      year
    )
    .eq(
      'month',
      month
    )

  // =========================
  // 日付一覧
  // =========================
  const days =
    Array.from(
      {
        length:
          lastDateNumber,
      },
      (_, i) =>
        i + 1
    )

  // =========================
  // 提出人数
  // =========================
  const totalCount =
    memberships?.length ??
    0

  const submittedCount =
    submissions?.filter(
      (submission) =>
        submission.status ===
        'submitted'
    ).length ?? 0

  const notSubmittedCount =
    Math.max(
      totalCount -
        submittedCount,
      0
    )

  // =========================
  // スタッフ提出状況
  // =========================
  function getSubmissionStatus(
    userId: string
  ) {
    const submission =
      submissions?.find(
        (item) =>
          item.user_id ===
          userId
      )

    return (
      submission?.status ===
      'submitted'
    )
      ? 'submitted'
      : 'draft'
  }

  // =========================
  // シフト表示文字
  // =========================
  function getShiftText(
    userId: string,
    day: number
  ) {
    const date =
      `${year}-${String(
        month
      ).padStart(
        2,
        '0'
      )}-${String(
        day
      ).padStart(
        2,
        '0'
      )}`

    const shift =
      shifts?.find(
        (item) =>
          item.user_id ===
            userId &&
          item.shift_date ===
            date
      )

    if (!shift) {
      return ''
    }

    if (shift.is_off) {
      return '休'
    }

    const start =
      shift.start_time
        ? shift.start_time.slice(
            0,
            5
          )
        : ''

    let end = ''

    if (
      shift.end_type ===
      'last'
    ) {
      end = 'L'
    } else if (
      shift.end_time
    ) {
      end =
        shift.end_time.slice(
          0,
          5
        )
    }

    if (
      !start &&
      !end
    ) {
      return ''
    }

    return `${start}-${end}`
  }

  // =========================
  // PDF用データ
  // =========================
  const pdfStaffData =
    (memberships ?? [])
      .map(
        (
          membership
        ) => {
          const profileRaw =
            membership.profiles

          const memberProfile =
            Array.isArray(
              profileRaw
            )
              ? profileRaw[0]
              : profileRaw

          if (
            !memberProfile
          ) {
            return null
          }

          const staffShifts:
            Record<
              number,
              string
            > = {}

          for (
            let day = 1;
            day <=
            lastDateNumber;
            day++
          ) {
            staffShifts[
              day
            ] =
              getShiftText(
                membership.user_id,
                day
              )
          }

          return {
            name:
              memberProfile.name,

            role:
              membership.role ===
              'admin'
                ? '幹部'
                : 'スタッフ',

            shifts:
              staffShifts,
          }
        }
      )
      .filter(
        (
          item
        ): item is {
          name: string
          role: string
          shifts: Record<
            number,
            string
          >
        } => item !== null
      )

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="mx-auto max-w-[1600px]">

        {/* =====================
            ヘッダー
        ===================== */}
        <div className="rounded-2xl bg-white p-6 shadow">

          <Link
            href="/dashboard"
            prefetch={false}
            className="text-sm text-gray-500 hover:text-black"
          >
            ← 店舗一覧へ戻る
          </Link>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">

            <div>
              <h1 className="text-2xl font-bold">
                {store.name}
              </h1>

              <p className="mt-1 text-gray-500">
                シフト管理
              </p>

              {!canManage && (
                <p className="mt-2 text-sm text-gray-400">
                  {myProfile.name}
                  {' / '}
                  スタッフ
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">

              {canManage && (
                <Link
                  href={`/stores/${storeId}/staff`}
                  prefetch={false}
                  className="rounded-lg border px-4 py-2 hover:bg-gray-50"
                >
                  スタッフ管理
                </Link>
              )}

              <LogoutButton />

            </div>
          </div>

          {!canManage && (
            <div className="mt-5">
              <Link
                href={`/stores/${storeId}/shift?year=${year}&month=${month}`}
                prefetch={false}
                className="inline-block rounded-lg bg-black px-5 py-3 text-white"
              >
                自分のシフトを入力
              </Link>
            </div>
          )}
        </div>

        {/* =====================
            月間シフト
        ===================== */}
        <div className="mt-6 rounded-2xl bg-white p-6 shadow">

          <div className="flex flex-wrap items-center justify-between gap-4">

            <MonthSelector
              year={year}
              month={month}
            />

            {canManage && (
              <div className="flex flex-wrap gap-2">

                <ShiftLockButton
                  storeId={
                    storeId
                  }
                  year={year}
                  month={
                    month
                  }
                  currentStatus={
                    shiftStatus
                  }
                />

                <ShiftPdfButton
                  storeName={
                    store.name
                  }
                  year={year}
                  month={
                    month
                  }
                  daysInMonth={
                    lastDateNumber
                  }
                  staffData={
                    pdfStaffData
                  }
                />

              </div>
            )}

          </div>

          {/* =====================
              受付状態
          ===================== */}
          <div className="mt-4">

            {shiftStatus ===
              'none' && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
                受付未開始
              </span>
            )}

            {shiftStatus ===
              'open' && (
              <span className="rounded-full bg-green-50 px-3 py-1 text-sm text-green-700">
                シフト受付中
              </span>
            )}

            {shiftStatus ===
              'locked' && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
                シフト確定済み
              </span>
            )}

          </div>

          {/* =====================
              管理者：提出状況
          ===================== */}
          {canManage && (
            <div className="mt-6 flex flex-wrap gap-3">

              <div className="min-w-[130px] rounded-xl bg-green-50 px-4 py-3">
                <div className="text-xs text-green-700">
                  提出済み
                </div>

                <div className="mt-1 text-xl font-bold text-green-800">
                  {submittedCount}
                  名
                </div>
              </div>

              <div className="min-w-[130px] rounded-xl bg-yellow-50 px-4 py-3">
                <div className="text-xs text-yellow-700">
                  未提出
                </div>

                <div className="mt-1 text-xl font-bold text-yellow-800">
                  {notSubmittedCount}
                  名
                </div>
              </div>

              <div className="min-w-[130px] rounded-xl bg-gray-100 px-4 py-3">
                <div className="text-xs text-gray-600">
                  在籍人数
                </div>

                <div className="mt-1 text-xl font-bold text-gray-800">
                  {totalCount}
                  名
                </div>
              </div>

            </div>
          )}

          {/* =====================
              エラー
          ===================== */}
          {membershipError && (
            <div className="mt-5 rounded-lg bg-red-50 p-4 text-red-600">
              スタッフ情報を取得できませんでした。

              <pre className="mt-2 whitespace-pre-wrap text-xs">
                {JSON.stringify(
                  membershipError,
                  null,
                  2
                )}
              </pre>
            </div>
          )}

          {shiftsError && (
            <div className="mt-5 rounded-lg bg-red-50 p-4 text-red-600">
              シフト情報を取得できませんでした。

              <pre className="mt-2 whitespace-pre-wrap text-xs">
                {JSON.stringify(
                  shiftsError,
                  null,
                  2
                )}
              </pre>
            </div>
          )}

          {submissionsError && (
            <div className="mt-5 rounded-lg bg-red-50 p-4 text-red-600">
              提出状況を取得できませんでした。

              <pre className="mt-2 whitespace-pre-wrap text-xs">
                {JSON.stringify(
                  submissionsError,
                  null,
                  2
                )}
              </pre>
            </div>
          )}

          {/* =====================
              シフト表
          ===================== */}
          <div className="mt-6 overflow-x-auto">

            <table className="min-w-max border-collapse text-sm">

              <thead>
                <tr>

                  <th className="sticky left-0 z-20 min-w-[190px] border bg-gray-100 px-3 py-3 text-left">
                    スタッフ
                  </th>

                  {days.map(
                    (day) => {
                      const date =
                        new Date(
                          year,
                          month -
                            1,
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

                      return (
                        <th
                          key={
                            day
                          }
                          className="min-w-[85px] border bg-gray-100 px-2 py-2 text-center"
                        >
                          <div>
                            {
                              day
                            }
                          </div>

                          <div className="text-xs font-normal text-gray-500">
                            {
                              week
                            }
                          </div>
                        </th>
                      )
                    }
                  )}

                </tr>
              </thead>

              <tbody>

                {memberships &&
                memberships.length >
                  0 ? (
                  memberships.map(
                    (
                      membership
                    ) => {
                      const profileRaw =
                        membership.profiles

                      const memberProfile =
                        Array.isArray(
                          profileRaw
                        )
                          ? profileRaw[0]
                          : profileRaw

                      if (
                        !memberProfile
                      ) {
                        return null
                      }

                      if (
                        !canManage &&
                        membership.user_id !==
                          user.id
                      ) {
                        return null
                      }

                      const submissionStatus =
                        getSubmissionStatus(
                          membership.user_id
                        )

                      return (
                        <tr
                          key={
                            membership.id
                          }
                        >

                          <td className="sticky left-0 z-10 border bg-white px-3 py-3">

                            {canManage ? (
                              <Link
                                href={`/stores/${storeId}/shift/${membership.user_id}?year=${year}&month=${month}`}
                                prefetch={
                                  false
                                }
                                className="font-medium underline-offset-4 hover:underline"
                              >
                                {
                                  memberProfile.name
                                }
                              </Link>
                            ) : (
                              <div className="font-medium">
                                {
                                  memberProfile.name
                                }
                              </div>
                            )}

                            <div className="mt-1 text-xs text-gray-400">
                              {membership.role ===
                              'admin'
                                ? '幹部'
                                : 'スタッフ'}
                            </div>

                            {canManage && (
                              <div className="mt-2">

                                {submissionStatus ===
                                'submitted' ? (
                                  <span className="inline-block rounded-full bg-green-50 px-2 py-1 text-xs text-green-700">
                                    提出済み
                                  </span>
                                ) : (
                                  <span className="inline-block rounded-full bg-yellow-50 px-2 py-1 text-xs text-yellow-700">
                                    未提出
                                  </span>
                                )}

                              </div>
                            )}

                          </td>

                          {days.map(
                            (
                              day
                            ) => (
                              <td
                                key={
                                  day
                                }
                                className="border px-2 py-3 text-center"
                              >
                                {getShiftText(
                                  membership.user_id,
                                  day
                                )}
                              </td>
                            )
                          )}

                        </tr>
                      )
                    }
                  )
                ) : (
                  <tr>
                    <td
                      colSpan={
                        lastDateNumber +
                        1
                      }
                      className="border p-8 text-center text-gray-500"
                    >
                      この店舗にはまだスタッフが登録されていません。
                    </td>
                  </tr>
                )}

              </tbody>
            </table>

          </div>

        </div>
      </div>
    </main>
  )
}