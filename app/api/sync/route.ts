import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActivities, getAthlete } from '@/lib/strava'

export async function POST() {
  try {
    const accessToken = process.env.STRAVA_ACCESS_TOKEN

    const [athlete, activities] = await Promise.all([
      getAthlete(accessToken),
      getActivities(accessToken),
    ])

    // Upsert the athlete as a User row
    const user = await prisma.user.upsert({
      where: { stravaId: String(athlete.id) },
      update: {
        accessToken: accessToken ?? '',
        refreshToken: '',
        tokenExpiry: 0,
        firstname: athlete.firstname,
        lastname: athlete.lastname,
      },
      create: {
        stravaId: String(athlete.id),
        accessToken: accessToken ?? '',
        refreshToken: '',
        tokenExpiry: 0,
        firstname: athlete.firstname,
        lastname: athlete.lastname,
      },
    })

    // Only sync Run-type activities
    const runs = activities.filter((a) => a.type === 'Run')

    let synced = 0
    for (const run of runs) {
      await prisma.run.upsert({
        where: { stravaId: String(run.id) },
        update: {
          name: run.name,
          distance: run.distance,
          movingTime: run.moving_time,
          elapsedTime: run.elapsed_time,
          averageSpeed: run.average_speed,
          maxSpeed: run.max_speed,
          averageHeartrate: run.average_heartrate ?? null,
          maxHeartrate: run.max_heartrate ?? null,
          totalElevation: run.total_elevation_gain,
          startDate: new Date(run.start_date),
        },
        create: {
          stravaId: String(run.id),
          name: run.name,
          distance: run.distance,
          movingTime: run.moving_time,
          elapsedTime: run.elapsed_time,
          averageSpeed: run.average_speed,
          maxSpeed: run.max_speed,
          averageHeartrate: run.average_heartrate ?? null,
          maxHeartrate: run.max_heartrate ?? null,
          totalElevation: run.total_elevation_gain,
          startDate: new Date(run.start_date),
          userId: user.id,
        },
      })
      synced++
    }

    return NextResponse.json({ ok: true, synced, userId: user.id })
  } catch (err) {
    console.error('[sync]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
