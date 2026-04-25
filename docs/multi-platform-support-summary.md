# SukiLeet 多平台支援實作總結

**日期**: 2026-04-25
**任務**: 為 SukiLeet 擴充功能新增 Codeberg 和 GitLab 支援

## 需求

將原本僅支援 GitHub 的儲存功能擴充為支援三個平台：
- GitHub
- GitLab
- Codeberg (Gitea)

## 研究階段

### API 差異分析

| 平台 | 端點 | Auth | SHA |
|------|------|------|-----|
| GitHub | PUT /repos/{o}/{r}/contents/{p} | Bearer token | optional |
| GitLab | POST/PUT /api/v4/projects/{path}/repository/files/{path} | PRIVATE-TOKEN | 不需要 |
| Codeberg | POST/PUT /api/v1/repos/{o}/{r}/contents/{path} | token | 需要 (更新時) |

### URL 解析邏輯

- `github.com` → platform: `github`
- `codeberg.org` → platform: `codeberg`
- `*.gitlab*` → platform: `gitlab` (使用完整 project path)

## 實作檔案

### 新增檔案

| 檔案 | 行數 | 說明 |
|------|------|------|
| `src/lib/github.ts` | 79 | GitHub API 封裝 |
| `src/lib/gitlab.ts` | 51 | GitLab API 封裝 |
| `src/lib/codeberg.ts` | 60 | Codeberg API 封裝 |

### 修改檔案

| 檔案 | 變更 |
|------|------|
| `src/lib/storage.ts` | 通用化 storage 項目 (repoToken, repoUrl, repoBranch) |
| `src/lib/utils.ts` | 新增 `parseRepoUrl()` 和 `Platform` 類型 |
| `src/entrypoints/content.ts` | 重構以支援多平台 switch |

## 使用方式

1. 使用者在設定頁面輸入 repo URL
2. 系統自動偵測平台 (github/gitlab/codeberg)
3. 根據平台呼叫對應的 API 函式
4. 無需手動選擇平台

## API 函式簽章

```typescript
// github.ts
pushFileToRepo(owner, repoName, filePath, branch, content, commitMsg, token): Promise<void>

// gitlab.ts  
pushFileToRepo(host, projectPath, filePath, branch, content, commitMsg, token): Promise<void>

// codeberg.ts
pushFileToRepo(owner, repoName, filePath, branch, content, commitMsg, token): Promise<void>
```

## 目前程式流程（實際代碼對照）

```text
Push 按鈕 / 快捷鍵
  -> handlePushClick()
    -> getRepoConfig() 讀 storage
    -> extractProblemInfo() 取題目資訊
    -> parseRepoUrl() 判斷平台
    -> pushSolution() 產生 filePath + 平台 dispatch
      -> github.pushFileToRepo(...)
      -> gitlab.pushFileToRepo(...)
      -> codeberg.pushFileToRepo(...)
```

### 各平台目前行為差異（以現有實作為準）

- GitHub (`src/lib/github.ts`)
  - 固定 `PUT /repos/{o}/{r}/contents/{p}`
  - 先查檔案是否存在，存在則帶 `sha`
  - `409` 衝突有 retry/backoff

- GitLab (`src/lib/gitlab.ts`)
  - `GET` 檔案判斷存在
  - 存在用 `PUT`，不存在用 `POST`
  - 使用 `PRIVATE-TOKEN` header
  - payload 使用 `commit_message` + `encoding: base64`
  - update 時會帶 `last_commit_id` 作為 optimistic guard

- Codeberg (`src/lib/codeberg.ts`)
  - `GET` 檔案判斷存在
  - 存在用 `PUT`（必帶 `sha`），不存在用 `POST`
  - 使用 `Authorization: token ...`
  - `422` 衝突會重新抓最新 `sha` 再 retry

## 已發現風險 / 缺口（待深度研究後定稿）

- `wxt.config.ts` host_permissions 目前只看到 GitHub API，GitLab/Codeberg 可能權限不足。
- `options/App.svelte` 驗證邏輯偏 GitHub（URL / token pattern），可能擋住 GitLab/Codeberg 設定。
- GitLab / Codeberg 目前無 retry/backoff；GitHub 有 409 retry。
- 尚未加入網路 timeout 與更細緻 rate-limit 錯誤分類。

> 註：上面缺口來自程式碼路徑分析。最終 API 細節與建議策略，待 librarian 的官方文件深度研究結果補完。

## GitLab Repository Files API 深度研究（已補完）

### 寫入端點與語意

- Create: `POST /projects/:id/repository/files/:file_path`
- Update: `PUT /projects/:id/repository/files/:file_path`
- `:id` 可用 numeric project id，或 URL-encoded `namespace/project`。
- `:file_path` 必須 URL-encode（如 `src/main.ts` -> `src%2Fmain.ts`）。

