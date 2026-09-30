'use client'

import { useParams } from 'next/navigation'
import SugorokuAdmin from '@/components/sugoroku/SugorokuAdmin'

export default function SugorokuAdminPage() {
  const params = useParams<{ storeId: string }>()
  const storeId = params.storeId

  return <SugorokuAdmin storeId={storeId} />
}
