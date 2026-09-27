import { NextResponse } from 'next/server'
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

    if (!membership) {
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
    // 店舗シフト確定確認
    // =========================

    const {
      data: period,
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
    // 提出
    // =========================

    const {
      error,
    } =
      await supabase
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

    if (error) {
      return NextResponse.json(
        {
          error:
            '提出処理に失敗しました: ' +
            error.message,
        },
        {
          status: 500,
        }
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
      {
        status: 500,
      }
    )
  }
}