import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: Request
) {
  try {
    const supabase =
      await createClient()

    const {
      data: { user },
    } =
      await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          error:
            'ログインが必要です',
        },
        {
          status: 401,
        }
      )
    }

    const body =
      await request.json()

    const {
      storeId,
      userId,
      name,
      role,
      active,
    } = body

    if (
      !storeId ||
      !userId ||
      !name ||
      !role
    ) {
      return NextResponse.json(
        {
          error:
            '入力内容が不足しています',
        },
        {
          status: 400,
        }
      )
    }

    if (
      !['staff', 'admin'].includes(
        role
      )
    ) {
      return NextResponse.json(
        {
          error:
            '権限が正しくありません',
        },
        {
          status: 400,
        }
      )
    }

    // =========================
    // 操作者の権限確認
    // =========================

    const { data: profile } =
      await supabase
        .from('profiles')
        .select('system_role')
        .eq('id', user.id)
        .single()

    const isSuperAdmin =
      profile?.system_role ===
      'super_admin'

    let isStoreAdmin = false

    if (!isSuperAdmin) {
      const { data: membership } =
        await supabase
          .from('store_memberships')
          .select('id')
          .eq(
            'user_id',
            user.id
          )
          .eq(
            'store_id',
            storeId
          )
          .eq(
            'role',
            'admin'
          )
          .eq(
            'active',
            true
          )
          .maybeSingle()

      isStoreAdmin =
        !!membership
    }

    if (
      !isSuperAdmin &&
      !isStoreAdmin
    ) {
      return NextResponse.json(
        {
          error:
            '更新する権限がありません',
        },
        {
          status: 403,
        }
      )
    }

    // =========================
    // Service Role
    // =========================

    const adminSupabase =
      createAdminClient(
        process.env
          .NEXT_PUBLIC_SUPABASE_URL!,
        process.env
          .SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken:
              false,
            persistSession:
              false,
          },
        }
      )

    // =========================
    // 名前更新
    // =========================

    const {
      error: profileError,
    } =
      await adminSupabase
        .from('profiles')
        .update({
          name,
        })
        .eq('id', userId)

    if (profileError) {
      return NextResponse.json(
        {
          error:
            '名前の更新に失敗しました: ' +
            profileError.message,
        },
        {
          status: 500,
        }
      )
    }

    // =========================
    // 店舗権限・在籍状態更新
    // =========================

    const {
      error: membershipError,
    } =
      await adminSupabase
        .from(
          'store_memberships'
        )
        .update({
          role,
          active,
        })
        .eq(
          'store_id',
          storeId
        )
        .eq(
          'user_id',
          userId
        )

    if (membershipError) {
      return NextResponse.json(
        {
          error:
            '店舗情報の更新に失敗しました: ' +
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
        error:
          '予期しないエラーが発生しました',
      },
      {
        status: 500,
      }
    )
  }
}