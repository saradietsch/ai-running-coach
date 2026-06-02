import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-orange-50 flex flex-col items-center justify-center gap-6">
      <h1 className="text-5xl font-semibold text-stone-900 tracking-tight">
        AI Running Coach
      </h1>
      <p className="text-lg text-stone-500">Your personal Strava-powered training assistant</p>
      <div className="flex gap-4 mt-4">
        <Link
          href="/dashboard"
          className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors"
        >
          View Dashboard
        </Link>
        <Link
          href="/coach"
          className="px-6 py-3 bg-white border border-orange-200 hover:bg-orange-100 text-stone-700 rounded-xl font-medium transition-colors"
        >
          Ask AI Coach
        </Link>
      </div>
    </main>
  )
}