### 必填欄位（create / update）

- `branch`
- `commit_message`
- `content`

常用選填：
- `encoding`: `text` (default) / `base64`
- `start_branch`
- `last_commit_id`（更新時建議帶，作 optimistic concurrency guard）

### Auth

- 可用 `PRIVATE-TOKEN: <token>`（現有實作即此）
- 也可用 `Authorization: Bearer <token>`（視 token 類型）

### 錯誤與衝突處理建議

- 404: project 或 file path 不存在（依呼叫點判斷）
- 401/403: token 無效或權限不足
- 409: update 衝突（檔案在你讀取後已被修改）

建議流程：
1. update 時帶 `last_commit_id`
2. 若 409，重新 GET 最新 file metadata
3. 更新 `last_commit_id` 後 retry（建議指數退避）

### 大檔與限流

- 大 request 有限制與限流門檻；擴充套件應避免超大 payload。
- 若內容可能很大，應先檢查大小並做明確錯誤提示。

### 與現有 `src/lib/gitlab.ts` 對照

- ✅ 已做：project/file path encode、POST/PUT 判斷、`PRIVATE-TOKEN`、`encoding: base64`
- ⚠️ 待補：`last_commit_id` guard、409 retry/backoff、更細緻錯誤分類（404 file vs 404 project）

## Codeberg / Gitea Contents API 深度研究（已補完）

### 寫入端點與語意

- Create: `POST /repos/{owner}/{repo}/contents/{filepath}`
- Update: `PUT /repos/{owner}/{repo}/contents/{filepath}`
- Gitea 系列實作支持「PUT + 無 SHA 時 create / 有 SHA 時 update」語意，但建議仍維持明確 create/update 流程。

### 請求欄位

Create 常用欄位：
- `content`（base64）
- `message`
- `branch`（選填，未給時通常用預設分支）
- `new_branch`（需要時）

Update 常用欄位：
- `content`（base64）
- `message`
- `sha`（關鍵，更新既有檔案通常必帶）
- `branch` / `new_branch`
- `from_path`（rename / move 場景）

### 編碼與 Auth

- `content` 需 base64（現有實作已符合）
- Header 建議：`Authorization: token <token>`（現有實作已符合）

### 常見狀態碼與錯誤判讀

- 200/201: 成功（update/create）
- 401: token 無效
- 403: 無 push 權限 / 分支保護
- 404: repo 或 path 不存在
- 422: `sha` 不匹配、path 無效、branch 問題、參數不完整

### 競態 / 衝突策略

建議流程：
1. `GET /contents/{filepath}?ref=branch` 取最新 `sha`
2. `PUT` 時帶 `sha`
3. 若回 `422` 且屬於 `sha` mismatch，重新 GET 最新 `sha` 後 retry（建議 backoff）

### 與現有 `src/lib/codeberg.ts` 對照

- ✅ 已做：repo check、file existence check、create 用 POST、update 用 PUT + `sha`、`Authorization: token`
- ⚠️ 待補：`422` 細分（特別是 sha mismatch）、retry/backoff、`new_branch/from_path` 支援策略

## 跨平台綜合建議（GitHub / GitLab / Codeberg）

### 優先前三項（先做）

1. **補齊設定與權限入口**
   - `wxt.config.ts` 加入 GitLab/Codeberg host permissions
   - `options/App.svelte` 放寬 GitHub-only URL/token 驗證，改為多平台驗證

2. **補齊衝突一致性策略**
   - GitLab：導入 `last_commit_id` + 409 retry/backoff
   - Codeberg：導入 `sha mismatch` 偵測 + 422 retry/backoff

3. **補齊錯誤分類與可觀測性**
   - 區分 repo-not-found / file-not-found / auth / permission / rate-limit
   - UI 錯誤訊息從單一 API error 改為可行動提示（例如「檢查 token scope / branch 保護」）

### 建議後續項

- 引入 `AbortController` timeout，避免 fetch 卡死
- 統一重試策略（jittered exponential backoff）
- 規劃可選 branch-based write 模式（避免直接寫 main）

---

## AI 快速參考 API 規格（建議作為後續改寫基準）

> 目的：讓 AI/代理在修改 repo-write 邏輯時，用同一份 contract，不再混淆平台細節。

### 1) 輸入正規化（Normalized Input Contract）

```ts
type Platform = 'github' | 'gitlab' | 'codeberg'

interface NormalizedRepoTarget {
  platform: Platform
  host: string            // github.com / codeberg.org / gitlab host
  owner: string           // gitlab 時可用 namespace[0]
  repoName: string
  projectPath: string     // gitlab 用完整 namespace/path
}

interface WriteFileInput {
  target: NormalizedRepoTarget
  token: string
  branch: string
  filePath: string
  contentUtf8: string
  commitMessage: string

  // advanced opts (optional)
  expectedLastCommitId?: string // gitlab optimistic guard
  expectedSha?: string          // github/codeberg optimistic guard
  newBranch?: string
  fromPath?: string             // codeberg/gitea rename/move
}
```

