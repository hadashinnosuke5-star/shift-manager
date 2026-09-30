import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SugorokuAdmin from '@/components/sugoroku/SugorokuAdmin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = {
  params: Promise<{
    storeId: string
  }>
}

export default async function SugorokuPage({
  params,
}: Props) {
  const { storeId } = await params
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
    redirect(`/stores/${storeId}`)
  }

  const { data: store, error: storeError } =
    await supabase
      .from('stores')
      .select('id, name, active')
      .eq('id', storeId)
      .single()

  if (storeError || !store) {
    return (
      <main className="min-h-screen bg-gray-100 p-4 md:p-6">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow">
          <Link
            href="/dashboard"
            prefetch={false}
            className="text-sm text-gray-500"
          >
            ← 店舗一覧へ
          </Link>

          <h1 className="mt-4 text-xl font-bold">
            店舗が見つかりません
          </h1>
        </div>
      </main>
    )
  }

  return (
    <SugorokuAdmin
      storeId={store.id}
      storeName={store.name}
    />
  )
}
