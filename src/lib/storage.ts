import { storage } from 'wxt/utils/storage'

export const repoToken = storage.defineItem<string>('local:githubToken', { defaultValue: '' })
export const repoUrl = storage.defineItem<string>('local:githubRepo', { defaultValue: '' })
export const repoBranch = storage.defineItem<string>('local:githubBranch', { defaultValue: 'main' })
export const separateFolder = storage.defineItem<string>('local:separateFolder', { defaultValue: 'no' })
export const customDir = storage.defineItem<string>('local:customDir', { defaultValue: '' })
export const keyboardShortcut = storage.defineItem<{ key: string; modifier: string } | null>(
  'local:keyboardShortcut',
  { defaultValue: null },
)
export const solutionsPushed = storage.defineItem<number>('local:solutionsPushed', { defaultValue: 0 })
export const dailyChallengesCount = storage.defineItem<number>('local:dailyChallenges', { defaultValue: 0 })
export const leetcodeUsername = storage.defineItem<string>('local:username', { defaultValue: '' })
