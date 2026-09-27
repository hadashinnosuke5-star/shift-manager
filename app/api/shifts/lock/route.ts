import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      )
    }

    const body = await request.json()

    const {
      storeId,
      year,
      month,
      status,
    } = body

    if (
      !storeId ||
      !year ||
      !month ||
      !['open', 'locked'].includes(status)
    ) {
      return NextResponse.json(
        { error: '入力内容が正しくありません' },
        { status: 400 }
      )
    }

    // =========================
    // super_admin確認
    // =========================

    const { data: profile } = await supabase
      .from('profiles')
      .select('system_role')
      .eq('id', user.id)
      .single()

    const isSuperAdmin =
      profile?.system_role === 'super_admin'

    // =========================
    // 店舗admin確認
    // =========================

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
        {
          error:
            'シフトを確定する権限がありません',
        },
        { status: 403 }
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
    // shift_periods更新
    // =========================

    const { error } = await adminSupabase
      .from('shift_periods')
      .upsert(
        {
          store_id: storeId,
          year,
          month,
          status,
        },
        {
          onConflict:
            'store_id,year,month',
        }
      )

    if (error) {
      return NextResponse.json(
        {
          error:
            '更新に失敗しました: ' +
            error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      status,
    })

  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        error:
          '予期しないエラーが発生しました',
      },
      { status: 500 }
    )
  }
}