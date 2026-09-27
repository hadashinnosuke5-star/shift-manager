import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    // =====================================
    // 現在ログインしている管理者を取得
    // =====================================

    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      )
    }

    // =====================================
    // フォームデータ取得
    // =====================================

    const body = await request.json()

    const {
      storeId,
      name,
      email,
      password,
      role,
    } = body

    if (
      !storeId ||
      !name ||
      !email ||
      !password ||
      !role
    ) {
      return NextResponse.json(
        { error: '入力内容が不足しています' },
        { status: 400 }
      )
    }

    if (!['staff', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: '権限が正しくありません' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'パスワードは6文字以上にしてください' },
        { status: 400 }
      )
    }

    // =====================================
    // 現在のユーザーの権限確認
    // =====================================

    const { data: profile } = await supabase
      .from('profiles')
      .select('system_role')
      .eq('id', user.id)
      .single()

    const isSuperAdmin =
      profile?.system_role === 'super_admin'

    let isStoreAdmin = false

    if (!isSuperAdmin) {
      const { data: membership } = await supabase
        .from('store_memberships')
        .select('id')
        .eq('user_id', user.id)
        .eq('store_id', storeId)
        .eq('role', 'admin')
        .eq('active', true)
        .maybeSingle()

      isStoreAdmin = !!membership
    }

    if (!isSuperAdmin && !isStoreAdmin) {
      return NextResponse.json(
        { error: 'スタッフを登録する権限がありません' },
        { status: 403 }
      )
    }

    // =====================================
    // Service Roleクライアント
    // =====================================

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // =====================================
    // Authユーザー作成
    // =====================================

    const {
      data: authData,
      error: authError,
    } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        {
          error:
            authError?.message ||
            'ログインアカウントの作成に失敗しました',
        },
        { status: 400 }
      )
    }

    const newUserId = authData.user.id

    // =====================================
    // profiles登録
    // =====================================

    const { error: profileError } = await adminSupabase
      .from('profiles')
      .insert({
        id: newUserId,
        name,
        system_role: 'user',
        active: true,
      })

    if (profileError) {
      // Authだけ残らないよう削除
      await adminSupabase.auth.admin.deleteUser(newUserId)

      return NextResponse.json(
        {
          error:
            'プロフィール作成に失敗しました: ' +
            profileError.message,
        },
        { status: 500 }
      )
    }

    // =====================================
    // 店舗所属登録
    // =====================================

    const { error: membershipError } =
      await adminSupabase
        .from('store_memberships')
        .insert({
          user_id: newUserId,
          store_id: storeId,
          role,
          active: true,
        })

    if (membershipError) {
      // profiles削除
      await adminSupabase
        .from('profiles')
        .delete()
        .eq('id', newUserId)

      // Auth削除
      await adminSupabase.auth.admin.deleteUser(newUserId)

      return NextResponse.json(
        {
          error:
            '店舗登録に失敗しました: ' +
            membershipError.message,
        },
        { status: 500 }
      )
    }

    // =====================================
    // 成功
    // =====================================

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
      { status: 500 }
    )
  }
}