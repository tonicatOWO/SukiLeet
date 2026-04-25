import { encodeBase64Utf8, responseErrorMessage, retryWithBackoff } from './repo-write'

const BASE = 'https://codeberg.org/api/v1'

export async function pushFileToRepo(
  owner: string,
  repoName: string,
  filePath: string,
  branch: string,
  content: string,
  commitMsg: string,
  token: string,
): Promise<void> {
  const apiUrl = `${BASE}/repos/${owner}/${repoName}/contents/${filePath}`

  const repoCheck = await fetch(`${BASE}/repos/${owner}/${repoName}`, {
    headers: { Authorization: `token ${token}` },
  })
  if (!repoCheck.ok) {
    if (repoCheck.status === 404) throw new Error(`Repository not found: ${owner}/${repoName}`)
    if (repoCheck.status === 401) throw new Error('Authentication failed. Token may be invalid.')
    if (repoCheck.status === 403) throw new Error('Access forbidden. Check token permissions.')
    const err = await repoCheck.json()
    throw new Error(`Repository access error: ${err.message || 'Unknown error'}`)
  }

  const encodedContent = encodeBase64Utf8(content)

  const fileCheckRes = await fetch(`${apiUrl}?ref=${branch}`, {
    headers: { Authorization: `token ${token}` },
  })

  let method: string
  let body: Record<string, string>

  if (fileCheckRes.ok) {
    const existing = await fileCheckRes.json()
    method = 'PUT'
    body = { message: commitMsg, content: encodedContent, branch, sha: existing.sha }
  } else if (fileCheckRes.status === 404) {
    method = 'POST'
    body = { message: commitMsg, content: encodedContent, branch }
  } else {
    const err = await fileCheckRes.json()
    throw new Error(`Error checking file: ${err.message || 'Unknown error'}`)
  }

  await retryWithBackoff(4, 500, async () => {
    let response = await fetch(apiUrl, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `token ${token}` },
      body: JSON.stringify(body),
    })

    while (response.status === 422 && method === 'PUT') {
      const latest = await fetch(`${apiUrl}?ref=${branch}`, {
        headers: { Authorization: `token ${token}` },
      })
      if (!latest.ok) break
      const current = await latest.json()
      if (!current?.sha) break

      body = { ...body, sha: current.sha }
      response = await fetch(apiUrl, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `token ${token}` },
        body: JSON.stringify(body),
      })
      if (response.ok) return
    }

    if (!response.ok) throw new Error(await responseErrorMessage(response, 'Codeberg'))
  }, (error) => error instanceof Error && error.message.includes('422'))
}
