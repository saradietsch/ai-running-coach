'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface WeeklyData {
  week: string
  mi: number
}

export default function WeeklyChart({ data }: { data: WeeklyData[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" />
        <XAxis dataKey="week" tick={{ fill: '#a8a29e', fontSize: 11 }} />
        <YAxis tick={{ fill: '#a8a29e', fontSize: 11 }} unit=" mi" />
        <Tooltip
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #fed7aa', borderRadius: 8 }}
          labelStyle={{ color: '#78716c' }}
          itemStyle={{ color: '#ea580c' }}
          formatter={(v: unknown) => [`${v} mi`, 'Distance']}
        />
        <Bar dataKey="mi" fill="#f97316" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
