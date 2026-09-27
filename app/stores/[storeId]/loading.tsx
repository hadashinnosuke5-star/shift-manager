export default function Loading() {
  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="mx-auto max-w-[1600px]">

        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />

          <div className="mt-5 h-8 w-40 animate-pulse rounded bg-gray-200" />

          <div className="mt-3 h-4 w-24 animate-pulse rounded bg-gray-200" />
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow">
          <div className="h-7 w-32 animate-pulse rounded bg-gray-200" />

          <div className="mt-6 h-40 animate-pulse rounded bg-gray-100" />
        </div>

      </div>
    </main>
  )
}