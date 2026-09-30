'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { sugorokuSupabase } from '@/lib/sugoroku-supabase'

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
  | 'challenge'
  | 'gain'
  | 'lose'
  | 'neutral'
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

const EVENT_OPTIONS: {
  value: EventType
  label: string
}[] = [
  { value: 'neutral', label: '何もなし' },
  { value: 'challenge', label: '成功 / 失敗チャレンジ' },
  { value: 'gain', label: 'お金が増える' },
  { value: 'lose', label: 'お金が減る' },
  { value: 'forward', label: '進む' },
  { value: 'back', label: '戻る' },
  { value: 'retry', label: 'もう1回' },
  { value: 'skip', label: '休み' },
]

function modeLabel(mode: Game['mode_key']) {
  return mode === 'pillow'
    ? 'Pillow版'
    : 'Recovery版'
}

function amountLabel(value: number) {
  if (value > 0) return `+$${value}`
  if (value < 0) return `-$${Math.abs(value)}`
  return '$0'
}

export default function SugorokuAdmin({
  storeId,
}: {
  storeId: string
}) {
  const router = useRouter()

  const [games, setGames] =
    useState<Game[]>([])

  const [selectedGameId, setSelectedGameId] =
    useState<string>('')

  const [squares, setSquares] =
    useState<Square[]>([])

  const [selectedSquareId, setSelectedSquareId] =
    useState<number | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [message, setMessage] =
    useState('')

  const selectedGame =
    useMemo(
      () =>
        games.find(
          (game) =>
            game.id === selectedGameId
        ) ?? null,
      [games, selectedGameId]
    )

  const selectedSquare =
    useMemo(
      () =>
        squares.find(
          (square) =>
            square.id === selectedSquareId
        ) ?? null,
      [squares, selectedSquareId]
    )

  useEffect(() => {
    loadGames()
  }, [storeId])

  useEffect(() => {
    if (selectedGameId) {
      loadSquares(selectedGameId)
    }
  }, [selectedGameId])

  async function loadGames() {
    setLoading(true)
    setMessage('')

    const { data, error } =
      await sugorokuSupabase
        .from('sugoroku_games')
        .select('*')
        .eq('store_id', storeId)
        .order('mode_key')
        .order('board_size')

    if (error) {
      setMessage(
        `ゲーム一覧を取得できません: ${error.message}`
      )
      setLoading(false)
      return
    }

    const loaded =
      (data ?? []) as Game[]

    setGames(loaded)

    if (
      loaded.length > 0 &&
      !selectedGameId
    ) {
      setSelectedGameId(loaded[0].id)
    }

    setLoading(false)
  }

  async function loadSquares(
    gameId: string
  ) {
    setMessage('')

    const { data, error } =
      await sugorokuSupabase
        .from('sugoroku_squares')
        .select('*')
        .eq('game_id', gameId)
        .order('position')

    if (error) {
      setMessage(
        `マスを取得できません: ${error.message}`
      )
      return
    }

    const loaded =
      (data ?? []) as Square[]

    setSquares(loaded)

    setSelectedSquareId(
      loaded[0]?.id ?? null
    )
  }

  function updateSelectedSquare<
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

    const { error } =
      await sugorokuSupabase
        .from('sugoroku_squares')
        .update({
          title: selectedSquare.title,
          description:
            selectedSquare.description,
          event_type:
            selectedSquare.event_type,
          amount: selectedSquare.amount,
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

    if (error) {
      setMessage(
        `保存できませんでした: ${error.message}`
      )
      setSaving(false)
      return
    }

    setMessage(
      `${selectedSquare.position}マス目を保存しました`
    )
    setSaving(false)
  }

  async function saveGameSettings() {
    if (!selectedGame) return

    setSaving(true)
    setMessage('')

    const { error } =
      await sugorokuSupabase
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

    if (error) {
      setMessage(
        `ゲーム設定を保存できませんでした: ${error.message}`
      )
      setSaving(false)
      return
    }

    setMessage('ゲーム設定を保存しました')
    setSaving(false)
  }

  function updateSelectedGame(
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

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-50 p-6">
        <div className="mx-auto max-w-7xl">
          読み込み中...
        </div>
      </main>
    )
  }

  if (games.length === 0) {
    return (
      <main className="min-h-screen bg-zinc-50 p-6">
        <div className="mx-auto max-w-3xl">
          <button
            onClick={() => router.back()}
            className="mb-6 rounded-xl border bg-white px-4 py-2"
          >
            ← 戻る
          </button>

          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold">
              すごろく管理
            </h1>

            <p className="mt-4 text-sm text-zinc-500">
              この店舗に紐づく
              sugoroku_games がまだありません。
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              Pillow / Recovery の
              store_id を、この店舗IDに
              紐付けてください。
            </p>

            <code className="mt-5 block rounded-xl bg-zinc-100 p-4 text-xs">
              {storeId}
            </code>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <button
              onClick={() => router.back()}
              className="mb-3 text-sm font-medium text-zinc-500"
            >
              ← 店舗へ戻る
            </button>

            <h1 className="text-3xl font-bold">
              すごろく管理
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              マス内容・所持金・ゴールボーナスを編集
            </p>
          </div>

          {!!message && (
            <div className="rounded-xl bg-white px-4 py-3 text-sm shadow-sm">
              {message}
            </div>
          )}
        </div>

        <div className="grid gap-5 lg:grid-cols-[290px_1fr]">
          <aside className="space-y-5">
            <section className="rounded-3xl bg-white p-5 shadow-sm">
              <h2 className="font-bold">
                ゲーム選択
              </h2>

              <div className="mt-4 space-y-2">
                {games.map((game) => {
                  const selected =
                    game.id ===
                    selectedGameId

                  return (
                    <button
                      key={game.id}
                      onClick={() =>
                        setSelectedGameId(
                          game.id
                        )
                      }
                      className={[
                        'w-full rounded-2xl border p-4 text-left transition',
                        selected
                          ? 'border-black bg-black text-white'
                          : 'border-zinc-200 bg-white hover:bg-zinc-50',
                      ].join(' ')}
                    >
                      <div className="font-bold">
                        {modeLabel(
                          game.mode_key
                        )}
                      </div>

                      <div
                        className={[
                          'mt-1 text-sm',
                          selected
                            ? 'text-zinc-300'
                            : 'text-zinc-500',
                        ].join(' ')}
                      >
                        {game.board_size}
                        マス
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            {selectedGame && (
              <section className="rounded-3xl bg-white p-5 shadow-sm">
                <h2 className="font-bold">
                  ゲーム設定
                </h2>

                <label className="mt-4 block text-xs font-bold text-zinc-500">
                  初期所持金
                </label>

                <input
                  type="number"
                  value={
                    selectedGame.starting_money
                  }
                  onChange={(event) =>
                    updateSelectedGame({
                      starting_money:
                        Number(
                          event.target.value
                        ),
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2"
                />

                <label className="mt-4 block text-xs font-bold text-zinc-500">
                  ゴールボーナス
                </label>

                <input
                  type="number"
                  value={
                    selectedGame.goal_bonus
                  }
                  onChange={(event) =>
                    updateSelectedGame({
                      goal_bonus:
                        Number(
                          event.target.value
                        ),
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2"
                />

                <label className="mt-4 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={
                      selectedGame.is_active
                    }
                    onChange={(event) =>
                      updateSelectedGame({
                        is_active:
                          event.target
                            .checked,
                      })
                    }
                  />
                  公開中
                </label>

                <button
                  onClick={saveGameSettings}
                  disabled={saving}
                  className="mt-5 w-full rounded-xl bg-black px-4 py-3 font-bold text-white disabled:opacity-50"
                >
                  ゲーム設定を保存
                </button>
              </section>
            )}
          </aside>

          <section className="rounded-3xl bg-white p-4 shadow-sm md:p-6">
            <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-bold">
                    マス一覧
                  </h2>

                  <span className="text-xs text-zinc-500">
                    {squares.length}
                    マス
                  </span>
                </div>

                <div className="max-h-[72vh] space-y-2 overflow-y-auto pr-1">
                  {squares.map(
                    (square) => {
                      const selected =
                        square.id ===
                        selectedSquareId

                      return (
                        <button
                          key={square.id}
                          onClick={() =>
                            setSelectedSquareId(
                              square.id
                            )
                          }
                          className={[
                            'w-full rounded-2xl border p-3 text-left',
                            selected
                              ? 'border-black bg-zinc-100'
                              : 'border-zinc-200',
                          ].join(' ')}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold">
                              {
                                square.position
                              }
                              マス目
                            </span>

                            <span className="text-[11px] text-zinc-500">
                              {
                                square.event_type
                              }
                            </span>
                          </div>

                          <div className="mt-1 truncate text-sm text-zinc-600">
                            {square.title}
                          </div>
                        </button>
                      )
                    }
                  )}
                </div>
              </div>

              {selectedSquare ? (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-zinc-400">
                        SQUARE
                      </div>
                      <h2 className="text-2xl font-bold">
                        {
                          selectedSquare.position
                        }
                        マス目
                      </h2>
                    </div>

                    <button
                      onClick={saveSquare}
                      disabled={saving}
                      className="rounded-xl bg-black px-5 py-3 font-bold text-white disabled:opacity-50"
                    >
                      {saving
                        ? '保存中...'
                        : '保存'}
                    </button>
                  </div>

                  <div className="mt-6 grid gap-5 md:grid-cols-2">
                    <label className="block md:col-span-2">
                      <span className="text-xs font-bold text-zinc-500">
                        タイトル
                      </span>

                      <input
                        value={
                          selectedSquare.title
                        }
                        onChange={(event) =>
                          updateSelectedSquare(
                            'title',
                            event.target.value
                          )
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-3"
                      />
                    </label>

                    <label className="block md:col-span-2">
                      <span className="text-xs font-bold text-zinc-500">
                        説明文
                      </span>

                      <textarea
                        value={
                          selectedSquare.description
                        }
                        onChange={(event) =>
                          updateSelectedSquare(
                            'description',
                            event.target.value
                          )
                        }
                        rows={4}
                        className="mt-1 w-full resize-none rounded-xl border border-zinc-200 px-4 py-3"
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs font-bold text-zinc-500">
                        イベント種類
                      </span>

                      <select
                        value={
                          selectedSquare.event_type
                        }
                        onChange={(event) =>
                          updateSelectedSquare(
                            'event_type',
                            event.target
                              .value as EventType
                          )
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-3"
                      >
                        {EVENT_OPTIONS.map(
                          (option) => (
                            <option
                              key={
                                option.value
                              }
                              value={
                                option.value
                              }
                            >
                              {
                                option.label
                              }
                            </option>
                          )
                        )}
                      </select>
                    </label>

                    <label className="flex items-end gap-2 pb-3">
                      <input
                        type="checkbox"
                        checked={
                          selectedSquare.is_active
                        }
                        onChange={(event) =>
                          updateSelectedSquare(
                            'is_active',
                            event.target
                              .checked
                          )
                        }
                      />

                      <span className="text-sm font-medium">
                        このマスを有効にする
                      </span>
                    </label>

                    {(selectedSquare.event_type ===
                      'gain' ||
                      selectedSquare.event_type ===
                        'lose') && (
                      <label className="block">
                        <span className="text-xs font-bold text-zinc-500">
                          所持金増減
                        </span>

                        <input
                          type="number"
                          value={
                            selectedSquare.amount
                          }
                          onChange={(event) =>
                            updateSelectedSquare(
                              'amount',
                              Number(
                                event.target
                                  .value
                              )
                            )
                          }
                          className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-3"
                        />

                        <div className="mt-1 text-xs text-zinc-400">
                          現在：
                          {amountLabel(
                            selectedSquare.amount
                          )}
                        </div>
                      </label>
                    )}

                    {selectedSquare.event_type ===
                      'challenge' && (
                      <>
                        <label className="block">
                          <span className="text-xs font-bold text-zinc-500">
                            成功時
                          </span>

                          <input
                            type="number"
                            value={
                              selectedSquare.success_amount
                            }
                            onChange={(
                              event
                            ) =>
                              updateSelectedSquare(
                                'success_amount',
                                Number(
                                  event.target
                                    .value
                                )
                              )
                            }
                            className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-3"
                          />
                        </label>

                        <label className="block">
                          <span className="text-xs font-bold text-zinc-500">
                            失敗時
                          </span>

                          <input
                            type="number"
                            value={
                              selectedSquare.fail_amount
                            }
                            onChange={(
                              event
                            ) =>
                              updateSelectedSquare(
                                'fail_amount',
                                Number(
                                  event.target
                                    .value
                                )
                              )
                            }
                            className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-3"
                          />
                        </label>
                      </>
                    )}

                    {(selectedSquare.event_type ===
                      'forward' ||
                      selectedSquare.event_type ===
                        'back') && (
                      <label className="block">
                        <span className="text-xs font-bold text-zinc-500">
                          移動マス数
                        </span>

                        <input
                          type="number"
                          min={0}
                          value={
                            selectedSquare.move_value
                          }
                          onChange={(event) =>
                            updateSelectedSquare(
                              'move_value',
                              Number(
                                event.target
                                  .value
                              )
                            )
                          }
                          className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-3"
                        />
                      </label>
                    )}

                    {selectedSquare.event_type ===
                      'skip' && (
                      <label className="block">
                        <span className="text-xs font-bold text-zinc-500">
                          休む回数
                        </span>

                        <input
                          type="number"
                          min={1}
                          value={
                            selectedSquare.skip_turns
                          }
                          onChange={(event) =>
                            updateSelectedSquare(
                              'skip_turns',
                              Number(
                                event.target
                                  .value
                              )
                            )
                          }
                          className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-3"
                        />
                      </label>
                    )}
                  </div>

                  <div className="mt-7 rounded-2xl bg-zinc-50 p-5">
                    <div className="text-xs font-bold text-zinc-400">
                      PREVIEW
                    </div>

                    <div className="mt-2 text-xl font-bold">
                      {
                        selectedSquare.title
                      }
                    </div>

                    <div className="mt-2 text-sm text-zinc-600">
                      {
                        selectedSquare.description
                      }
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-80 items-center justify-center text-sm text-zinc-400">
                  編集するマスを選択してください
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
