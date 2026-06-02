import type { StravaActivity } from './mock/strava-data'
import { mockActivities, MOCK_ATHLETE } from './mock/strava-data'

export type { StravaActivity }

export interface StravaAthlete {
  id: number
  firstname: string
  lastname: string
  profile: string
}

const STRAVA_BASE = 'https://www.strava.com/api/v3'
const IS_MOCK = process.env.STRAVA_MOCK_MODE === 'true'

export async function getActivities(accessToken?: string): Promise<StravaActivity[]> {
  if (IS_MOCK) return mockActivities

  const res = await fetch(`${STRAVA_BASE}/athlete/activities?per_page=200`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Strava activities error: ${res.status}`)
  return res.json() as Promise<StravaActivity[]>
}

export async function getAthlete(accessToken?: string): Promise<StravaAthlete> {
  if (IS_MOCK) return MOCK_ATHLETE

  const res = await fetch(`${STRAVA_BASE}/athlete`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Strava athlete error: ${res.status}`)
  return res.json() as Promise<StravaAthlete>
}

// m/s → min/mile string e.g. "9:32"
export function speedToPace(metersPerSecond: number): string {
  const secsPerMile = 1609.344 / metersPerSecond
  const mins = Math.floor(secsPerMile / 60)
  const secs = Math.round(secsPerMile % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// meters → miles, 2 decimal places
export function metersToMiles(meters: number): number {
  return Math.round((meters / 1609.344) * 100) / 100
}

// meters elevation → feet, rounded
export function metersToFeet(meters: number): number {
  return Math.round(meters * 3.28084)
}

// seconds → "h:mm:ss" or "m:ss"
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}
