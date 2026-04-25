import { encodeBase64Utf8, responseErrorMessage, retryWithBackoff } from './repo-write'

const BASE = 'https://api.github.com/repos'

export async function pushFileToRepo(
  owner: string,
  repoName: string,
  filePath: string,
  branch: string,
  content: string,
  commitMsg: string,
  token: string,
): Promise<void> {
  const apiUrl = `${BASE}/${owner}/${repoName}/contents/${filePath}`

  const repoCheck = await fetch(`${BASE}/${owner}/${repoName}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!repoCheck.ok) {
    if (repoCheck.status === 404) throw new Error(`Repository not found: ${owner}/${repoName}`)
    if (repoCheck.status === 401) throw new Error('Authentication failed. Token may be invalid.')
    if (repoCheck.status === 403) throw new Error('Access forbidden. Check token permissions.')
    const err = await repoCheck.json()
    throw new Error(`Repository access error: ${err.message || 'Unknown error'}`)
  }

  const encodedContent = encodeBase64Utf8(content)
  const requestBody: Record<string, string> = { message: commitMsg, content: encodedContent, branch }

  const fileExistsRes = await fetch(`${apiUrl}?ref=${branch}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (fileExistsRes.ok) {
    const existing = await fileExistsRes.json()
    if (existing?.sha) requestBody.sha = existing.sha
  } else if (fileExistsRes.status !== 404) {
    if (fileExistsRes.status === 403) throw new Error('Permission denied. Token needs "contents: write" permission.')
    if (fileExistsRes.status === 401) throw new Error('Authentication failed.')
    const err = await fileExistsRes.json()
    throw new Error(`Error checking file: ${err.message || 'Unknown error'}`)
  }

  await retryWithBackoff(4, 500, async () => {
    let response = await fetch(apiUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(requestBody),
    })

    while (response.status === 409) {
      const latestRes = await fetch(`${apiUrl}?ref=${branch}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!latestRes.ok) break
      const latest = await latestRes.json()
      if (!latest?.sha) break

      requestBody.sha = latest.sha
      response = await fetch(apiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(requestBody),
      })
      if (response.ok) return
    }

    if (!response.ok) throw new Error(await responseErrorMessage(response, 'GitHub'))
  }, (error) => error instanceof Error && error.message.includes('409'))
}
