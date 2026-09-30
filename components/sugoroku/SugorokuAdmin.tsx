'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Game = {
  id: string
  store_id: string | null
  name: string
  public_slug: string
  mode_key: 'pillow' | 'recovery'
  board_size: 30 | 40 | 50
  starting_money: number
  goal_bonus: number
  is_active: boolean
}

type EventType =
  | 'neutral'
  | 'challenge'
  | 'gain'
  | 'lose'
  | 'forward'
  | 'back'
  | 'retry'
  | 'skip'

type Square = {
  id: number
  game_id: string
  position: number
  title: string
  description: string
  event_type: EventType
  amount: number
  success_amount: number
  fail_amount: number
  move_value: number
  skip_turns: number
  is_active: boolean
}

const EVENT_OPTIONS: Array<{
  value: EventType
  label: string
}> = [
  { value: 'neutral', label: '何もなし' },
  { value: 'challenge', label: 'チャレンジ' },
  { value: 'gain', label: '所持金プラス' },
  { value: 'lose', label: '所持金マイナス' },
  { value: 'forward', label: '進む' },
  { value: 'back', label: '戻る' },
  { value: 'retry', label: 'もう1回' },
  { value: 'skip', label: '休み' },
]

export default function SugorokuAdmin({
  storeId,
  storeName,
}: {
  storeId: string
  storeName: string
}) {
  const supabase = useMemo(() => createClient(), [])

  const [games, setGames] = useState<Game[]>([])
  const [unassignedGames, setUnassignedGames] =
    useState<Game[]>([])
  const [selectedGameId, setSelectedGameId] =
    useState('')
  const [squares, setSquares] =
    useState<Square[]>([])
  const [selectedSquareId, setSelectedSquareId] =
    useState<number | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const selectedGame =
    games.find(
      (game) => game.id === selectedGameId
    ) ?? null

  const selectedSquare =
    squares.find(
      (square) =>
        square.id === selectedSquareId
    ) ?? null

  useEffect(() => {
    loadAll()
  }, [storeId])

  useEffect(() => {
    if (selectedGameId) {
      loadSquares(selectedGameId)
    } else {
      setSquares([])
      setSelectedSquareId(null)
    }
  }, [selectedGameId])

  async function loadAll() {
    setLoading(true)
    setMessage('')

    const [assignedResult, unassignedResult] =
      await Promise.all([
        supabase
          .from('sugoroku_games')
          .select('*')
          .eq('store_id', storeId)
          .order('mode_key')
          .order('board_size'),

        supabase
          .from('sugoroku_games')
          .select('*')
          .is('store_id', null)
          .order('mode_key')
          .order('board_size'),
      ])

    if (assignedResult.error) {
      setMessage(
        `ゲーム一覧の取得に失敗しました: ${assignedResult.error.message}`
      )
      setLoading(false)
      return
    }

    const assigned =
      (assignedResult.data ?? []) as Game[]

    setGames(assigned)
    setUnassignedGames(
      (unassignedResult.data ?? []) as Game[]
    )

    if (assigned.length > 0) {
      setSelectedGameId((current) =>
        assigned.some(
          (game) => game.id === current
        )
          ? current
          : assigned[0].id
      )
    } else {
      setSelectedGameId('')
    }

    setLoading(false)
  }

  async function loadSquares(
    gameId: string
  ) {
    const { data, error } = await supabase
      .from('sugoroku_squares')
      .select('*')
      .eq('game_id', gameId)
      .order('position')

    if (error) {
      setMessage(
        `マスの取得に失敗しました: ${error.message}`
      )
      return
    }

    const rows = (data ?? []) as Square[]
    setSquares(rows)
    setSelectedSquareId(
      rows[0]?.id ?? null
    )
  }

  async function assignMode(
    mode: 'pillow' | 'recovery'
  ) {
    setSaving(true)
    setMessage('')

    const targets =
      unassignedGames.filter(
        (game) =>
          game.mode_key === mode
      )

    if (targets.length === 0) {
      setMessage('未割当のゲームがありません。')
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('sugoroku_games')
      .update({
        store_id: storeId,
        updated_at:
          new Date().toISOString(),
      })
      .in(
        'id',
        targets.map(
          (game) => game.id
        )
      )

    if (error) {
      setMessage(
        `店舗への紐付けに失敗しました: ${error.message}`
      )
      setSaving(false)
      return
    }

    setMessage(
      `${
        mode === 'pillow'
          ? 'Pillow版'
          : 'Recovery版'
      }を${storeName}に紐付けました。`
    )

    await loadAll()
    setSaving(false)
  }

  function updateGame(
    patch: Partial<Game>
  ) {
    if (!selectedGame) return

    setGames((current) =>
      current.map((game) =>
        game.id === selectedGame.id
          ? {
              ...game,
              ...patch,
            }
          : game
      )
    )
  }

  async function saveGame() {
    if (!selectedGame) return

    setSaving(true)
    setMessage('')

    const { error } = await supabase
      .from('sugoroku_games')
      .update({
        starting_money:
          selectedGame.starting_money,
        goal_bonus:
          selectedGame.goal_bonus,
        is_active:
          selectedGame.is_active,
        updated_at:
          new Date().toISOString(),
      })
      .eq('id', selectedGame.id)

    setMessage(
      error
        ? `ゲーム設定の保存に失敗しました: ${error.message}`
        : `${selectedGame.name}を保存しました。`
    )

    setSaving(false)
  }

  function updateSquare<
    K extends keyof Square
  >(
    key: K,
    value: Square[K]
  ) {
    if (!selectedSquare) return

    setSquares((current) =>
      current.map((square) =>
        square.id === selectedSquare.id
          ? {
              ...square,
              [key]: value,
            }
          : square
      )
    )
  }

  async function saveSquare() {
    if (!selectedSquare) return

    setSaving(true)
    setMessage('')

    const { error } = await supabase
      .from('sugoroku_squares')
      .update({
        title: selectedSquare.title,
        description:
          selectedSquare.description,
        event_type:
          selectedSquare.event_type,
        amount:
          selectedSquare.amount,
        success_amount:
          selectedSquare.success_amount,
        fail_amount:
          selectedSquare.fail_amount,
        move_value:
          selectedSquare.move_value,
        skip_turns:
          selectedSquare.skip_turns,
        is_active:
          selectedSquare.is_active,
        updated_at:
          new Date().toISOString(),
      })
      .eq('id', selectedSquare.id)

    setMessage(
      error
        ? `マスの保存に失敗しました: ${error.message}`
        : `${selectedSquare.position}マス目を保存しました。`
    )

    setSaving(false)
  }

  const availableModes = Array.from(
    new Set(
      unassignedGames.map(
        (game) => game.mode_key
      )
    )
  )

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-4 md:p-6">
        <div className="mx-auto max-w-7xl rounded-2xl bg-white p-6 shadow">
          読み込み中...
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-100 p-3 md:p-6">
      <div className="mx-auto max-w-[1500px]">

        <div className="rounded-2xl bg-white p-4 shadow md:p-6">
          <Link
            href={`/stores/${storeId}`}
            prefetch={false}
            className="text-sm text-gray-500"
          >
            ← シフト管理へ戻る
          </Link>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl font-bold md:text-2xl">
                {storeName}｜すごろく管理
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                super_admin 専用
              </p>
            </div>

            {message && (
              <div className="rounded-xl bg-gray-100 px-4 py-3 text-sm">
                {message}
              </div>
            )}
          </div>
        </div>

        {availableModes.length > 0 && (
          <div className="mt-4 rounded-2xl bg-white p-4 shadow md:p-6">
            <h2 className="font-bold">
              ゲームをこの店舗に紐付ける
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              初回のみ必要です。30・40・50マスをまとめて紐付けます。
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {availableModes.includes(
                'pillow'
              ) && (
                <button
                  onClick={() =>
                    assignMode('pillow')
                  }
                  disabled={saving}
                  className="rounded-xl bg-pink-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  Pillow版を紐付ける
                </button>
              )}

              {availableModes.includes(
                'recovery'
              ) && (
                <button
                  onClick={() =>
                    assignMode('recovery')
                  }
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  Recovery版を紐付ける
                </button>
              )}
            </div>
          </div>
        )}

        {games.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-white p-6 shadow">
            <h2 className="text-lg font-bold">
              この店舗にはまだゲームがありません
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              上の「紐付ける」ボタンから設定してください。
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">

            <div className="space-y-4">
              <div className="rounded-2xl bg-white p-4 shadow">
                <h2 className="font-bold">
                  ゲーム選択
                </h2>

                <div className="mt-3 space-y-2">
                  {games.map((game) => (
                    <button
                      key={game.id}
                      onClick={() =>
                        setSelectedGameId(
                          game.id
                        )
                      }
                      className={[
                        'w-full rounded-xl border px-4 py-3 text-left',
                        selectedGameId ===
                        game.id
                          ? 'border-black bg-black text-white'
                          : 'border-gray-200 bg-white hover:bg-gray-50',
                      ].join(' ')}
                    >
                      <div className="font-bold">
                        {game.mode_key ===
                        'pillow'
                          ? 'Pillow版'
                          : 'Recovery版'}
                      </div>

                      <div className="mt-1 text-sm opacity-70">
                        {game.board_size}マス
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedGame && (
                <div className="rounded-2xl bg-white p-4 shadow">
                  <h2 className="font-bold">
                    基本設定
                  </h2>

                  <label className="mt-4 block">
                    <span className="text-xs font-medium text-gray-500">
                      初期所持金 $
                    </span>

                    <input
                      type="number"
                      value={
                        selectedGame.starting_money
                      }
                      onChange={(event) =>
                        updateGame({
                          starting_money:
                            Number(
                              event.target.value
                            ),
                        })
                      }
                      className="mt-1 w-full rounded-xl border px-3 py-2"
                    />
                  </label>

                  <label className="mt-4 block">
                    <span className="text-xs font-medium text-gray-500">
                      ゴールボーナス $
                    </span>

                    <input
                      type="number"
                      value={
                        selectedGame.goal_bonus
                      }
                      onChange={(event) =>
                        updateGame({
                          goal_bonus:
                            Number(
                              event.target.value
                            ),
                        })
                      }
                      className="mt-1 w-full rounded-xl border px-3 py-2"
                    />
                  </label>

                  <label className="mt-4 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={
                        selectedGame.is_active
                      }
                      onChange={(event) =>
                        updateGame({
                          is_active:
                            event.target.checked,
                        })
                      }
                    />
                    ゲームを公開
                  </label>

                  <button
                    onClick={saveGame}
                    disabled={saving}
                    className="mt-4 w-full rounded-xl bg-black px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                  >
                    基本設定を保存
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white p-4 shadow md:p-6">
              <div className="grid gap-5 xl:grid-cols-[280px_1fr]">

                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold">
                      マス一覧
                    </h2>

                    <span className="text-xs text-gray-400">
                      {squares.length}マス
                    </span>
                  </div>

                  <div className="mt-3 max-h-[70vh] space-y-2 overflow-y-auto pr-1">
                    {squares.map(
                      (square) => (
                        <button
                          key={square.id}
                          onClick={() =>
                            setSelectedSquareId(
                              square.id
                            )
                          }
                          className={[
                            'w-full rounded-xl border p-3 text-left',
                            square.id ===
                            selectedSquareId
                              ? 'border-black bg-gray-100'
                              : 'border-gray-200',
                          ].join(' ')}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold">
                              {square.position}
                              マス目
                            </span>

                            <span className="text-[10px] text-gray-400">
                              {square.event_type}
                            </span>
                          </div>

                          <div className="mt-1 truncate text-sm text-gray-500">
                            {square.title}
                          </div>
                        </button>
                      )
                    )}
                  </div>
                </div>

                {selectedSquare ? (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-gray-400">
                          EDIT SQUARE
                        </div>
                        <h2 className="text-2xl font-bold">
                          {selectedSquare.position}
                          マス目
                        </h2>
                      </div>

                      <button
                        onClick={saveSquare}
                        disabled={saving}
                        className="rounded-xl bg-black px-6 py-3 font-bold text-white disabled:opacity-50"
                      >
                        {saving
                          ? '保存中...'
                          : '保存'}
                      </button>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">

                      <label className="block md:col-span-2">
                        <span className="text-xs font-medium text-gray-500">
                          タイトル
                        </span>

                        <input
                          value={
                            selectedSquare.title
                          }
                          onChange={(event) =>
                            updateSquare(
                              'title',
                              event.target.value
                            )
                          }
                          className="mt-1 w-full rounded-xl border px-4 py-3"
                        />
                      </label>

                      <label className="block md:col-span-2">
                        <span className="text-xs font-medium text-gray-500">
                          説明
                        </span>

                        <textarea
                          rows={4}
                          value={
                            selectedSquare.description
                          }
                          onChange={(event) =>
                            updateSquare(
                              'description',
                              event.target.value
                            )
                          }
                          className="mt-1 w-full resize-none rounded-xl border px-4 py-3"
                        />
                      </label>

                      <label className="block">
                        <span className="text-xs font-medium text-gray-500">
                          イベント
                        </span>

                        <select
                          value={
                            selectedSquare.event_type
                          }
                          onChange={(event) =>
                            updateSquare(
                              'event_type',
                              event.target
                                .value as EventType
                            )
                          }
                          className="mt-1 w-full rounded-xl border px-4 py-3"
                        >
                          {EVENT_OPTIONS.map(
                            (option) => (
                              <option
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </option>
                            )
                          )}
                        </select>
                      </label>

                      <label className="flex items-center gap-2 pt-6 text-sm">
                        <input
                          type="checkbox"
                          checked={
                            selectedSquare.is_active
                          }
                          onChange={(event) =>
                            updateSquare(
                              'is_active',
                              event.target.checked
                            )
                          }
                        />
                        このマスを有効にする
                      </label>

                      {(selectedSquare.event_type ===
                        'gain' ||
                        selectedSquare.event_type ===
                          'lose') && (
                        <label className="block">
                          <span className="text-xs font-medium text-gray-500">
                            金額
                          </span>

                          <input
                            type="number"
                            value={
                              selectedSquare.amount
                            }
                            onChange={(event) =>
                              updateSquare(
                                'amount',
                                Number(
                                  event.target.value
                                )
                              )
                            }
                            className="mt-1 w-full rounded-xl border px-4 py-3"
                          />
                        </label>
                      )}

                      {selectedSquare.event_type ===
                        'challenge' && (
                        <>
                          <label className="block">
                            <span className="text-xs font-medium text-gray-500">
                              成功時 $
                            </span>

                            <input
                              type="number"
                              value={
                                selectedSquare.success_amount
                              }
                              onChange={(event) =>
                                updateSquare(
                                  'success_amount',
                                  Number(
                                    event.target.value
                                  )
                                )
                              }
                              className="mt-1 w-full rounded-xl border px-4 py-3"
                            />
                          </label>

                          <label className="block">
                            <span className="text-xs font-medium text-gray-500">
                              失敗時 $
                            </span>

                            <input
                              type="number"
                              value={
                                selectedSquare.fail_amount
                              }
                              onChange={(event) =>
                                updateSquare(
                                  'fail_amount',
                                  Number(
                                    event.target.value
                                  )
                                )
                              }
                              className="mt-1 w-full rounded-xl border px-4 py-3"
                            />
                          </label>
                        </>
                      )}

                      {(selectedSquare.event_type ===
                        'forward' ||
                        selectedSquare.event_type ===
                          'back') && (
                        <label className="block">
                          <span className="text-xs font-medium text-gray-500">
                            移動マス数
                          </span>

                          <input
                            type="number"
                            min={0}
                            value={
                              selectedSquare.move_value
                            }
                            onChange={(event) =>
                              updateSquare(
                                'move_value',
                                Number(
                                  event.target.value
                                )
                              )
                            }
                            className="mt-1 w-full rounded-xl border px-4 py-3"
                          />
                        </label>
                      )}

                      {selectedSquare.event_type ===
                        'skip' && (
                        <label className="block">
                          <span className="text-xs font-medium text-gray-500">
                            休む回数
                          </span>

                          <input
                            type="number"
                            min={1}
                            value={
                              selectedSquare.skip_turns
                            }
                            onChange={(event) =>
                              updateSquare(
                                'skip_turns',
                                Number(
                                  event.target.value
                                )
                              )
                            }
                            className="mt-1 w-full rounded-xl border px-4 py-3"
                          />
                        </label>
                      )}
                    </div>

                    <div className="mt-6 rounded-2xl bg-gray-50 p-5">
                      <div className="text-xs font-bold text-gray-400">
                        プレビュー
                      </div>

                      <div className="mt-2 text-xl font-bold">
                        {selectedSquare.title ||
                          'タイトルなし'}
                      </div>

                      <div className="mt-2 whitespace-pre-wrap text-sm text-gray-600">
                        {selectedSquare.description ||
                          '説明なし'}
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="flex min-h-[400px] items-center justify-center text-sm text-gray-400">
                    編集するマスを選択してください
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
