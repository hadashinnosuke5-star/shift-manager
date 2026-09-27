import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  let createdUserId: string | null = null

  try {
    const body = await request.json()

    const {
      name,
      email,
      password,
      storeIds,
    } = body

    // =========================
    // 入力チェック
    // =========================

    if (
      !name ||
      !email ||
      !password ||
      !Array.isArray(storeIds) ||
      storeIds.length === 0
    ) {
      return NextResponse.json(
        {
          error: '入力内容が不足しています',
        },
        {
          status: 400,
        }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          error: 'パスワードは6文字以上にしてください',
        },
        {
          status: 400,
        }
      )
    }

    // 重複除去
    const uniqueStoreIds = [
      ...new Set(
        storeIds.filter(
          (id): id is string =>
            typeof id === 'string'
        )
      ),
    ]

    if (uniqueStoreIds.length === 0) {
      return NextResponse.json(
        {
          error: '所属店舗を選択してください',
        },
        {
          status: 400,
        }
      )
    }

    // =========================
    // Service Role
    // =========================

    const adminSupabase =
      createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      )

    // =========================
    // 選択店舗が本当に存在するか確認
    // =========================

    const { data: stores, error: storeError } =
      await adminSupabase
        .from('stores')
        .select('id')
        .in('id', uniqueStoreIds)
        .eq('active', true)

    if (storeError) {
      return NextResponse.json(
        {
          error: '店舗情報の確認に失敗しました',
        },
        {
          status: 500,
        }
      )
    }

    if (
      !stores ||
      stores.length !== uniqueStoreIds.length
    ) {
      return NextResponse.json(
        {
          error:
            '選択された店舗情報が正しくありません',
        },
        {
          status: 400,
        }
      )
    }

    // =========================
    // Authユーザー作成
    // =========================

    const {
      data: authData,
      error: authError,
    } =
      await adminSupabase.auth.admin.createUser({
        email,
        password,

        // 今は登録後すぐ使えるよう自動確認
        email_confirm: true,
      })

    if (authError || !authData.user) {
      return NextResponse.json(
        {
          error:
            authError?.message ||
            'アカウント作成に失敗しました',
        },
        {
          status: 400,
        }
      )
    }

    createdUserId = authData.user.id

    // =========================
    // profile作成
    // 必ず一般ユーザー
    // =========================

    const { error: profileError } =
      await adminSupabase
        .from('profiles')
        .insert({
          id: createdUserId,
          name,
          system_role: 'user',
          active: true,
        })

    if (profileError) {
      await adminSupabase.auth.admin.deleteUser(
        createdUserId
      )

      return NextResponse.json(
        {
          error:
            'プロフィール作成に失敗しました: ' +
            profileError.message,
        },
        {
          status: 500,
        }
      )
    }

    // =========================
    // 店舗所属
    //
    // roleは絶対staff固定
    // ユーザーからroleは受け取らない
    // =========================

    const memberships =
      uniqueStoreIds.map((storeId) => ({
        user_id: createdUserId,
        store_id: storeId,
        role: 'staff',
        active: true,
      }))

    const { error: membershipError } =
      await adminSupabase
        .from('store_memberships')
        .insert(memberships)

    if (membershipError) {
      await adminSupabase
        .from('profiles')
        .delete()
        .eq('id', createdUserId)

      await adminSupabase.auth.admin.deleteUser(
        createdUserId
      )

      return NextResponse.json(
        {
          error:
            '所属店舗の登録に失敗しました: ' +
            membershipError.message,
        },
        {
          status: 500,
        }
      )
    }

    return NextResponse.json({
      success: true,
    })

  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        error: '予期しないエラーが発生しました',
      },
      {
        status: 500,
      }
    )
  }
}