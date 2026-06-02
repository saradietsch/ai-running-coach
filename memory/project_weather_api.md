---
name: project-weather-api-idea
description: Planned feature — add weather API to dashboard welcome banner
metadata:
  type: project
---

Add a weather API to the dashboard so the welcome section (currently "Welcome back, Sara") also shows current weather and a contextual message like "Beautiful day for a run!" 

**Why:** Demonstrates a second external API integration on the dashboard, strengthening the portfolio project's API story alongside Strava.

**How to apply:** Implement after the AI coach is complete. Good candidate: Open-Meteo (free, no key needed) or OpenWeatherMap. Display weather in the welcome card at the top of `/dashboard/page.tsx`. Tie the message to conditions (sunny → "beautiful day to run", rainy → "embrace the rain", etc.).
</thinking>
