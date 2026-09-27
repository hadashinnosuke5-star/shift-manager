import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    // =========================
    // 通常クライアント
    // ログイン中ユーザー確認用
    // =========================
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          error: 'ログインが必要です',
        },
        {
          status: 401,
        }
      )
    }

    // =========================
    // リクエスト取得
    // =========================
    const body = await request.json()

    const {
      storeId,
      name,
      email,
      password,
      role,
    } = body

    // =========================
    // 入力チェック
    // =========================
    if (
      !storeId ||
      !name ||
      !email ||
      !password ||
      !['staff', 'admin'].includes(role)
    ) {
      return NextResponse.json(
        {
          error: '入力内容が正しくありません',
        },
        {
          status: 400,
        }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          error: 'パスワードは6文字以上で設定してください',
        },
        {
          status: 400,
        }
      )
    }

    // =========================
    // 操作者プロフィール
    // =========================
    const {
      data: myProfile,
      error: profileError,
    } = await supabase
      .from('profiles')
      .select('id, system_role')
      .eq('id', user.id)
      .single()

    if (profileError || !myProfile) {
      return NextResponse.json(
        {
          error: 'プロフィール情報を確認できません',
        },
        {
          status: 403,
        }
      )
    }

    const isSuperAdmin =
      myProfile.system_role === 'super_admin'

    // =========================
    // 店舗管理者確認
    // =========================
    let isStoreAdmin = false

    if (!isSuperAdmin) {
      const {
        data: membership,
        error: membershipError,
      } = await supabase
        .from('store_memberships')
        .select('role, active')
        .eq('store_id', storeId)
        .eq('user_id', user.id)
        .eq('active', true)
        .maybeSingle()

      if (membershipError) {
        return NextResponse.json(
          {
            error: '権限の確認に失敗しました',
          },
          {
            status: 500,
          }
        )
      }

      isStoreAdmin =
        membership?.role === 'admin'
    }

    if (!isSuperAdmin && !isStoreAdmin) {
      return NextResponse.json(
        {
          error: 'スタッフを追加する権限がありません',
        },
        {
          status: 403,
        }
      )
    }

    // =========================
    // 管理用Supabase
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
    // Authユーザー作成
    // =========================
    const {
      data: authData,
      error: authError,
    } =
      await adminSupabase.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
      })

    if (authError || !authData.user) {
      return NextResponse.json(
        {
          error:
            'アカウント作成に失敗しました: ' +
            (authError?.message ?? ''),
        },
        {
          status: 400,
        }
      )
    }

    const newUserId =
      authData.user.id

    // =========================
    // profile作成
    // =========================
    const {
      error: newProfileError,
    } = await adminSupabase
      .from('profiles')
      .insert({
        id: newUserId,
        name: name.trim(),
        system_role: 'user',
        active: true,
      })

    if (newProfileError) {
      await adminSupabase.auth.admin.deleteUser(
        newUserId
      )

      return NextResponse.json(
        {
          error:
            'プロフィール作成に失敗しました: ' +
            newProfileError.message,
        },
        {
          status: 500,
        }
      )
    }

    // =========================
    // 店舗所属作成
    // =========================
    const {
      error: membershipInsertError,
    } = await adminSupabase
      .from('store_memberships')
      .insert({
        user_id: newUserId,
        store_id: storeId,
        role,
        active: true,
      })

    if (membershipInsertError) {
      await adminSupabase
        .from('profiles')
        .delete()
        .eq('id', newUserId)

      await adminSupabase.auth.admin.deleteUser(
        newUserId
      )

      return NextResponse.json(
        {
          error:
            '店舗登録に失敗しました: ' +
            membershipInsertError.message,
        },
        {
          status: 500,
        }
      )
    }

    // =========================
    // 成功
    // =========================
    return NextResponse.json({
      success: true,
      userId: newUserId,
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