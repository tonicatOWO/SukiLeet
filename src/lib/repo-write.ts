export type WriteErrorKind =
  | 'AUTH_INVALID'
  | 'PERMISSION_DENIED'
  | 'REPO_NOT_FOUND'
  | 'FILE_NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_FAILED'
  | 'RATE_LIMITED'
  | 'NETWORK_TIMEOUT'
  | 'UNKNOWN'

export function encodeBase64Utf8(content: string): string {
  return btoa(unescape(encodeURIComponent(content)))
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function withJitterDelay(baseMs: number, attempt: number): number {
  const jitter = Math.floor(Math.random() * 200)
  return baseMs * 2 ** attempt + jitter
}

export async function retryWithBackoff<T>(
  attempts: number,
  baseMs: number,
  fn: () => Promise<T>,
  shouldRetry: (error: unknown, attempt: number) => boolean,
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt === attempts - 1 || !shouldRetry(error, attempt)) break
      await sleep(withJitterDelay(baseMs, attempt))
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Unknown write error')
}

export async function responseErrorMessage(response: Response, platform: string): Promise<string> {
  let msg = `${platform} API Error: ${response.status}`
  try {
    const err = await response.json()
    msg += ` - ${err.message || 'Unknown error'}`
  } catch {
    // keep original message
  }
  return msg
}

export function kindFromStatus(status: number): WriteErrorKind {
  if (status === 401) return 'AUTH_INVALID'
  if (status === 403) return 'PERMISSION_DENIED'
  if (status === 404) return 'REPO_NOT_FOUND'
  if (status === 409) return 'CONFLICT'
  if (status === 422) return 'VALIDATION_FAILED'
  if (status === 429) return 'RATE_LIMITED'
  return 'UNKNOWN'
}

export function getFriendlyWriteError(message: string): string {
  const match = message.match(/API Error:\s*(\d{3})/)
  const status = match ? Number(match[1]) : undefined

  switch (status ? kindFromStatus(status) : 'UNKNOWN') {
    case 'AUTH_INVALID':
      return 'Token invalid. Check repo token.'
    case 'PERMISSION_DENIED':
      return 'No write permission. Check token scope or protected branch.'
    case 'REPO_NOT_FOUND':
      return 'Repo not found. Check repo URL.'
    case 'CONFLICT':
      return 'Write conflict. Retry after refresh.'
    case 'VALIDATION_FAILED':
      return 'API validation failed. Check branch, path, or sha.'
    case 'RATE_LIMITED':
      return 'Rate limited. Wait and retry.'
    default:
      return message
  }
}
