import '../assets/content.css'
import {
  repoToken,
  repoUrl as repoUrlStorage,
  repoBranch,
  separateFolder as separateFolderStorage,
  customDir as customDirStorage,
  keyboardShortcut as shortcutStorage,
  solutionsPushed as solutionsPushedStorage,
  dailyChallengesCount,
} from '../lib/storage'
import { parseRepoUrl } from '../lib/utils'
import * as github from '../lib/github'
import * as gitlab from '../lib/gitlab'
import * as codeberg from '../lib/codeberg'
import { getFriendlyWriteError } from '../lib/repo-write'

const FILE_EXTENSIONS: Record<string, string> = {
  C: '.c',
  'C++': '.cpp',
  'C#': '.cs',
  Dart: '.dart',
  Elixir: '.ex',
  Erlang: '.erl',
  Go: '.go',
  Java: '.java',
  JavaScript: '.js',
  Kotlin: '.kt',
  PHP: '.php',
  Python: '.py',
  Python3: '.py',
  Racket: '.rkt',
  Ruby: '.rb',
  Rust: '.rs',
  Scala: '.scala',
  Swift: '.swift',
  TypeScript: '.ts',
  MySQL: '.sql',
  PostgreSQL: '.sql',
  Oracle: '.sql',
  'MS SQL Server': '.tsql',
  Pandas: '.py',
}

const LOCAL_STORAGE_KEYS: Record<string, string> = {
  C: 'c',
  'C++': 'cpp',
  'C#': 'csharp',
  Dart: 'dart',
  Elixir: 'elixir',
  Erlang: 'erlang',
  Go: 'golang',
  Java: 'java',
  JavaScript: 'javascript',
  Kotlin: 'kotlin',
  PHP: 'php',
  Python: 'python',
  Python3: 'python3',
  Racket: 'racket',
  Ruby: 'ruby',
  Rust: 'rust',
  Scala: 'scala',
  Swift: 'swift',
  TypeScript: 'typeScript',
  MySQL: 'mysql',
  Oracle: 'oraclesql',
  PostgreSQL: 'postgresql',
  'MS SQL Server': 'mssql',
  Pandas: 'pythondata',
}

const DATABASE_LANGUAGES = ['MySQL', 'Oracle', 'PostgreSQL', 'MS SQL Server', 'Pandas']

const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform)
const DEFAULT_SHORTCUT = isMac ? { key: 'p', modifier: 'meta' } : { key: 'p', modifier: 'ctrl' }

const SELECTORS = {
  problemName:
    'div.flex.items-start.justify-between.gap-4 > div.flex.items-start.gap-2 > div > a',
  solutionLanguage: 'div.flex.h-full.flex-nowrap.items-center > div:nth-child(1) > button',
  accepted:
    'div.text-green-s.dark\\:text-dark-green-s.flex.flex-1.items-center.gap-2.text-\\[16px\\].font-medium.leading-6 > span',
  parentDiv:
    'div.flex.justify-between.py-1.pl-3.pr-1 > div.relative.flex.overflow-hidden.rounded.bg-fill-tertiary.dark\\:bg-fill-tertiary.\\!bg-transparent > div.flex-none.flex > div:nth-child(2)',
  parentDivCodeEditor:
    '#ide-top-btns > div:nth-child(1) > div > div > div:nth-child(2) > div > div:nth-child(2) > div > div:last-child',
  codeBlock: 'div.px-4.py-3 > div > pre > code',
  performanceMetrics:
    'div.flex.items-center.justify-between.gap-2 > div > div.rounded-sd.flex.min-w-\\[275px\\].flex-1.cursor-pointer.flex-col.px-4.py-3.text-xs > div:nth-child(2) > span.font-semibold',
}

interface Shortcut {
  key: string
  modifier: string
}

interface ProblemInfo {
  probNum: string
  probName: string
  fileName: string
  solution: string
  commitMsg: string
  language: string
}

interface RepoConfig {
  token: string
  repo: string
  branch: string
  separateFolder: string
  customDir: string
}

let KEYBOARD_SHORTCUT: Shortcut = DEFAULT_SHORTCUT
let SHORTCUT_DISPLAY: string = getShortcutDisplayText(KEYBOARD_SHORTCUT)

