import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ShiftEditForm from '../ShiftEditForm'
import MonthSelector from '@/components/MonthSelector'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = {
  params: Promise<{
    storeId: string
    userId: string
  }>
  searchParams: Promise<{
    year?: string
    month?: string
  }>
}

export default async function AdminShiftEditPage({
  params,
  searchParams,
}: Props) {
  const { storeId, userId } = await params
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
  // 操作者プロフィール
  // =========================
  const { data: myProfile } = await supabase
    .from('profiles')
    .select('id, name, system_role')
    .eq('id', user.id)
    .single()

  if (!myProfile) {
    redirect('/dashboard')
  }

  const isSuperAdmin =
    myProfile.system_role === 'super_admin'

  // =========================
  // 店舗admin確認
  // =========================
  let isStoreAdmin = false

  if (!isSuperAdmin) {
    const { data: myMembership } = await supabase
      .from('store_memberships')
      .select('role')
      .eq('store_id', storeId)
      .eq('user_id', user.id)
      .eq('active', true)
      .maybeSingle()

    isStoreAdmin =
      myMembership?.role === 'admin'
  }

  if (!isSuperAdmin && !isStoreAdmin) {
    redirect(`/stores/${storeId}`)
  }

  // =========================
  // 店舗
  // =========================
  const { data: store } = await supabase
    .from('stores')
    .select('id, name')
    .eq('id', storeId)
    .single()

  if (!store) {
    redirect('/dashboard')
  }

  // =========================
  // 編集対象スタッフ
  // =========================
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('id', userId)
    .single()

  if (!targetProfile) {
    redirect(`/stores/${storeId}`)
  }

  // =========================
  // この店舗の所属確認
  // =========================
  const { data: targetMembership } = await supabase
    .from('store_memberships')
    .select('id, role, active')
    .eq('store_id', storeId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!targetMembership) {
    redirect(`/stores/${storeId}`)
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
  // 対象月のシフト
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
    .eq('user_id', userId)
    .gte('shift_date', firstDay)
    .lte('shift_date', lastDay)
    .order('shift_date')

  // =========================
  // 提出状態
  // =========================
  const { data: submission } = await supabase
    .from('shift_submissions')
    .select('status, submitted_at')
    .eq('store_id', storeId)
    .eq('user_id', userId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle()

  const submissionStatus =
    submission?.status === 'submitted'
      ? 'submitted'
      : 'draft'

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
            ← 月間シフトへ戻る
          </Link>

          <h1 className="mt-4 text-2xl font-bold">
            シフト修正
          </h1>

          <p className="mt-2 text-gray-500">
            {store.name}
          </p>

          <p className="mt-1 font-medium">
            {targetProfile.name}
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

          {shiftsError && (
            <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
              シフト情報の取得に失敗しました。

              <pre className="mt-2 whitespace-pre-wrap text-xs">
                {JSON.stringify(
                  shiftsError,
                  null,
                  2
                )}
              </pre>
            </div>
          )}

          <div className="mt-6 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
            <p className="font-medium">
              管理者編集
            </p>

            <p className="mt-1">
              管理者はスタッフの提出状況やシフト確定状態に関係なく修正できます。
            </p>
          </div>

          <ShiftEditForm
            key={`${year}-${month}-${userId}`}
            storeId={storeId}
            userId={userId}
            year={year}
            month={month}
            daysInMonth={lastDateNumber}
            initialShifts={shifts ?? []}
            locked={false}
            submitted={false}
          />

        </div>

      </div>
    </main>
  )
}