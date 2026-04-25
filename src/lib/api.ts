import type { DailyProblemI, UserStatsI, UserStreakI } from './types'

const BASE_URL = 'https://leet-push-api-git-master-husamahmuds-projects.vercel.app/api/v2'

export const fetchDailyProblem = async (): Promise<DailyProblemI> => {
  const res = await fetch(`${BASE_URL}/daily`)
  if (!res.ok) throw new Error('Failed to fetch daily problem')
  const data = await res.json()
  return data.data
}

export const fetchUserStats = async (username: string): Promise<UserStatsI> => {
  const res = await fetch(`${BASE_URL}/${username}`)
  if (res.status === 404) throw new Error('User not found')
  if (!res.ok) throw new Error('Failed to fetch user stats')
  const data = await res.json()
  return data.data
}

export const fetchUserStreak = async (username: string): Promise<UserStreakI> => {
  const res = await fetch(`${BASE_URL}/userProfileCalendar/${username}`)
  if (!res.ok) throw new Error('Failed to fetch user streak')
  return await res.json()
}
