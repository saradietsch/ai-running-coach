export interface WeatherData {
  temp: number          // °F, current
  feelsLike: number     // °F
  condition: string     // "Clear", "Rain", "Thunderstorm", etc.
  description: string   // "clear sky", "light rain", etc.
  sunrise: string       // "6:14 AM"
  sunset: string        // "8:32 PM"
  windSpeed: number     // mph
  recommendation: string
  isGoodForRunning: boolean
  isMock: boolean
}

// Dallas, TX
const LAT = 32.7767
const LON = -96.7970
const TZ  = 'America/Chicago'

function formatTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: TZ,
  })
}

function getRecommendation(
  conditionId: number,
  temp: number,
  windMph: number,
): { text: string; isGood: boolean } {
  // Thunderstorm
  if (conditionId >= 200 && conditionId < 300) {
    return { text: 'Thunderstorms today — rest day or treadmill recommended.', isGood: false }
  }
  // Heavy rain
  if (conditionId >= 502 && conditionId < 600) {
    return { text: 'Heavy rain — consider a rest day or move indoors.', isGood: false }
  }
  // Drizzle or light rain
  if ((conditionId >= 300 && conditionId < 400) || conditionId === 500 || conditionId === 501) {
    return { text: 'Light rain — manageable with a jacket. Keep it shorter.', isGood: true }
  }
  // Snow / freezing
  if (conditionId >= 600 && conditionId < 700) {
    return { text: 'Wintry conditions — watch your footing and shorten the run.', isGood: true }
  }
  // Fog / atmosphere
  if (conditionId >= 700 && conditionId < 800) {
    return { text: 'Low visibility — stick to familiar routes and wear bright gear.', isGood: true }
  }
  // Extreme heat (Dallas summers)
  if (temp > 98) {
    return { text: 'Extreme heat — run before 7am or skip it today.', isGood: false }
  }
  if (temp > 88) {
    return { text: 'Hot day — best window is before 8am or after 7:30pm.', isGood: true }
  }
  if (temp > 78) {
    return { text: 'Warm out — aim for early morning or evening to stay comfortable.', isGood: true }
  }
  // Cold
  if (temp < 25) {
    return { text: 'Very cold — layer up and keep the run short.', isGood: true }
  }
  if (temp < 40) {
    return { text: 'Cold but runnable — wear layers and warm up gradually.', isGood: true }
  }
  // Wind
  if (windMph > 25) {
    return { text: 'Very windy — run into the wind on the way out so it pushes you home.', isGood: true }
  }
  // Sweet spot
  if (temp >= 50 && temp <= 72 && conditionId === 800) {
    return { text: 'Perfect running weather — any time of day works great.', isGood: true }
  }
  return { text: 'Good conditions for a run today.', isGood: true }
}

const MOCK: WeatherData = {
  temp: 76,
  feelsLike: 79,
  condition: 'Partly Cloudy',
  description: 'scattered clouds',
  sunrise: '6:18 AM',
  sunset: '8:26 PM',
  windSpeed: 9,
  recommendation: 'Good conditions — morning or evening both work well today.',
  isGoodForRunning: true,
  isMock: true,
}

export async function getWeather(): Promise<WeatherData> {
  const key = process.env.OPENWEATHER_API_KEY
  if (!key) return MOCK

  try {
    const url =
      `https://api.openweathermap.org/data/2.5/weather` +
      `?lat=${LAT}&lon=${LON}&appid=${key}&units=imperial`

    const res = await fetch(url, { next: { revalidate: 1800 } }) // cache 30 min
    if (!res.ok) return MOCK

    const data = await res.json()

    const conditionId: number = data.weather[0].id
    const temp        = Math.round(data.main.temp)
    const feelsLike   = Math.round(data.main.feels_like)
    const windMph     = Math.round(data.wind?.speed ?? 0)
    const condition   = data.weather[0].main as string
    const description = data.weather[0].description as string
    const sunrise     = formatTime(data.sys.sunrise)
    const sunset      = formatTime(data.sys.sunset)

    const { text, isGood } = getRecommendation(conditionId, temp, windMph)

    return {
      temp,
      feelsLike,
      condition,
      description,
      sunrise,
      sunset,
      windSpeed: windMph,
      recommendation: text,
      isGoodForRunning: isGood,
      isMock: false,
    }
  } catch {
    return MOCK
  }
}

// Plain-text summary for Claude's context
export function weatherSummary(w: WeatherData): string {
  return `CURRENT WEATHER (Dallas, TX):
Temperature: ${w.temp}°F (feels like ${w.feelsLike}°F)
Conditions: ${w.description}
Wind: ${w.windSpeed} mph
Sunrise: ${w.sunrise} · Sunset: ${w.sunset}
Running outlook: ${w.recommendation}`
}
