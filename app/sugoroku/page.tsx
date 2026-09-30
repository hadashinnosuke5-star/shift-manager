import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type GameRow = {
  id: string
  store_id: string | null
  name: string
  mode_key: 'pillow' | 'recovery'
  board_size: 30 | 40 | 50
  is_active: boolean
}

type StoreRow = {
  id: string
  name: string
}

export default async function SugorokuTopPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('system_role')
    .eq('id', user.id)
    .single()

  if (profile?.system_role !== 'super_admin') {
    redirect('/dashboard')
  }

  const [
    { data: games, error: gamesError },
    { data: stores, error: storesError },
  ] = await Promise.all([
    supabase
      .from('sugoroku_games')
      .select('id, store_id, name, mode_key, board_size, is_active')
      .order('mode_key')
      .order('board_size'),

    supabase
      .from('stores')
      .select('id, name')
      .eq('active', true)
      .order('name'),
  ])

  const gameRows = (games ?? []) as GameRow[]
  const storeRows = (stores ?? []) as StoreRow[]

  function findStoreName(
    storeId: string | null
  ) {
    if (!storeId) {
      return '未設定'
    }

    return (
      storeRows.find(
        (store) => store.id === storeId
      )?.name ?? '不明な店舗'
    )
  }

  function getModeData(
    mode: 'pillow' | 'recovery'
  ) {
    const rows = gameRows.filter(
      (game) => game.mode_key === mode
    )

    const assigned =
      rows.find((game) => game.store_id) ??
      null

    return {
      rows,
      storeId:
        assigned?.store_id ?? null,
      storeName:
        findStoreName(
          assigned?.store_id ?? null
        ),
    }
  }

  const pillow = getModeData('pillow')
  const recovery = getModeData('recovery')

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="mx-auto max-w-5xl">

        <div className="rounded-2xl bg-white p-6 shadow">
          <Link
            href="/dashboard"
            prefetch={false}
            className="text-sm text-gray-500"
          >
            ← ダッシュボードへ戻る
          </Link>

          <div className="mt-4">
            <h1 className="text-2xl font-bold">
              すごろく管理
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Pillow版・Recovery版の設定を管理します。
            </p>

            <p className="mt-1 text-xs font-medium text-gray-400">
              super_admin 専用
            </p>
          </div>
        </div>

        {(gamesError || storesError) && (
          <div className="mt-6 rounded-2xl bg-red-50 p-5 text-sm text-red-600">
            管理データの取得に失敗しました。

            {gamesError && (
              <div className="mt-2">
                games: {gamesError.message}
              </div>
            )}

            {storesError && (
              <div className="mt-2">
                stores: {storesError.message}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 grid gap-5 md:grid-cols-2">

          <div className="rounded-2xl bg-white p-6 shadow">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-pink-500">
                  PILLOW
                </div>

                <h2 className="mt-1 text-2xl font-bold">
                  Pillow版
                </h2>
              </div>

              <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-medium text-pink-700">
                {pillow.rows.length}ゲーム
              </span>
            </div>

            <div className="mt-5 rounded-xl bg-gray-50 p-4">
              <div className="text-xs text-gray-400">
                紐付け店舗
              </div>

              <div className="mt-1 font-bold">
                {pillow.storeName}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[30, 40, 50].map(
                (size) => {
                  const game =
                    pillow.rows.find(
                      (row) =>
                        row.board_size ===
                        size
                    )

                  return (
                    <span
                      key={size}
                      className={[
                        'rounded-full px-3 py-1 text-xs font-medium',
                        game?.is_active
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-500',
                      ].join(' ')}
                    >
                      {size}マス
                    </span>
                  )
                }
              )}
            </div>

            {pillow.storeId ? (
              <Link
                href={`/stores/${pillow.storeId}/sugoroku`}
                prefetch={false}
                className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-black px-5 py-3 font-bold text-white"
              >
                Pillow版を編集
              </Link>
            ) : (
              <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
                店舗への紐付けがまだありません。
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white p-6 shadow">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-blue-500">
                  RECOVERY
                </div>

                <h2 className="mt-1 text-2xl font-bold">
                  Recovery版
                </h2>
              </div>

              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                {recovery.rows.length}ゲーム
              </span>
            </div>

            <div className="mt-5 rounded-xl bg-gray-50 p-4">
              <div className="text-xs text-gray-400">
                紐付け店舗
              </div>

              <div className="mt-1 font-bold">
                {recovery.storeName}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[30, 40, 50].map(
                (size) => {
                  const game =
                    recovery.rows.find(
                      (row) =>
                        row.board_size ===
                        size
                    )

                  return (
                    <span
                      key={size}
                      className={[
                        'rounded-full px-3 py-1 text-xs font-medium',
                        game?.is_active
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-500',
                      ].join(' ')}
                    >
                      {size}マス
                    </span>
                  )
                }
              )}
            </div>

            {recovery.storeId ? (
              <Link
                href={`/stores/${recovery.storeId}/sugoroku`}
                prefetch={false}
                className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-black px-5 py-3 font-bold text-white"
              >
                Recovery版を編集
              </Link>
            ) : (
              <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
                店舗への紐付けがまだありません。
              </div>
            )}
          </div>

        </div>

      </div>
    </main>
  )
}
