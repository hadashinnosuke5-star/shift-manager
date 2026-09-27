import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StaffEditForm from './StaffEditForm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = {
  params: Promise<{
    storeId: string
    userId: string
  }>
}

export default async function StaffEditPage({ params }: Props) {
  const { storeId, userId } = await params

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('id, system_role')
    .eq('id', user.id)
    .single()

  if (!myProfile) {
    redirect('/dashboard')
  }

  const isSuperAdmin =
    myProfile.system_role === 'super_admin'

  let isStoreAdmin = false

  if (!isSuperAdmin) {
    const { data: myMembership } = await supabase
      .from('store_memberships')
      .select('role')
      .eq('store_id', storeId)
      .eq('user_id', user.id)
      .eq('active', true)
      .maybeSingle()

    isStoreAdmin =
      myMembership?.role === 'admin'
  }

  if (!isSuperAdmin && !isStoreAdmin) {
    redirect(`/stores/${storeId}`)
  }

  const { data: store } = await supabase
    .from('stores')
    .select('id, name')
    .eq('id', storeId)
    .single()

  if (!store) {
    redirect('/dashboard')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, active')
    .eq('id', userId)
    .single()

  if (!profile) {
    redirect(`/stores/${storeId}/staff`)
  }

  const { data: membership } = await supabase
    .from('store_memberships')
    .select('id, role, active')
    .eq('store_id', storeId)
    .eq('user_id', userId)
    .single()

  if (!membership) {
    redirect(`/stores/${storeId}/staff`)
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="mx-auto max-w-xl">

        <div className="rounded-2xl bg-white p-6 shadow">
          <Link
            href={`/stores/${storeId}/staff`}
            prefetch={false}
            className="text-sm text-gray-500 hover:text-black"
          >
            ← スタッフ管理へ戻る
          </Link>

          <h1 className="mt-4 text-2xl font-bold">
            スタッフ編集
          </h1>

          <p className="mt-1 text-gray-500">
            {store.name}
          </p>

          <StaffEditForm
            storeId={storeId}
            userId={userId}
            initialName={profile.name}
            initialRole={membership.role}
            initialActive={membership.active}
          />
        </div>

      </div>
    </main>
  )
}