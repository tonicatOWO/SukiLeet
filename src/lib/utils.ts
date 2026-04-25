import type { DayValueI, StreakI } from './types'

export type Platform = 'github' | 'gitlab' | 'codeberg'

export interface ParsedRepo {
  platform: Platform
  host: string
  owner: string
  repoName: string
  projectPath: string
}

export function parseRepoUrl(url: string): ParsedRepo | null {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname
    const parts = parsed.pathname.slice(1).split('/').filter(Boolean)
    if (parts.length < 2) return null

    if (host === 'github.com') {
      return { platform: 'github', host, owner: parts[0], repoName: parts[1], projectPath: `${parts[0]}/${parts[1]}` }
    }
    if (host === 'codeberg.org') {
      return { platform: 'codeberg', host, owner: parts[0], repoName: parts[1], projectPath: `${parts[0]}/${parts[1]}` }
    }
    if (host.includes('gitlab')) {
      const projectPath = parts.join('/')
      return { platform: 'gitlab', host, owner: parts[0], repoName: parts[parts.length - 1], projectPath }
    }
    return null
  } catch {
    return null
  }
}

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
