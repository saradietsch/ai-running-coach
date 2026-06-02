import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { metersToMiles, metersToFeet, speedToPace, formatDuration } from '@/lib/strava'
import { getWeather, weatherSummary } from '@/lib/weather'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const COACH_PERSONA = `You are an expert running coach with 20 years of experience coaching recreational and competitive runners. You have access to the athlete's complete training log and give personalized, specific advice based on their actual data — not generic tips.

Guidelines:
- Reference specific runs, dates, paces, or patterns from their data when relevant
- Be encouraging but honest
- Keep responses to 2–4 paragraphs unless the question genuinely needs more
- Use plain conversational language, no bullet-point lists unless the question calls for it
- Remember everything discussed earlier in the conversation`

function buildRunsSummary(
  runs: {
    name: string
    distance: number
    movingTime: number
    averageSpeed: number
    averageHeartrate: number | null
    totalElevation: number
    startDate: Date
  }[],
  athleteName: string
): string {
  const sorted = [...runs].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  )
  const totalMiles = sorted.reduce((s, r) => s + r.distance, 0) / 1609.344
  const totalTime = sorted.reduce((s, r) => s + r.movingTime, 0)
  const overallSpeed =
    sorted.reduce((s, r) => s + r.distance, 0) /
    sorted.reduce((s, r) => s + r.movingTime, 0)

  const rows = sorted.map((r) => {
    const date = new Date(r.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const miles = metersToMiles(r.distance)
    const pace = speedToPace(r.averageSpeed)
    const hr = r.averageHeartrate ? `${Math.round(r.averageHeartrate)} bpm` : 'no HR'
    const elev = `${metersToFeet(r.totalElevation)} ft`
    return `${date} | ${r.name} | ${miles} mi | ${pace}/mi | ${hr} | ${elev} gain | ${formatDuration(r.movingTime)}`
  })

  return `ATHLETE TRAINING LOG
Athlete: ${athleteName}
Period: ${new Date(sorted[0].startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} – ${new Date(sorted[sorted.length - 1].startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
Total runs: ${sorted.length} | Total distance: ${Math.round(totalMiles * 10) / 10} mi | Total time: ${formatDuration(totalTime)} | Overall avg pace: ${speedToPace(overallSpeed)}/mi

Chronological log (date | name | distance | pace | heart rate | elevation | duration):
${rows.join('\n')}`
}

type HistoryMessage = { role: 'user' | 'assistant'; content: string }

export async function POST(request: Request) {
  try {
    const { question, history = [] }: { question: string; history: HistoryMessage[] } =
      await request.json()

    if (!question?.trim()) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 })
    }

    const [runs, user, weather] = await Promise.all([
      prisma.run.findMany({
        orderBy: { startDate: 'asc' },
        select: {
          name: true,
          distance: true,
          movingTime: true,
          averageSpeed: true,
          averageHeartrate: true,
          totalElevation: true,
          startDate: true,
        },
      }),
      prisma.user.findFirst({ select: { firstname: true, lastname: true } }),
      getWeather(),
    ])

    const athleteName =
      [user?.firstname, user?.lastname].filter(Boolean).join(' ') || 'Athlete'

    // Merge persona + training data + weather into one cached system block
    const systemText = `${COACH_PERSONA}\n\n${buildRunsSummary(runs, athleteName)}\n\n${weatherSummary(weather)}`

    // Build the full message thread: prior history + new question
    const messages: Anthropic.MessageParam[] = [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: question },
    ]

    const stream = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      stream: true,
      system: [
        {
          type: 'text',
          text: systemText,
          // cache_control keeps the large training log cached between turns
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages,
    })

    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
        controller.close()
      },
    })

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (err) {
    console.error('[coach]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
