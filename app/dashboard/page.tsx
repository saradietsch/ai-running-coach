import { prisma } from '@/lib/prisma'
import { metersToMiles, metersToFeet, speedToPace, formatDuration } from '@/lib/strava'
import { getWeather } from '@/lib/weather'
import WeeklyChart from './WeeklyChart'
import PaceChart from './PaceChart'
import Link from 'next/link'

const PER_PAGE = 10

function getWeekLabel(date: Date): string {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay() + 1)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1'))

  const [allRuns, user, weather] = await Promise.all([
    prisma.run.findMany({ orderBy: { startDate: 'asc' } }),
    prisma.user.findFirst(),
    getWeather(),
  ])

  if (allRuns.length === 0) {
    return (
      <main className="min-h-screen bg-orange-50 flex flex-col items-center justify-center gap-4">
        <p className="text-stone-500">No runs yet.</p>
        <form action="/api/sync" method="POST">
          <button className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600">
            Sync Runs
          </button>
        </form>
      </main>
    )
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalRuns = allRuns.length
  const totalMiles = allRuns.reduce((s, r) => s + r.distance, 0) / 1609.344
  const totalTimeSeconds = allRuns.reduce((s, r) => s + r.movingTime, 0)
  const totalElevationFt = allRuns.reduce((s, r) => s + r.totalElevation, 0) * 3.28084
  const overallSpeed =
    allRuns.reduce((s, r) => s + r.distance, 0) /
    allRuns.reduce((s, r) => s + r.movingTime, 0)
  const avgPace = speedToPace(overallSpeed)

  const runsWithHR = allRuns.filter((r) => r.averageHeartrate)
  const avgHR =
    runsWithHR.length > 0
      ? Math.round(runsWithHR.reduce((s, r) => s + (r.averageHeartrate ?? 0), 0) / runsWithHR.length)
      : null

  // ── Weekly mileage chart ──────────────────────────────────────────────────
  const weeklyMap = new Map<string, number>()
  for (const run of allRuns) {
    const key = getWeekLabel(run.startDate)
    weeklyMap.set(key, (weeklyMap.get(key) ?? 0) + run.distance / 1609.344)
  }
  const weeklyData = Array.from(weeklyMap.entries()).map(([week, mi]) => ({
    week,
    mi: Math.round(mi * 10) / 10,
  }))

  // ── Pace trend (last 30 runs) ─────────────────────────────────────────────
  const last30 = [...allRuns]
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(-30)

  const paceData = last30.map((r) => ({
    date: new Date(r.startDate).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
    pace: speedToPace(r.averageSpeed),
    paceSeconds: Math.round(1609.344 / r.averageSpeed),
  }))

  // ── Paginated runs table ──────────────────────────────────────────────────
  const sorted = [...allRuns].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  )
  const totalPages = Math.ceil(sorted.length / PER_PAGE)
  const pageRuns = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const firstName = user?.firstname ?? 'Runner'

  return (
    <main className="min-h-screen bg-orange-50">
      {/* Nav */}
      <nav className="border-b border-orange-200 bg-white/70 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-lg text-stone-900 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            Strava Coach
          </span>
          <Link href="/dashboard" className="text-orange-600 text-sm font-medium">Dashboard</Link>
          <Link href="/coach" className="text-stone-500 text-sm hover:text-stone-900 transition-colors">AI Coach</Link>
        </div>
        <form action="/api/sync" method="POST">
          <button className="px-3 py-1.5 bg-orange-100 hover:bg-orange-200 rounded-lg text-sm text-orange-700 font-medium transition-colors">
            Sync
          </button>
        </form>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Welcome + Weather */}
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          <div className="flex-1">
            <h1 className="text-5xl font-bold text-stone-900 tracking-tight">Welcome back, {firstName}</h1>
            <p className="text-stone-500 text-sm mt-2">Here is your training overview for the last 6 months.</p>
          </div>

          {/* Weather card */}
          <div className="bg-white rounded-xl border border-orange-200 shadow-sm px-5 py-4 min-w-[260px]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-widest">Dallas, TX</span>
              {weather.isMock && (
                <span className="text-xs text-stone-300 italic">preview</span>
              )}
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-semibold text-stone-900">{weather.temp}°F</span>
              <span className="text-stone-500 text-sm capitalize">{weather.description}</span>
            </div>
            <p className="text-stone-400 text-xs">
              Feels like {weather.feelsLike}°F · Wind {weather.windSpeed} mph
            </p>
            <p className="text-stone-400 text-xs mt-0.5">
              Sunrise {weather.sunrise} · Sunset {weather.sunset}
            </p>
            <div className={`mt-3 pt-3 border-t border-orange-100`}>
              <p className={`text-xs font-medium ${weather.isGoodForRunning ? 'text-orange-600' : 'text-red-500'}`}>
                {weather.recommendation}
              </p>
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Runs', value: totalRuns.toString() },
            { label: 'Total Distance', value: `${Math.round(totalMiles)} mi` },
            { label: 'Total Time', value: formatDuration(totalTimeSeconds) },
            { label: 'Avg Pace', value: `${avgPace} /mi` },
            { label: 'Elevation Gain', value: `${Math.round(totalElevationFt).toLocaleString()} ft` },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl p-4 border border-orange-200 shadow-sm">
              <p className="text-stone-400 text-xs uppercase tracking-widest mb-1">{s.label}</p>
              <p className="text-2xl font-semibold text-stone-900">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-5 border border-orange-200 shadow-sm">
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">
              Weekly Mileage
            </h2>
            <WeeklyChart data={weeklyData} />
          </div>
          <div className="bg-white rounded-xl p-5 border border-orange-200 shadow-sm">
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">
              Pace Trend — last 30 runs
            </h2>
            <PaceChart data={paceData} />
          </div>
        </div>

        {/* Runs table */}
        <div className="bg-white rounded-xl border border-orange-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-orange-100 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest">All Runs</h2>
            <span className="text-xs text-stone-400">{totalRuns} total</span>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-stone-400 text-xs uppercase tracking-widest border-b border-orange-100 bg-orange-50">
                <th className="text-left px-5 py-3">Date</th>
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-right px-5 py-3">Distance</th>
                <th className="text-right px-5 py-3">Time</th>
                <th className="text-right px-5 py-3">Pace</th>
                <th className="text-right px-5 py-3">Avg HR</th>
                <th className="text-right px-5 py-3">Elevation</th>
              </tr>
            </thead>
            <tbody>
              {pageRuns.map((run, i) => (
                <tr
                  key={run.id}
                  className={`border-b border-orange-50 last:border-0 hover:bg-orange-50 transition-colors ${
                    i % 2 === 0 ? 'bg-white' : 'bg-orange-50/40'
                  }`}
                >
                  <td className="px-5 py-3 text-stone-500 text-sm">
                    {new Date(run.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-5 py-3 text-stone-900 font-medium">{run.name}</td>
                  <td className="px-5 py-3 text-right text-orange-600 font-semibold">
                    {metersToMiles(run.distance)} mi
                  </td>
                  <td className="px-5 py-3 text-right text-stone-600">
                    {formatDuration(run.movingTime)}
                  </td>
                  <td className="px-5 py-3 text-right text-sky-600 font-medium">
                    {speedToPace(run.averageSpeed)} /mi
                  </td>
                  <td className="px-5 py-3 text-right text-stone-500">
                    {run.averageHeartrate ? `${Math.round(run.averageHeartrate)} bpm` : '—'}
                  </td>
                  <td className="px-5 py-3 text-right text-stone-500">
                    {metersToFeet(run.totalElevation)} ft
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="px-5 py-4 border-t border-orange-100 flex items-center justify-between">
            <Link
              href={`/dashboard?page=${page - 1}`}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                page <= 1
                  ? 'text-stone-300 pointer-events-none'
                  : 'text-stone-600 hover:bg-orange-100'
              }`}
            >
              ← Newer
            </Link>

            <span className="text-xs text-stone-400">
              Page {page} of {totalPages}
            </span>

            <Link
              href={`/dashboard?page=${page + 1}`}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                page >= totalPages
                  ? 'text-stone-300 pointer-events-none'
                  : 'text-stone-600 hover:bg-orange-100'
              }`}
            >
              Older →
            </Link>
          </div>
        </div>

        {avgHR && (
          <p className="text-xs text-stone-400 text-center">
            Average heart rate across all runs: {avgHR} bpm
          </p>
        )}
      </div>
    </main>
  )
}
