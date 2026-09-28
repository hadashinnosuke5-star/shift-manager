import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(
  request: Request
) {
  try {
    // =========================
    // ログイン確認
    // =========================
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

    // =========================
    // リクエスト取得
    // =========================
    const body =
      await request.json()

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
      !['draft', 'submitted'].includes(
        status
      )
    ) {
      return NextResponse.json(
        {
          error:
            '入力内容が正しくありません',
        },
        {
          status: 400,
        }
      )
    }

    // =========================
    // 店舗所属確認
    // =========================
    const {
      data: membership,
      error: membershipError,
    } =
      await supabase
        .from(
          'store_memberships'
        )
        .select('id')
        .eq(
          'store_id',
          storeId
        )
        .eq(
          'user_id',
          user.id
        )
        .eq(
          'active',
          true
        )
        .maybeSingle()

    if (
      membershipError ||
      !membership
    ) {
      return NextResponse.json(
        {
          error:
            'この店舗に所属していません',
        },
        {
          status: 403,
        }
      )
    }

    // =========================
    // シフト受付状態確認
    // =========================
    const {
      data: period,
      error: periodError,
    } =
      await supabase
        .from('shift_periods')
        .select('status')
        .eq(
          'store_id',
          storeId
        )
        .eq('year', year)
        .eq('month', month)
        .maybeSingle()

    if (periodError) {
      return NextResponse.json(
        {
          error:
            'シフト受付状態を確認できません',
        },
        {
          status: 500,
        }
      )
    }

    if (
      period?.status === 'locked'
    ) {
      return NextResponse.json(
        {
          error:
            'シフト確定後は提出状態を変更できません',
        },
        {
          status: 400,
        }
      )
    }

    // =========================
    // 管理用Supabase
    // =========================
    const adminSupabase =
      createAdminClient(
        process.env
          .NEXT_PUBLIC_SUPABASE_URL!,
        process.env
          .SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      )

    // =========================
    // 提出状態を保存
    // =========================
    const {
      error: submissionError,
    } =
      await adminSupabase
        .from(
          'shift_submissions'
        )
        .upsert(
          {
            store_id: storeId,
            user_id: user.id,
            year,
            month,
            status,

            submitted_at:
              status ===
              'submitted'
                ? new Date()
                    .toISOString()
                : null,
          },
          {
            onConflict:
              'store_id,user_id,year,month',
          }
        )

    if (submissionError) {
      console.error(
        submissionError
      )

      return NextResponse.json(
        {
          error:
            '提出状態の変更に失敗しました: ' +
            submissionError.message,
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
      status,
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