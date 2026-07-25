import React from 'react'

interface NutritionRingsProps {
  proteinPercent: number
  carbsPercent: number
  fatPercent: number
  size?: number
}

export function NutritionRings({ proteinPercent, carbsPercent, fatPercent, size = 96 }: NutritionRingsProps) {
  const stroke = 8
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  const pack = (pct: number) => Math.max(0, Math.min(100, pct))
  const p = pack(proteinPercent)
  const c = pack(carbsPercent)
  const f = pack(fatPercent)

  const pOffset = circumference * (1 - p / 100)
  const cOffset = circumference * (1 - c / 100)
  const fOffset = circumference * (1 - f / 100)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`translate(${size / 2}, ${size / 2})`}>
        <circle r={radius} strokeWidth={stroke} stroke="#f3f4f6" fill="none" />
        <g transform="rotate(-90)">
          <circle r={radius} strokeWidth={stroke} stroke="#60a5fa" fill="none" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={pOffset} strokeLinecap="round" />
          <circle r={radius - 12} strokeWidth={stroke} stroke="#34d399" fill="none" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={cOffset} strokeLinecap="round" />
          <circle r={radius - 24} strokeWidth={stroke} stroke="#fb923c" fill="none" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={fOffset} strokeLinecap="round" />
        </g>
      </g>
    </svg>
  )
}
