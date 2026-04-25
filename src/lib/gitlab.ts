import { encodeBase64Utf8, responseErrorMessage } from './repo-write'

export async function pushFileToRepo(
  host: string,
  projectPath: string,
  filePath: string,
  branch: string,
  content: string,
  commitMsg: string,
  token: string,
): Promise<void> {
  const BASE = `https://${host}/api/v4`
  const encodedProject = encodeURIComponent(projectPath)
  const encodedFilePath = encodeURIComponent(filePath)

  const repoCheck = await fetch(`${BASE}/projects/${encodedProject}`, {
    headers: { 'PRIVATE-TOKEN': token },
  })
  if (!repoCheck.ok) {
    if (repoCheck.status === 404) throw new Error(`Repository not found: ${projectPath}`)
    if (repoCheck.status === 401) throw new Error('Authentication failed. Token may be invalid.')
    if (repoCheck.status === 403) throw new Error('Access forbidden. Check token permissions.')
    const err = await repoCheck.json()
    throw new Error(`Repository access error: ${err.message || 'Unknown error'}`)
  }

  const encodedContent = encodeBase64Utf8(content)
  const body: Record<string, string> = { branch, commit_message: commitMsg, content: encodedContent, encoding: 'base64' }

  const fileCheckRes = await fetch(
    `${BASE}/projects/${encodedProject}/repository/files/${encodedFilePath}?ref=${branch}`,
    { headers: { 'PRIVATE-TOKEN': token } },
  )

  const method = fileCheckRes.ok ? 'PUT' : 'POST'
  if (method === 'PUT') {
    const existing = await fileCheckRes.json()
    if (existing?.last_commit_id) body.last_commit_id = existing.last_commit_id
  }
  const response = await fetch(
    `${BASE}/projects/${encodedProject}/repository/files/${encodedFilePath}`,
    {
      method,
      headers: { 'Content-Type': 'application/json', 'PRIVATE-TOKEN': token },
      body: JSON.stringify(body),
    },
  )

  if (!response.ok) {
    throw new Error(await responseErrorMessage(response, 'GitLab'))
  }
}
