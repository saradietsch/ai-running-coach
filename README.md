# AI Running Coach

A personalized running coach powered by Claude AI and your real training data from Strava. Ask questions about your training, get weather-aware advice, and track your progress — all in one place.

## Features

- **AI Coaching Chat** — Conversational coaching powered by Claude Sonnet, with full context of your training history
- **Strava Integration** — Syncs your real run data (distance, pace, heart rate, elevation) directly from Strava
- **Training Dashboard** — Weekly mileage and pace trend charts, total stats, and paginated run history
- **Weather-Aware Recommendations** — Real-time weather data with personalized running conditions advice
- **Prompt Caching** — Your training log is cached between messages for fast, cost-efficient responses

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL (Neon serverless) |
| ORM | Prisma |
| AI | Anthropic Claude Sonnet 4.6 |
| Charts | Recharts |
| Data Source | Strava API v3 |
| Weather | OpenWeather API |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- A PostgreSQL database (e.g., [Neon](https://neon.tech))
- An [Anthropic API key](https://console.anthropic.com/)
- A Strava account and API access token (or use mock mode)

### Installation

```bash
git clone https://github.com/your-username/ai-running-coach.git
cd ai-running-coach
npm install
```

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# Required
DATABASE_URL=postgresql://user:password@host/db?sslmode=require
ANTHROPIC_API_KEY=sk-ant-...

# Strava — use a real token, or enable mock mode
STRAVA_ACCESS_TOKEN=your_strava_access_token
STRAVA_MOCK_MODE=false

# Optional — falls back to mock weather data if missing
OPENWEATHER_API_KEY=your_openweather_key
```

### Database Setup

```bash
npx prisma generate
npx prisma migrate dev
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Sync Your Strava Data

After the app is running, hit the sync endpoint to load your activities into the database:

```bash
curl -X POST http://localhost:3000/api/sync
```

Or set `STRAVA_MOCK_MODE=true` to use the included mock dataset (54 realistic runs spanning January–May 2026).

## Project Structure

```
app/
├── page.tsx                  # Home / landing page
├── dashboard/
│   ├── page.tsx              # Stats, charts, run history
│   ├── WeeklyChart.tsx       # Weekly mileage bar chart
│   └── PaceChart.tsx         # Pace trend line chart
├── coach/
│   └── page.tsx              # AI chat interface
└── api/
    ├── sync/route.ts         # POST: sync Strava → database
    ├── runs/route.ts         # GET: retrieve all stored runs
    └── coach/route.ts        # POST: streaming AI coach responses
lib/
├── prisma.ts                 # Singleton Prisma client
├── strava.ts                 # Strava API helpers and data formatting
├── weather.ts                # OpenWeather API and recommendations
└── mock/
    └── strava-data.ts        # Mock run dataset for development
prisma/
└── schema.prisma             # User and Run data models
```

## Data Model

```
User
└── stravaId, accessToken, refreshToken, firstname, lastname

Run
└── stravaId, name, distance, movingTime, averageSpeed, maxSpeed,
    averageHeartrate, maxHeartrate, totalElevation, startDate, userId
```

Each user has many runs. The AI coach receives the full run history as context on every conversation.

## How the AI Coach Works

The `/api/coach` endpoint streams responses from Claude Sonnet. On each request it:

1. Fetches all runs from the database and formats them as a training log
2. Retrieves current weather conditions
3. Builds a system prompt with a 20-year experienced coach persona
4. Uses **prompt caching** on the training log to reduce latency and token costs
5. Streams the response back token-by-token

## Deployment

The app is configured for deployment on Vercel with a Neon PostgreSQL database. The build step runs `prisma generate` automatically.

```bash
npm run build
```