### 2) 平台決策樹（Create / Update）

```text
先檢查 repo 存在 + 權限
  -> 檢查 file 是否存在 (GET by ref=branch)
     -> 存在: update flow
     -> 不存在(404): create flow
     -> 其他錯誤: 直接中止並映射錯誤
```

### 3) GitHub Contract

- Base: `https://api.github.com/repos/{owner}/{repo}`
- Write endpoint: `PUT /contents/{filePath}`
- Auth: `Authorization: Bearer <token>`
- Body:

```json
{
  "message": "...",
  "content": "<base64>",
  "branch": "main",
  "sha": "<optional for update>"
}
```

- 衝突策略：`409` 時重新抓最新 `sha` 後 retry（建議 backoff + jitter）

### 4) GitLab Contract

- Base: `https://{host}/api/v4`
- Project: `:id` 建議用 URL-encoded `namespace/project`
- File path: 必須 URL-encoded
- Create: `POST /projects/:id/repository/files/:file_path`
- Update: `PUT /projects/:id/repository/files/:file_path`
- Auth: `PRIVATE-TOKEN: <token>`（或 `Authorization: Bearer <token>`）
- Body:

```json
{
  "branch": "main",
  "commit_message": "...",
  "content": "<base64-or-text>",
  "encoding": "base64",
  "last_commit_id": "<recommended on update>",
  "start_branch": "<optional>"
}
```

- 衝突策略：`409` 時刷新 metadata / `last_commit_id` 再重試

### 5) Codeberg / Gitea Contract

- Base: `https://codeberg.org/api/v1/repos/{owner}/{repo}`
- Create: `POST /contents/{filePath}`
- Update: `PUT /contents/{filePath}`
- Auth: `Authorization: token <token>`
- Body (create):

```json
{
  "message": "...",
  "content": "<base64>",
  "branch": "main",
  "new_branch": "<optional>"
}
```

- Body (update):

```json
{
  "message": "...",
  "content": "<base64>",
  "branch": "main",
  "sha": "<required in safe update flow>",
  "new_branch": "<optional>",
  "from_path": "<optional>"
}
```

- 衝突策略：`422` + sha mismatch 視為競態，重新 GET 最新 `sha` 後 retry

### 6) 統一錯誤模型（推薦）

```ts
type WriteErrorKind =
  | 'AUTH_INVALID'         // 401
  | 'PERMISSION_DENIED'    // 403
  | 'REPO_NOT_FOUND'       // repo-level 404
  | 'FILE_NOT_FOUND'       // file-level 404 in update flow
  | 'CONFLICT'             // 409 / sha mismatch
  | 'VALIDATION_FAILED'    // 422
  | 'RATE_LIMITED'         // 429 / provider-specific signal
  | 'NETWORK_TIMEOUT'
  | 'UNKNOWN'
```

### 6.1) 使用者可見訊息映射

- `AUTH_INVALID` -> `Token invalid. Check repo token.`
- `PERMISSION_DENIED` -> `No write permission. Check token scope or protected branch.`
- `REPO_NOT_FOUND` -> `Repo not found. Check repo URL.`
- `CONFLICT` -> `Write conflict. Retry after refresh.`
- `VALIDATION_FAILED` -> `API validation failed. Check branch, path, or sha.`
- `RATE_LIMITED` -> `Rate limited. Wait and retry.`

### 7) 重試策略（推薦）

```text
maxRetries = 3
delay = base * 2^attempt + random_jitter

retry only for:
- GitHub: 409
- GitLab: 409 / transient 5xx
- Codeberg: 422(sha mismatch) / transient 5xx

do not retry for:
- 401 / 403 / validation fatal
```

### 8) 目前專案狀態（供 AI 判斷修改優先序）

- 現有 `storage key` 仍是 GitHub 命名（`local:githubToken`, `local:githubRepo`, `local:githubBranch`），但已作為通用 repo 設定使用。
- `wxt.config.ts` 已放寬 host permissions，支援 GitHub / GitLab / Codeberg API。
- 目前 GitHub 有 conflict retry；GitLab / Codeberg 已補初步 retry/backoff，後續仍可再細化錯誤分類。

### 9) 最小驗證清單（Doc-Driven QA）

1. GitHub update existing file -> 成功，且 409 可重試
2. GitLab create + update -> 成功，路徑 encode 正確
3. Codeberg update without sha -> 失敗；with fresh sha -> 成功
4. 401/403/404/409/422 各自映射到正確 `WriteErrorKind`
5. timeout 可回報 `NETWORK_TIMEOUT`