function getShortcutDisplayText(shortcut: Shortcut): string {
  const sym =
    shortcut.modifier === 'meta'
      ? '⌘'
      : shortcut.modifier === 'alt'
        ? '⌥'
        : shortcut.modifier === 'shift'
          ? '⇧'
          : 'Ctrl+'
  return `${sym}${shortcut.key.toUpperCase()}`
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function formatPushTimestamp(date = new Date()): string {
  const pad = (value: number) => value.toString().padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

function addTimestampToFileName(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.')
  const suffix = formatPushTimestamp()

  if (lastDot <= 0) return `${fileName}-${suffix}`

  const baseName = fileName.slice(0, lastDot)
  const extension = fileName.slice(lastDot)
  return `${baseName}-${suffix}${extension}`
}

function isSubmissionPage(): boolean {
  return window.location.href.includes('submissions')
}

function hasAcceptedSolution(): boolean {
  return !!document.querySelector(SELECTORS.accepted)
}

function initLeetPush() {
  if (isSubmissionPage() && hasAcceptedSolution()) {
    injectButtons()
    extractProblemInfo()
    registerKeyboardShortcut()
  }
}

function registerKeyboardShortcut() {
  document.addEventListener('keydown', (event) => {
    if (
      (KEYBOARD_SHORTCUT.modifier === 'meta' && event.metaKey) ||
      (KEYBOARD_SHORTCUT.modifier === 'alt' && event.altKey) ||
      (KEYBOARD_SHORTCUT.modifier === 'shift' && event.shiftKey) ||
      (KEYBOARD_SHORTCUT.modifier === 'ctrl' && event.ctrlKey)
    ) {
      if (event.key.toLowerCase() === KEYBOARD_SHORTCUT.key.toLowerCase()) {
        event.preventDefault()
        handlePushClick()
      }
    }
  })
}

function injectButtons() {
  const parentDiv = document.querySelector(SELECTORS.parentDiv)
  const parentDivCodeEditor = document.querySelector(SELECTORS.parentDivCodeEditor)

  if (parentDiv) {
    injectButtonsToParent(
      parentDiv as HTMLElement,
      'leetpush-div-edit',
      'leetpush-btn-edit',
      'Edit',
      'leetpush-div',
      'leetpush-btn',
      `Push (${SHORTCUT_DISPLAY})`,
      false,
    )
  }

  if (parentDivCodeEditor) {
    injectButtonsToParent(
      parentDivCodeEditor as HTMLElement,
      'leetpush-div-edit-CodeEditor',
      'leetpush-btn-edit-CodeEditor',
      'Edit',
      'leetpush-div-CodeEditor',
      'leetpush-btn-CodeEditor',
      `Push (${SHORTCUT_DISPLAY})`,
      true,
    )
  }
}

function injectButtonsToParent(
  parent: HTMLElement,
  editContainerId: string,
  editButtonId: string,
  editText: string,
  pushContainerId: string,
  pushButtonId: string,
  pushText: string,
  isCodeEditor: boolean,
) {
  if (document.getElementById(editContainerId) || document.getElementById(pushContainerId)) return

  const editButton = createButton(editContainerId, editButtonId, editText, () => {
    browser.runtime.openOptionsPage()
  })

  const pushButton = createButton(pushContainerId, pushButtonId, pushText, handlePushClick)

  if (isCodeEditor) {
    const divider1 = document.createElement('div')
    divider1.style.cssText = 'background-color:#0f0f0f;width:1px;height:100%;flex-shrink:0'
    const divider2 = document.createElement('div')
    divider2.style.cssText = 'background-color:#0f0f0f;width:1px;height:100%;flex-shrink:0'
    parent.appendChild(divider1)
    parent.appendChild(editButton)
    parent.appendChild(divider2)
    parent.appendChild(pushButton)
  } else {
    parent.appendChild(editButton)
    parent.appendChild(pushButton)
  }
}

function createButton(
  containerId: string,
  buttonId: string,
  text: string,
  clickHandler: () => void,
): HTMLElement {
  const container = document.createElement('div')
  container.id = containerId
  const button = document.createElement('button')
  button.id = buttonId
  button.textContent = text
  button.addEventListener('click', clickHandler)
  container.appendChild(button)
  return container
}

async function extractProblemInfo(): Promise<ProblemInfo> {
  try {
    const probNameElement = document.querySelector(SELECTORS.problemName)
    if (!probNameElement) throw new Error('Problem title not found. LeetCode layout may have changed.')

    const probNameText = probNameElement.textContent?.trim() || ''
    if (!probNameText) throw new Error('Problem title is empty.')

    const probNum = probNameText.split('.')[0]?.trim() || ''
    const probName =
      probNameText
        .replace(/^\d+\./, '')
        .trim()
        .replaceAll(' ', '-') || ''

    if (!probNum || !probName) throw new Error('Problem title format is invalid.')

    const langElement = document.querySelector(SELECTORS.solutionLanguage)
    if (!langElement) throw new Error('Solution language not found.')

    const solutionLangText = langElement.textContent?.trim() || ''
    if (!solutionLangText) throw new Error('Solution language is empty.')
    if (!FILE_EXTENSIONS[solutionLangText]) {
      throw new Error(`Unsupported solution language: ${solutionLangText}`)
    }

    const fileExt = FILE_EXTENSIONS[solutionLangText]
    const fileName = `${probName}${fileExt}`

    const solutionsId = localStorage.key(0)?.split('_')[1] || ''
    let solution = localStorage.getItem(
      `${probNum}_${solutionsId}_${LOCAL_STORAGE_KEYS[solutionLangText]}`,
    )

    if (!solution) {
      const codeElement = document.querySelector(SELECTORS.codeBlock)
      if (!codeElement) throw new Error('Solution code block not found.')
      solution = codeElement.textContent || ''
    } else {
      solution = solution.replace(/\\n/g, '\n').replace(/ {2}/g, '  ').replace(/"/g, '')
    }

    if (!solution.trim()) throw new Error('Solution content is empty.')

    sessionStorage.setItem('fileName', fileName)
    sessionStorage.setItem('solution', solution)

    let commitMsg = ''
    if (DATABASE_LANGUAGES.includes(solutionLangText)) {
      const metrics = document.querySelectorAll(SELECTORS.performanceMetrics)
      const queryRuntimeText = metrics[1]?.textContent || 'N/A'
      commitMsg = `[${probNum}] [Time Beats: ${queryRuntimeText}] - SukiLeet`
    } else {
      const metrics = document.querySelectorAll(SELECTORS.performanceMetrics)
      const runtimeText = metrics[1]?.textContent || 'N/A'
      const memoryText = metrics[3]?.textContent || 'N/A'
      commitMsg = `[${probNum}] [Time Beats: ${runtimeText}] [Memory Beats: ${memoryText}] - SukiLeet`
    }

    sessionStorage.setItem('commitMsg', commitMsg)

    return { probNum, probName, fileName, solution, commitMsg, language: solutionLangText }
  } catch (error) {
    console.error('Error extracting problem info:', error)
    throw error instanceof Error ? error : new Error('Failed to extract problem information.')
  }
}

function updateButtonLabels() {
  const buttons = [
    document.querySelector<HTMLButtonElement>('#leetpush-btn'),
    document.querySelector<HTMLButtonElement>('#leetpush-btn-CodeEditor'),
  ]
  buttons.forEach((btn) => {
    if (btn) btn.textContent = `Push (${SHORTCUT_DISPLAY})`
  })
}

async function getRepoConfig(): Promise<RepoConfig> {
  const [token, repo, branch, separate, custom] = await Promise.all([
    repoToken.getValue(),
    repoUrlStorage.getValue(),
    repoBranch.getValue(),
    separateFolderStorage.getValue(),
    customDirStorage.getValue(),
  ])
  return { token, repo, branch, separateFolder: separate, customDir: custom }
}

function isConfigComplete(config: RepoConfig): boolean {
  return !!(config.token && config.repo && config.branch)
}

function getPushButton(): HTMLButtonElement | null {
  return (
    document.querySelector<HTMLButtonElement>('#leetpush-btn') ||
    document.querySelector<HTMLButtonElement>('#leetpush-btn-CodeEditor')
  )
}

async function showPushButtonError(pushBtn: HTMLButtonElement | null, message: string) {
  alert(`SukiLeet Error: ${message}`)

  if (!pushBtn) return

  pushBtn.classList.remove('loading')
  pushBtn.classList.add('error')
  pushBtn.textContent = 'Error'
  pushBtn.disabled = true
  await sleep(2000)
  pushBtn.disabled = false
  pushBtn.classList.remove('error')
  pushBtn.textContent = `Push (${SHORTCUT_DISPLAY})`
}

async function handlePushClick() {
  const pushBtn = getPushButton()
  if (!pushBtn) {
    alert('SukiLeet Error: Push button not found. Please refresh the page and try again.')
    return
  }

  const config = await getRepoConfig()

  if (!isConfigComplete(config)) {
    await showPushButtonError(pushBtn, 'Not set yet. Please configure token, repo URL, and branch first.')
    return
  }

  let problemInfo: ProblemInfo
  try {
    problemInfo = await extractProblemInfo()
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to extract problem information.'
    await showPushButtonError(pushBtn, msg)
    return
  }

  const { fileName, solution, commitMsg } = problemInfo

  if (!fileName || !solution || !commitMsg) {
    alert('SukiLeet Error: Missing required data. Please try again.')
    return
  }

  const parsed = parseRepoUrl(config.repo)
  if (!parsed) {
    alert('SukiLeet Error: Invalid repository URL. Please check your settings.')
    browser.runtime.openOptionsPage()
    return
  }

  pushBtn.disabled = true
  pushBtn.textContent = 'Loading...'
  pushBtn.classList.add('loading')

  try {
    await pushSolution(config, parsed, fileName, solution, commitMsg, problemInfo)

    pushBtn.classList.remove('loading')
    pushBtn.classList.add('success')
    pushBtn.textContent = 'Done'
    await sleep(2000)
    pushBtn.disabled = false
    pushBtn.classList.remove('success')
    pushBtn.textContent = `Push (${SHORTCUT_DISPLAY})`

    const current = await solutionsPushedStorage.getValue()
    await solutionsPushedStorage.setValue(current + 1)

    try {
      const [, dailyProblemNum] = await getDailyChallenge()
      if (dailyProblemNum === problemInfo.probNum) {
        const currentDC = await dailyChallengesCount.getValue()
        await dailyChallengesCount.setValue(currentDC + 1)
      }
    } catch {
      // non-critical
    }
  } catch (error) {
    const msg = error instanceof Error ? getFriendlyWriteError(error.message) : 'Unknown error'
    await showPushButtonError(pushBtn, msg)
  }
}

async function pushSolution(
  config: RepoConfig,
  parsed: ReturnType<typeof parseRepoUrl> & object,
  fileName: string,
  solution: string,
  commitMsg: string,
  problemInfo: ProblemInfo,
) {
  if (!fileName?.trim()) throw new Error('Invalid file name. Please try again.')
  if (!solution?.trim()) throw new Error('No solution content found.')

  let filePath = addTimestampToFileName(fileName)

  if (config.customDir) {
    filePath = `${config.customDir}/${fileName}`
  } else if (config.separateFolder === 'yes') {
    try {
      const [date, dailyProblemNum] = await getDailyChallenge()
      if (dailyProblemNum === problemInfo.probNum) {
        const splitDate = date.split('-')
        const dailyFolder = `DCP-${splitDate[1]}-${splitDate[0].slice(2)}`
        filePath = `${dailyFolder}/${addTimestampToFileName(fileName)}`
      }
    } catch {
      // continue without separate folder
    }
  }

  if (config.customDir) {
    filePath = `${config.customDir}/${addTimestampToFileName(fileName)}`
  }

  if (!filePath?.trim()) throw new Error('Failed to generate a valid file path.')

  switch (parsed.platform) {
    case 'github':
      await github.pushFileToRepo(parsed.owner, parsed.repoName, filePath, config.branch, solution, commitMsg, config.token)
      break
    case 'gitlab':
      await gitlab.pushFileToRepo(parsed.host, parsed.projectPath, filePath, config.branch, solution, commitMsg, config.token)
      break
    case 'codeberg':
      await codeberg.pushFileToRepo(parsed.owner, parsed.repoName, filePath, config.branch, solution, commitMsg, config.token)
      break
  }
}

async function getDailyChallenge(): Promise<[string, string]> {
  const response = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `{
        activeDailyCodingChallengeQuestion {
          date
          question { frontendQuestionId: questionFrontendId }
        }
      }`,
    }),
  })
  const data = await response.json()
  const q = data.data.activeDailyCodingChallengeQuestion
  return [q.date, q.question.frontendQuestionId]
}

export default defineContentScript({
  matches: ['*://*.leetcode.com/*'],
  async main(ctx) {
    const saved = await shortcutStorage.getValue()
    if (saved) {
      KEYBOARD_SHORTCUT = saved
      SHORTCUT_DISPLAY = getShortcutDisplayText(KEYBOARD_SHORTCUT)
    }

    const unwatch = shortcutStorage.watch((newVal: { key: string; modifier: string } | null) => {
      if (newVal) {
        KEYBOARD_SHORTCUT = newVal
        SHORTCUT_DISPLAY = getShortcutDisplayText(KEYBOARD_SHORTCUT)
        updateButtonLabels()
      }
    })
    ctx.onInvalidated(unwatch)

    initLeetPush()

    const observer = new MutationObserver(() => {
      if (isSubmissionPage() && hasAcceptedSolution()) {
        const hasButtons =
          document.getElementById('leetpush-btn') ||
          document.getElementById('leetpush-btn-CodeEditor')
        if (!hasButtons) initLeetPush()
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })
  },
})
