import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const runs = await prisma.run.findMany({
      orderBy: { startDate: 'desc' },
      select: {
        id: true,
        stravaId: true,
        name: true,
        distance: true,
        movingTime: true,
        averageSpeed: true,
        averageHeartrate: true,
        maxHeartrate: true,
        totalElevation: true,
        startDate: true,
      },
    })

    return NextResponse.json({ runs })
  } catch (err) {
    console.error('[runs]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
