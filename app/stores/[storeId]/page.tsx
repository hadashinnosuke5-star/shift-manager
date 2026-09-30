import Link from 'next/link'



import { redirect } from 'next/navigation'



import { createClient } from '@/lib/supabase/server'



import LogoutButton from '@/components/LogoutButton'



import MonthSelector from '@/components/MonthSelector'



import ShiftPdfButton from '@/components/ShiftPdfButton'



import ShiftLockButton from './ShiftLockButton'







export const dynamic = 'force-dynamic'



export const revalidate = 0







type Props = {



  params: Promise<{



    storeId: string



  }>



  searchParams: Promise<{



    year?: string



    month?: string



  }>



}







export default async function StorePage({



  params,



  searchParams,



}: Props) {



  const { storeId } = await params



  const query = await searchParams







  const supabase = await createClient()







  // =====================================



  // ログイン確認



  // =====================================



  const {



    data: { user },



  } = await supabase.auth.getUser()







  if (!user) {



    redirect('/login')



  }







  // =====================================



  // 自分のプロフィール



  // =====================================



  const {



    data: myProfile,



    error: profileError,



  } = await supabase



    .from('profiles')



    .select('id, name, system_role, active')



    .eq('id', user.id)



    .single()







  if (profileError || !myProfile) {



    return (



      <main className="min-h-screen bg-gray-100 p-4">



        <div className="mx-auto max-w-6xl rounded-2xl bg-white p-5 shadow">



          <h1 className="text-xl font-bold">



            プロフィール情報を取得できませんでした



          </h1>







          <pre className="mt-4 whitespace-pre-wrap rounded bg-gray-100 p-4 text-xs">



            {JSON.stringify(profileError, null, 2)}



          </pre>



        </div>



      </main>



    )



  }







  // =====================================



  // 店舗



  // =====================================



  const {



    data: store,



    error: storeError,



  } = await supabase



    .from('stores')



    .select('id, name, active')



    .eq('id', storeId)



    .single()







  if (storeError || !store) {



    return (



      <main className="min-h-screen bg-gray-100 p-4">



        <div className="mx-auto max-w-6xl rounded-2xl bg-white p-5 shadow">



          <h1 className="text-xl font-bold">



            店舗が見つかりません



          </h1>







          <pre className="mt-4 whitespace-pre-wrap rounded bg-gray-100 p-4 text-xs">



            {JSON.stringify(storeError, null, 2)}



          </pre>



        </div>



      </main>



    )



  }







  // =====================================



  // 権限



  // =====================================



  const { data: myMembership } = await supabase



    .from('store_memberships')



    .select('role, active')



    .eq('store_id', storeId)



    .eq('user_id', user.id)



    .eq('active', true)



    .maybeSingle()







  const isSuperAdmin =



    myProfile.system_role === 'super_admin'







  const isStoreAdmin =



    myMembership?.role === 'admin'







  const canManage =



    isSuperAdmin || isStoreAdmin







  if (!isSuperAdmin && !myMembership) {



    redirect('/dashboard')



  }







  // =====================================



  // 年月



  // =====================================



  const now = new Date()







  const requestedYear =



    Number(query.year)







  const requestedMonth =



    Number(query.month)







  const year =



    Number.isInteger(requestedYear) &&



    requestedYear >= 2020 &&



    requestedYear <= 2100



      ? requestedYear



      : now.getFullYear()







  const month =



    Number.isInteger(requestedMonth) &&



    requestedMonth >= 1 &&



    requestedMonth <= 12



      ? requestedMonth



      : now.getMonth() + 1







  // =====================================



  // 月の日付



  // =====================================



  const lastDateNumber =



    new Date(year, month, 0).getDate()







  const firstDay =



    `${year}-${String(month).padStart(2, '0')}-01`







  const lastDay =



    `${year}-${String(month).padStart(2, '0')}-${String(



      lastDateNumber



    ).padStart(2, '0')}`







  const days =



    Array.from(



      { length: lastDateNumber },



      (_, i) => i + 1



    )







  // =====================================



  // 受付状態



  // =====================================



  const { data: shiftPeriod } = await supabase



    .from('shift_periods')



    .select('status')



    .eq('store_id', storeId)



    .eq('year', year)



    .eq('month', month)



    .maybeSingle()







  const shiftStatus:



    | 'none'



    | 'open'



    | 'locked' =



    !shiftPeriod



      ? 'none'



      : shiftPeriod.status === 'locked'



        ? 'locked'



        : 'open'







  // =====================================



  // スタッフ



  // =====================================



  const {



    data: memberships,



    error: membershipError,



  } = await supabase



    .from('store_memberships')



    .select(`



      id,



      role,



      user_id,



      active,



      created_at,



      profiles (



        id,



        name,



        active



      )



    `)



    .eq('store_id', storeId)



    .eq('active', true)



    .order('created_at')







  // =====================================



  // シフト



  // =====================================



  const {



    data: shifts,



    error: shiftsError,



  } = await supabase



    .from('shifts')



    .select(`



      id,



      user_id,



      shift_date,



      start_time,



      end_time,



      end_type,



      is_off,



      note



    `)



    .eq('store_id', storeId)



    .gte('shift_date', firstDay)



    .lte('shift_date', lastDay)







  // =====================================



  // 提出状況



  // =====================================



  const {



    data: submissions,



    error: submissionsError,



  } = await supabase



    .from('shift_submissions')



    .select(`



      user_id,



      status,



      submitted_at



    `)



    .eq('store_id', storeId)



    .eq('year', year)



    .eq('month', month)







  // =====================================



  // 各種関数



  // =====================================



  function getWeek(day: number) {



    const date =



      new Date(



        year,



        month - 1,



        day



      )







    return [



      '日',



      '月',



      '火',



      '水',



      '木',



      '金',



      '土',



    ][date.getDay()]



  }







  function getSubmissionStatus(



    userId: string



  ) {



    const submission =



      submissions?.find(



        (item) =>



          item.user_id === userId



      )







    return submission?.status === 'submitted'



      ? 'submitted'



      : 'draft'



  }







  function getShiftText(



    userId: string,



    day: number



  ) {



    const date =



      `${year}-${String(month).padStart(2, '0')}-${String(



        day



      ).padStart(2, '0')}`







    const shift =



      shifts?.find(



        (item) =>



          item.user_id === userId &&



          item.shift_date === date



      )







    if (!shift) {



      return ''



    }







    if (shift.is_off) {



      return '休'



    }







    const start =



      shift.start_time



        ? shift.start_time.slice(0, 5)



        : ''







    let end = ''







    if (shift.end_type === 'last') {



      end = 'L'



    } else if (shift.end_time) {



      end =



        shift.end_time.slice(0, 5)



    }







    if (!start && !end) {



      return ''



    }







    return `${start}-${end}`



  }







  // =====================================



  // 集計



  // =====================================



  const totalCount =



    memberships?.length ?? 0







  const submittedCount =



    submissions?.filter(



      (item) =>



        item.status === 'submitted'



    ).length ?? 0







  const notSubmittedCount =



    Math.max(



      totalCount - submittedCount,



      0



    )







  // =====================================



  // PDF用データ



  // =====================================



  const pdfStaffData =



    (memberships ?? [])



      .map((membership) => {



        const profileRaw =



          membership.profiles







        const memberProfile =



          Array.isArray(profileRaw)



            ? profileRaw[0]



            : profileRaw







        if (!memberProfile) {



          return null



        }







        const staffShifts:



          Record<number, string> = {}







        for (



          let day = 1;



          day <= lastDateNumber;



          day++



        ) {



          staffShifts[day] =



            getShiftText(



              membership.user_id,



              day



            )



        }







        return {



          name: memberProfile.name,







          role:



            membership.role === 'admin'



              ? '幹部'



              : 'スタッフ',







          submitted:
            getSubmissionStatus(
              membership.user_id
            ) === 'submitted',

          shifts: staffShifts,



        }



      })



      .filter(



        (



          item



        ): item is {



          name: string



          role: string



          submitted: boolean
          shifts: Record<number, string>



        } => item !== null



      )







  return (



    <main className="min-h-screen bg-gray-100 p-3 md:p-6">



      <div className="mx-auto max-w-[1600px]">







        {/* =====================================



            ヘッダー



        ===================================== */}



        <div className="rounded-2xl bg-white p-4 shadow md:p-6">







          <Link



            href="/dashboard"



            prefetch={false}



            className="text-sm text-gray-500"



          >



            ← 店舗一覧へ



          </Link>







          <div className="mt-4 flex items-start justify-between gap-3">







            <div className="min-w-0">



              <h1 className="truncate text-xl font-bold md:text-2xl">



                {store.name}



              </h1>







              <p className="mt-1 text-sm text-gray-500">



                シフト管理



              </p>



            </div>







            <LogoutButton />







          </div>







          {/* 管理者ボタン */}



          <div className="mt-4 flex flex-wrap gap-2">



            {canManage && (

              <Link

                href={`/stores/${storeId}/staff`}

                prefetch={false}

                className="inline-flex rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"

              >

                スタッフ管理

              </Link>

            )}



            {isSuperAdmin && (

              <Link

                href={`/stores/${storeId}/sugoroku`}

                prefetch={false}

                className="inline-flex rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"

              >

                すごろく管理

              </Link>

            )}



          </div>



          {/* スタッフ */}



            {myMembership && (



              <div className="mt-4">



                <Link



                  href={`/stores/${storeId}/shift?year=${year}&month=${month}`}



                  prefetch={false}



                  className="inline-flex w-full justify-center rounded-xl bg-black px-5 py-3 text-white md:w-auto"



                >



                  自分のシフトを入力



                </Link>



              </div>



            )}







        </div>







        {/* =====================================



            メイン



        ===================================== */}



        <div className="mt-4 rounded-2xl bg-white p-4 shadow md:mt-6 md:p-6">







          {/* =====================================



              月選択



          ===================================== */}



          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">







            <MonthSelector



              year={year}



              month={month}



            />







            {canManage && (



              <div className="grid grid-cols-2 gap-2 md:flex">







                <ShiftLockButton



                  storeId={storeId}



                  year={year}



                  month={month}



                  currentStatus={shiftStatus}



                />







                <ShiftPdfButton



                  storeName={store.name}



                  year={year}



                  month={month}



                  daysInMonth={lastDateNumber}



                  staffData={pdfStaffData}



                />







              </div>



            )}







          </div>







          {/* =====================================



              状態



          ===================================== */}



          <div className="mt-4">







            {shiftStatus === 'none' && (



              <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">



                受付未開始



              </span>



            )}







            {shiftStatus === 'open' && (



              <span className="inline-block rounded-full bg-green-50 px-3 py-1 text-xs text-green-700">



                シフト受付中



              </span>



            )}







            {shiftStatus === 'locked' && (



              <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">



                シフト確定済み



              </span>



            )}







          </div>







          {/* =====================================



              集計



          ===================================== */}



          {canManage && (



            <div className="mt-5 grid grid-cols-3 gap-2 md:flex md:gap-3">







              <div className="rounded-xl bg-green-50 p-3 md:min-w-[130px] md:px-4">



                <div className="text-[11px] text-green-700 md:text-xs">



                  提出済み



                </div>







                <div className="mt-1 text-lg font-bold text-green-800 md:text-xl">



                  {submittedCount}名



                </div>



              </div>







              <div className="rounded-xl bg-yellow-50 p-3 md:min-w-[130px] md:px-4">



                <div className="text-[11px] text-yellow-700 md:text-xs">



                  未提出



                </div>







                <div className="mt-1 text-lg font-bold text-yellow-800 md:text-xl">



                  {notSubmittedCount}名



                </div>



              </div>







              <div className="rounded-xl bg-gray-100 p-3 md:min-w-[130px] md:px-4">



                <div className="text-[11px] text-gray-600 md:text-xs">



                  在籍人数



                </div>







                <div className="mt-1 text-lg font-bold text-gray-800 md:text-xl">



                  {totalCount}名



                </div>



              </div>







            </div>



          )}







          {/* =====================================



              エラー



          ===================================== */}



          {membershipError && (



            <div className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-600">



              スタッフ情報を取得できませんでした。



            </div>



          )}







          {shiftsError && (



            <div className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-600">



              シフト情報を取得できませんでした。



            </div>



          )}







          {submissionsError && (



            <div className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-600">



              提出状況を取得できませんでした。



            </div>



          )}







          {/* =====================================



              スマホ版



              日付ごとの縦型表示



          ===================================== */}



          <div className="mt-6 space-y-3 md:hidden">







            {days.map((day) => {



              const week =



                getWeek(day)







              return (



                <div



                  key={day}



                  className="overflow-hidden rounded-xl border"



                >







                  {/* 日付 */}



                  <div className="flex items-center justify-between bg-gray-50 px-4 py-3">







                    <div className="font-bold">



                      {month}月{day}日



                    </div>







                    <span



                      className={



                        week === '日'



                          ? 'text-sm text-red-500'



                          : week === '土'



                            ? 'text-sm text-blue-500'



                            : 'text-sm text-gray-500'



                      }



                    >



                      {week}曜日



                    </span>







                  </div>







                  {/* スタッフ一覧 */}



                  <div className="divide-y">







                    {(memberships ?? [])



                      .filter((membership) => {



                        if (canManage) {



                          return true



                        }







                        return (



                          membership.user_id ===



                          user.id



                        )



                      })



                      .map((membership) => {



                        const profileRaw =



                          membership.profiles







                        const memberProfile =



                          Array.isArray(profileRaw)



                            ? profileRaw[0]



                            : profileRaw







                        if (!memberProfile) {



                          return null



                        }







                        const shiftText =



                          getShiftText(



                            membership.user_id,



                            day



                          )







                        return (



                          <div



                            key={membership.id}



                            className="flex items-center justify-between gap-3 px-4 py-3"



                          >







                            <div className="min-w-0">







                              {canManage ? (



                                <Link



                                  href={`/stores/${storeId}/shift/${membership.user_id}?year=${year}&month=${month}`}



                                  prefetch={false}



                                  className="block truncate font-medium"



                                >



                                  {memberProfile.name}



                                </Link>



                              ) : (



                                <div className="truncate font-medium">



                                  {memberProfile.name}



                                </div>



                              )}







                              {canManage && (



                                <div className="mt-1">







                                  {getSubmissionStatus(



                                    membership.user_id



                                  ) === 'submitted' ? (



                                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] text-green-700">



                                      提出済み



                                    </span>



                                  ) : (



                                    <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-[10px] text-yellow-700">



                                      未提出



                                    </span>



                                  )}







                                </div>



                              )}







                            </div>







                            <div



                              className={



                                shiftText



                                  ? 'shrink-0 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium'



                                  : 'shrink-0 text-sm text-gray-300'



                              }



                            >



                              {shiftText || '—'}



                            </div>







                          </div>



                        )



                      })}







                  </div>



                </div>



              )



            })}







          </div>







          {/* =====================================



              PC / タブレット版



          ===================================== */}



          <div className="mt-6 hidden overflow-x-auto md:block">







            <table className="min-w-max border-collapse text-sm">







              <thead>



                <tr>







                  <th className="sticky left-0 z-20 min-w-[190px] border bg-gray-100 px-3 py-3 text-left">



                    スタッフ



                  </th>







                  {days.map((day) => {



                    const week =



                      getWeek(day)







                    return (



                      <th



                        key={day}



                        className="min-w-[85px] border bg-gray-100 px-2 py-2 text-center"



                      >



                        <div>



                          {day}



                        </div>







                        <div className="text-xs font-normal text-gray-500">



                          {week}



                        </div>



                      </th>



                    )



                  })}







                </tr>



              </thead>







              <tbody>







                {memberships &&



                memberships.length > 0 ? (







                  memberships.map((membership) => {



                    const profileRaw =



                      membership.profiles







                    const memberProfile =



                      Array.isArray(profileRaw)



                        ? profileRaw[0]



                        : profileRaw







                    if (!memberProfile) {



                      return null



                    }







                    if (



                      !canManage &&



                      membership.user_id !== user.id



                    ) {



                      return null



                    }







                    const submissionStatus =



                      getSubmissionStatus(



                        membership.user_id



                      )







                    return (



                      <tr key={membership.id}>







                        <td className="sticky left-0 z-10 border bg-white px-3 py-3">







                          {canManage ? (



                            <Link



                              href={`/stores/${storeId}/shift/${membership.user_id}?year=${year}&month=${month}`}



                              prefetch={false}



                              className="font-medium underline-offset-4 hover:underline"



                            >



                              {memberProfile.name}



                            </Link>



                          ) : (



                            <div className="font-medium">



                              {memberProfile.name}



                            </div>



                          )}







                          <div className="mt-1 text-xs text-gray-400">



                            {membership.role === 'admin'



                              ? '幹部'



                              : 'スタッフ'}



                          </div>







                          {canManage && (



                            <div className="mt-2">







                              {submissionStatus === 'submitted' ? (



                                <span className="inline-block rounded-full bg-green-50 px-2 py-1 text-xs text-green-700">



                                  提出済み



                                </span>



                              ) : (



                                <span className="inline-block rounded-full bg-yellow-50 px-2 py-1 text-xs text-yellow-700">



                                  未提出



                                </span>



                              )}







                            </div>



                          )}







                        </td>







                        {days.map((day) => (



                          <td



                            key={day}



                            className="border px-2 py-3 text-center"



                          >



                            {getShiftText(



                              membership.user_id,



                              day



                            )}



                          </td>



                        ))}







                      </tr>



                    )



                  })







                ) : (



                  <tr>



                    <td



                      colSpan={lastDateNumber + 1}



                      className="border p-8 text-center text-gray-500"



                    >



                      この店舗にはまだスタッフが登録されていません。



                    </td>



                  </tr>



                )}







              </tbody>



            </table>







          </div>







        </div>



      </div>



    </main>



  )



}