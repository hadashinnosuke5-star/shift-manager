import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ShiftEditForm from './ShiftEditForm'
import MonthSelector from '@/components/MonthSelector'

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

export default async function ShiftEditPage({
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
  // プロフィール
  // =========================
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, system_role, active')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return (
      <main className="min-h-screen bg-gray-100 p-6">
        <div className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold">
            プロフィール情報を取得できませんでした
          </h1>

          <pre className="mt-4 whitespace-pre-wrap rounded bg-gray-100 p-4 text-sm">
            {JSON.stringify(profileError, null, 2)}
          </pre>
        </div>
      </main>
    )
  }

  // =========================
  // 店舗取得
  // =========================
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id, name, active')
    .eq('id', storeId)
    .single()

  if (storeError || !store) {
    return (
      <main className="min-h-screen bg-gray-100 p-6">
        <div className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold">
            店舗が見つかりません
          </h1>

          <pre className="mt-4 whitespace-pre-wrap rounded bg-gray-100 p-4 text-sm">
            {JSON.stringify(storeError, null, 2)}
          </pre>
        </div>
      </main>
    )
  }

  // =========================
  // 店舗所属確認
  // =========================
  const { data: membership } = await supabase
    .from('store_memberships')
    .select('id, role, active')
    .eq('store_id', storeId)
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle()

  const isSuperAdmin =
    profile.system_role === 'super_admin'

  if (!membership && !isSuperAdmin) {
    redirect('/dashboard')
  }

  // =========================
  // 年月
  // URL指定がなければ現在年月
  // =========================
  const now = new Date()

  const requestedYear =
    Number(query.year)

  const requestedMonth =
    Number(query.month)

  const year =
    Number.isInteger(requestedYear) &&
    requestedYear >= 2020 &&
    requestedYear <= 2100
      ? requestedYear
      : now.getFullYear()

  const month =
    Number.isInteger(requestedMonth) &&
    requestedMonth >= 1 &&
    requestedMonth <= 12
      ? requestedMonth
      : now.getMonth() + 1

  // =========================
  // 対象期間
  // =========================
  const firstDay =
    `${year}-${String(month).padStart(2, '0')}-01`

  const lastDateNumber =
    new Date(
      year,
      month,
      0
    ).getDate()

  const lastDay =
    `${year}-${String(month).padStart(2, '0')}-${String(
      lastDateNumber
    ).padStart(2, '0')}`

  // =========================
  // シフト受付状態
  // =========================
  const { data: period, error: periodError } = await supabase
    .from('shift_periods')
    .select('status, deadline')
    .eq('store_id', storeId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle()

  // =========================
  // 自分のシフト
  // =========================
  const { data: shifts, error: shiftsError } = await supabase
    .from('shifts')
    .select(`
      id,
      shift_date,
      start_time,
      end_time,
      end_type,
      is_off,
      note
    `)
    .eq('store_id', storeId)
    .eq('user_id', user.id)
    .gte('shift_date', firstDay)
    .lte('shift_date', lastDay)
    .order('shift_date')

  // =========================
  // 提出状況
  // =========================
  const { data: submission, error: submissionError } = await supabase
    .from('shift_submissions')
    .select('status, submitted_at')
    .eq('store_id', storeId)
    .eq('user_id', user.id)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle()

  const submissionStatus:
    'draft' | 'submitted' =
    submission?.status === 'submitted'
      ? 'submitted'
      : 'draft'

  const locked =
    period?.status !== 'open'

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="mx-auto max-w-4xl">

        {/* ヘッダー */}
        <div className="rounded-2xl bg-white p-6 shadow">
          <Link
            href={`/stores/${storeId}?year=${year}&month=${month}`}
            prefetch={false}
            className="text-sm text-gray-500 hover:text-black"
          >
            ← シフト表へ戻る
          </Link>

          <h1 className="mt-4 text-2xl font-bold">
            シフト入力
          </h1>

          <p className="mt-2 text-gray-500">
            {store.name}
          </p>

          <p className="mt-1 text-gray-500">
            {profile.name} さん
          </p>
        </div>

        {/* 本体 */}
        <div className="mt-6 rounded-2xl bg-white p-6 shadow">

          <div className="flex flex-wrap items-center justify-between gap-4">
            <MonthSelector
              year={year}
              month={month}
            />

            <span
              className={
                period?.status === 'open'
                  ? 'rounded-full bg-green-50 px-3 py-1 text-sm text-green-700'
                  : 'rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600'
              }
            >
              {period?.status === 'open'
                ? '受付中'
                : '受付終了'}
            </span>
          </div>

          {/* エラー */}
          {periodError && (
            <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
              シフト受付情報の取得に失敗しました。

              <pre className="mt-2 whitespace-pre-wrap text-xs">
                {JSON.stringify(periodError, null, 2)}
              </pre>
            </div>
          )}

          {shiftsError && (
            <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
              シフト情報の取得に失敗しました。

              <pre className="mt-2 whitespace-pre-wrap text-xs">
                {JSON.stringify(shiftsError, null, 2)}
              </pre>
            </div>
          )}

          {submissionError && (
            <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
              提出状況の取得に失敗しました。

              <pre className="mt-2 whitespace-pre-wrap text-xs">
                {JSON.stringify(submissionError, null, 2)}
              </pre>
            </div>
          )}

          {/* 提出状況 */}
          <div className="mt-6 rounded-xl border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">

              <div>
                <p className="text-sm text-gray-500">
                  提出状況
                </p>

                <p className="mt-1 font-bold">
                  {submissionStatus === 'submitted'
                    ? '提出済み'
                    : '未提出'}
                </p>

                {submission?.submitted_at && (
                  <p className="mt-1 text-xs text-gray-400">
                    提出日時：
                    {new Date(
                      submission.submitted_at
                    ).toLocaleString('ja-JP')}
                  </p>
                )}
              </div>

              <span
                className={
                  submissionStatus === 'submitted'
                    ? 'rounded-full bg-green-50 px-3 py-1 text-sm text-green-700'
                    : 'rounded-full bg-yellow-50 px-3 py-1 text-sm text-yellow-700'
                }
              >
                {submissionStatus === 'submitted'
                  ? '提出済み'
                  : '未提出'}
              </span>

            </div>
          </div>

          {/* シフト入力 */}
          <ShiftEditForm
            key={`${year}-${month}`}
            storeId={storeId}
            userId={user.id}
            year={year}
            month={month}
            daysInMonth={lastDateNumber}
            initialShifts={shifts ?? []}
            locked={locked}
            submitted={
              submissionStatus === 'submitted'
            }
          />
        </div>
      </div>
    </main>
  )
}