import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/components/LogoutButton'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = {
  params: Promise<{
    storeId: string
  }>
}

export default async function StaffPage({ params }: Props) {
  const { storeId } = await params

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
  // 自分のプロフィール取得
  // =========================
  const { data: myProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, system_role, active')
    .eq('id', user.id)
    .single()

  if (profileError || !myProfile) {
    return (
      <main className="min-h-screen bg-gray-100 p-6">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow">
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
    .select('id, name')
    .eq('id', storeId)
    .single()

  if (storeError || !store) {
    return (
      <main className="min-h-screen bg-gray-100 p-6">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow">
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
  // 権限確認
  // =========================
  const isSuperAdmin =
    myProfile.system_role === 'super_admin'

  let isStoreAdmin = false

  if (!isSuperAdmin) {
    const { data: myMembership } = await supabase
      .from('store_memberships')
      .select('role, active')
      .eq('store_id', storeId)
      .eq('user_id', user.id)
      .eq('active', true)
      .maybeSingle()

    isStoreAdmin =
      myMembership?.role === 'admin'
  }

  const canManage =
    isSuperAdmin || isStoreAdmin

  // 一般スタッフはスタッフ管理画面に入れない
  if (!canManage) {
    redirect(`/stores/${storeId}`)
  }

  // =========================
  // 所属スタッフ取得
  // =========================
  const { data: memberships, error: membershipError } = await supabase
    .from('store_memberships')
    .select(`
      id,
      user_id,
      role,
      active,
      created_at,
      profiles (
        id,
        name,
        active
      )
    `)
    .eq('store_id', storeId)
    .order('created_at')

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="mx-auto max-w-5xl">

        {/* =========================
            ヘッダー
        ========================= */}
        <div className="rounded-2xl bg-white p-6 shadow">
          <Link
            href={`/stores/${storeId}`}
            prefetch={false}
            className="text-sm text-gray-500 hover:text-black"
          >
            ← シフト管理へ戻る
          </Link>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">
                スタッフ管理
              </h1>

              <p className="mt-1 text-gray-500">
                {store.name}
              </p>

              <p className="mt-1 text-xs text-gray-400">
                ログイン中：{myProfile.name}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/stores/${storeId}/staff/new`}
                prefetch={false}
                className="rounded-lg bg-black px-5 py-3 text-white hover:bg-gray-800"
              >
                ＋ スタッフ追加
              </Link>

              <LogoutButton />
            </div>
          </div>
        </div>

        {/* =========================
            エラー
        ========================= */}
        {membershipError && (
          <div className="mt-6 rounded-2xl bg-red-50 p-6 text-red-600">
            スタッフ情報を取得できませんでした。

            <pre className="mt-3 whitespace-pre-wrap text-xs">
              {JSON.stringify(membershipError, null, 2)}
            </pre>
          </div>
        )}

        {/* =========================
            スタッフ一覧
        ========================= */}
        <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow">
          <div className="border-b p-6">
            <h2 className="text-lg font-bold">
              所属スタッフ
            </h2>
          </div>

          {memberships && memberships.length > 0 ? (
            <div className="divide-y">
              {memberships.map((membership) => {
                const profileRaw =
                  membership.profiles

                const profile =
                  Array.isArray(profileRaw)
                    ? profileRaw[0]
                    : profileRaw

                if (!profile) {
                  return null
                }

                return (
                  <div
                    key={membership.id}
                    className="flex flex-wrap items-center justify-between gap-4 p-6"
                  >
                    <div>
                      <p className="font-medium">
                        {profile.name}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2 text-sm">
                        <span className="rounded-full bg-gray-100 px-3 py-1">
                          {membership.role === 'admin'
                            ? '幹部'
                            : 'スタッフ'}
                        </span>

                        <span
                          className={
                            membership.active
                              ? 'rounded-full bg-green-50 px-3 py-1 text-green-700'
                              : 'rounded-full bg-gray-100 px-3 py-1 text-gray-500'
                          }
                        >
                          {membership.active
                            ? '在籍'
                            : '退店'}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/stores/${storeId}/staff/${membership.user_id}`}
                      prefetch={false}
                      className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
                    >
                      編集
                    </Link>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-10 text-center text-gray-500">
              まだスタッフが登録されていません。
            </div>
          )}
        </div>

      </div>
    </main>
  )
}