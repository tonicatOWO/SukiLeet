import type { DayValueI, StreakI } from './types'

export function getDifficultyColor(difficulty: 'Easy' | 'Medium' | 'Hard'): string {
  switch (difficulty) {
    case 'Easy': return '#1cbaba'
    case 'Medium': return '#ffb700'
    case 'Hard': return '#ef4743'
    default: return '#888'
  }
}

export function streakEmoji(streak: number): string {
  if (streak <= 1) return '🌱'
  if (streak <= 5) return '🌿'
  if (streak <= 10) return '🔥'
  if (streak <= 20) return '🌟'
  if (streak <= 30) return '💪'
  if (streak <= 40) return '🚀'
  if (streak <= 50) return '🎯'
  if (streak <= 75) return '🏆'
  if (streak <= 100) return '👑'
  return '🐉'
}

export function getDayColor(count: number): string {
  if (count === 0) return '#ffffff14'
  if (count < 5) return '#016620'
  if (count < 10) return '#28c244'
  if (count < 15) return '#67BD72'
  return '#9be9a8'
}

export function formatStreak(data: StreakI[]): { month: string; days: DayValueI[] }[] {
  const result: Record<string, DayValueI[]> = {}
  data.forEach((entry) => {
    const date = new Date(entry.date)
    const month = date.toLocaleString('default', { month: 'short' })
    const day = date.getDate()
    if (!result[month]) result[month] = []
    result[month].push({ day, value: entry.value })
  })
  return Object.keys(result).map((month) => ({ month, days: result[month] }))
}
