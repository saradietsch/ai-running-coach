'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface PacePoint {
  date: string
  pace: string
  paceSeconds: number
}

function formatYAxis(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function PaceChart({ data }: { data: PacePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" />
        <XAxis dataKey="date" tick={{ fill: '#a8a29e', fontSize: 11 }} />
        <YAxis
          reversed
          tickFormatter={formatYAxis}
          tick={{ fill: '#a8a29e', fontSize: 11 }}
          domain={['auto', 'auto']}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #fed7aa', borderRadius: 8 }}
          labelStyle={{ color: '#78716c' }}
          itemStyle={{ color: '#0284c7' }}
          formatter={(_: number, __: string, props: { payload: PacePoint }) => [
            `${props.payload.pace} /mi`, 'Pace',
          ]}
        />
        <Line
          type="monotone"
          dataKey="paceSeconds"
          stroke="#0284c7"
          strokeWidth={2}
          dot={{ fill: '#0284c7', r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
