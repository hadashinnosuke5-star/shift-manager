import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/components/LogoutButton'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
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
  // プロフィール取得
  // =========================
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, system_role, active')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
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
  // super_admin
  // =========================
  if (profile.system_role === 'super_admin') {
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name, active')
      .eq('active', true)
      .order('name')

    return (
      <main className="min-h-screen bg-gray-100 p-4 md:p-6">
        <div className="mx-auto max-w-5xl">

          {/* ヘッダー */}
          <div className="mb-8 rounded-2xl bg-white p-6 shadow">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">
                  シフト管理
                </h1>

                <p className="mt-2 text-gray-600">
                  {profile.name} さん
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  権限：super_admin
                </p>
              </div>

              <LogoutButton />
            </div>
          </div>

          {/* 店舗一覧 */}
          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold">
              店舗一覧
            </h2>

            {storesError && (
              <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
                店舗情報の取得に失敗しました。

                <pre className="mt-2 whitespace-pre-wrap text-xs">
                  {JSON.stringify(storesError, null, 2)}
                </pre>
              </div>
            )}

            <div className="mt-5 space-y-3">
              {stores && stores.length > 0 ? (
                stores.map((store) => (
                  <Link
                    key={store.id}
                    href={`/stores/${store.id}`}
                    prefetch={false}
                    className="block rounded-xl border border-gray-200 p-4 transition hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-medium">
                        {store.name}
                      </span>

                      <span className="text-gray-400">
                        →
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-gray-500">
                  店舗が登録されていません。
                </p>
              )}
            </div>
          </div>

          {/* super_admin 専用 */}
          <div className="mt-6 rounded-2xl bg-white p-6 shadow">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  すごろく管理
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Pillow版・Recovery版のゲーム設定とマス内容を管理します。
                </p>
              </div>

              <Link
                href="/sugoroku"
                prefetch={false}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-black px-6 py-3 font-bold text-white transition hover:bg-gray-800"
              >
                🎲 すごろく管理
              </Link>
            </div>
          </div>

        </div>
      </main>
    )
  }

  // =========================
  // 一般ユーザー
  // =========================
  const { data: memberships, error: membershipError } = await supabase
    .from('store_memberships')
    .select(`
      id,
      role,
      store_id,
      active,
      stores (
        id,
        name,
        active
      )
    `)
    .eq('user_id', user.id)
    .eq('active', true)

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="mx-auto max-w-5xl">

        {/* ヘッダー */}
        <div className="mb-8 rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">
                シフト管理
              </h1>

              <p className="mt-2 text-gray-600">
                {profile.name} さん
              </p>
            </div>

            <LogoutButton />
          </div>
        </div>

        {/* エラー */}
        {membershipError && (
          <div className="mb-6 rounded-2xl bg-red-50 p-6 text-red-600">
            所属店舗情報を取得できませんでした。

            <pre className="mt-3 whitespace-pre-wrap text-xs">
              {JSON.stringify(membershipError, null, 2)}
            </pre>
          </div>
        )}

        {/* 所属店舗 */}
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold">
            所属店舗
          </h2>

          <div className="mt-5 space-y-3">
            {memberships && memberships.length > 0 ? (
              memberships.map((membership) => {
                const storeRaw = membership.stores

                const store = Array.isArray(storeRaw)
                  ? storeRaw[0]
                  : storeRaw

                if (!store) {
                  return null
                }

                return (
                  <Link
                    key={membership.id}
                    href={`/stores/${membership.store_id}`}
                    prefetch={false}
                    className="block rounded-xl border border-gray-200 p-4 transition hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-medium">
                          {store.name}
                        </div>

                        <div className="mt-1 text-sm text-gray-500">
                          {membership.role === 'admin'
                            ? '幹部'
                            : 'スタッフ'}
                        </div>
                      </div>

                      <span className="text-gray-400">
                        →
                      </span>
                    </div>
                  </Link>
                )
              })
            ) : (
              <p className="text-gray-500">
                所属店舗がありません。
              </p>
            )}
          </div>
        </div>

      </div>
    </main>
  )
}
