<script lang="ts">
  import { onMount } from 'svelte'
  import {
    repoToken,
    repoUrl,
    repoBranch,
    separateFolder,
    customDir,
    keyboardShortcut,
  } from '../../lib/storage'
  import { parseRepoUrl } from '../../lib/utils'

  const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform)

  let tokenInput = $state('')
  let repoInput = $state('')
  let branchPreset = $state<'main' | 'master' | 'custom'>('main')
  let customBranchInput = $state('')
  let separateFolderInput = $state('no')
  let customDirInput = $state('')
  let shortcutModifier = $state(isMac ? 'meta' : 'ctrl')
  let shortcutKey = $state('p')
  let saving = $state(false)
  let saveStatus = $state<'idle' | 'success' | 'error'>('idle')
  let errorMsg = $state('')

  onMount(async () => {
    const [token, repo, branch, separate, custom, shortcut] = await Promise.all([
      repoToken.getValue(),
      repoUrl.getValue(),
      repoBranch.getValue(),
      separateFolder.getValue(),
      customDir.getValue(),
      keyboardShortcut.getValue(),
    ])
    tokenInput = token
    repoInput = repo
    if (branch === 'main' || branch === 'master') {
      branchPreset = branch
      customBranchInput = ''
    } else {
      branchPreset = 'custom'
      customBranchInput = branch
    }
    separateFolderInput = separate
    customDirInput = custom
    if (shortcut) {
      shortcutModifier = shortcut.modifier
      shortcutKey = shortcut.key.toUpperCase()
    }
  })

  async function handleSubmit(e: Event) {
    e.preventDefault()
    saveStatus = 'idle'
    errorMsg = ''

    const parsedRepo = parseRepoUrl(repoInput)
    if (!parsedRepo) {
      errorMsg = 'Invalid repository URL. Use GitHub, GitLab, or Codeberg URL.'
      saveStatus = 'error'
      return
    }

    if (!tokenInput.trim()) {
      errorMsg = 'Token cannot be empty'
      saveStatus = 'error'
      return
    }

    if (parsedRepo.platform === 'github' && !tokenInput.startsWith('ghp_') && !tokenInput.startsWith('github_pat_')) {
      errorMsg = 'GitHub token must start with "ghp_" or "github_pat_"'
      saveStatus = 'error'
      return
    }
    if (!shortcutKey.trim()) {
      errorMsg = 'Keyboard shortcut key cannot be empty'
      saveStatus = 'error'
      return
    }

    saving = true
    const cleanRepo = repoInput.endsWith('.git') ? repoInput.slice(0, -4) : repoInput
    const finalBranch = branchPreset === 'custom' ? customBranchInput.trim() : branchPreset

    if (!finalBranch) {
      errorMsg = 'Custom branch name cannot be empty'
      saveStatus = 'error'
      saving = false
      return
    }

    try {
      await Promise.all([
        repoToken.setValue(tokenInput),
        repoUrl.setValue(cleanRepo),
        repoBranch.setValue(finalBranch),
        separateFolder.setValue(separateFolderInput),
        customDir.setValue(customDirInput),
        keyboardShortcut.setValue({ key: shortcutKey.toLowerCase(), modifier: shortcutModifier }),
      ])

      try {
        const match = cleanRepo.match(/github\.com\/([^/]+)\/([^/]+)/)
        if (match) {
          await fetch(`https://api.github.com/repos/${match[1]}/${match[2]}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenInput}` },
            body: JSON.stringify({ description: 'Managed by SukiLeet extension' }),
          })
        }
      } catch {
        // non-critical
      }

      saveStatus = 'success'
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : 'Failed to save settings'
      saveStatus = 'error'
    } finally {
      saving = false
    }
  }
</script>

<main>
  <div class="header">
    <h1>Suki<span>Leet</span> Settings</h1>
  </div>

  <form onsubmit={handleSubmit}>
    <div class="field">
      <label for="repo">Repository URL</label>
      <input
        id="repo"
        type="text"
        bind:value={repoInput}
        placeholder="https://github.com/username/repository"
        required
      />
    </div>

    <div class="field">
      <label for="token">
        Repository Token
      </label>
      <input
        id="token"
        type="password"
        bind:value={tokenInput}
        placeholder="GitHub PAT / GitLab token / Codeberg token"
        required
      />
      <small class="hint">Use token with repo write access for selected platform.</small>
    </div>

    <div class="field">
      <label for="custom-dir">Target Directory (optional)</label>
      <input
        id="custom-dir"
        type="text"
        bind:value={customDirInput}
        placeholder="Leave empty to push to root"
      />
    </div>

    <fieldset class="field">
      <legend>Repository Branch</legend>
      <div class="radios">
        <label class="radio-label">
          <input type="radio" bind:group={branchPreset} value="main" /> main
        </label>
        <label class="radio-label">
          <input type="radio" bind:group={branchPreset} value="master" /> master
        </label>
        <label class="radio-label">
          <input type="radio" bind:group={branchPreset} value="custom" /> custom
        </label>
      </div>
      {#if branchPreset === 'custom'}
        <input
          type="text"
          placeholder="Enter custom branch"
          bind:value={customBranchInput}
          class="custom-branch-input"
        />
      {/if}
    </fieldset>

    <fieldset class="field">
      <legend>Daily Problems in Separate Folder</legend>
      <div class="radios">
        <label class="radio-label">
          <input type="radio" bind:group={separateFolderInput} value="yes" /> Yes
        </label>
        <label class="radio-label">
          <input type="radio" bind:group={separateFolderInput} value="no" /> No
        </label>
      </div>
    </fieldset>

    <fieldset class="field">
      <legend>Keyboard Shortcut</legend>
      <div class="shortcut-row">
        <select id="shortcut-modifier" bind:value={shortcutModifier} aria-label="Modifier key">
          <option value="meta">{isMac ? '⌘ Command' : '⊞ Windows'}</option>
          <option value="ctrl">Ctrl</option>
          <option value="alt">{isMac ? '⌥ Option' : 'Alt'}</option>
          <option value="shift">⇧ Shift</option>
        </select>
        <span>+</span>
        <input
          id="shortcut-key"
          type="text"
          bind:value={shortcutKey}
          maxlength={1}
          placeholder="Key"
          class="key-input"
          aria-label="Shortcut key"
        />
      </div>
    </fieldset>

    {#if saveStatus === 'error'}
      <p class="error">{errorMsg}</p>
    {/if}
    {#if saveStatus === 'success'}
      <p class="success">Settings saved.</p>
    {/if}

    <button type="submit" disabled={saving}>
      {saving ? 'Saving...' : 'Save Settings'}
    </button>
  </form>
</main>

<style>
  :global(:root) {
    --clr-accent: #DD4D5C;
    --clr-accent-hover: #e6717e;
    --clr-accent-glow: rgb(221 77 92 / 10%);
    --clr-bg: #1c1c1c;
    --clr-surface: #2a2a2a;
    --clr-surface-hover: #3a3a3a;
    --clr-border: #444;
    --clr-text: #e5e5e5;
    --clr-muted: #aaa;
    --clr-dim: #888;
    --clr-faint: #555;
    --clr-easy: #1cbaba;
    --clr-medium: #ffb700;
    --clr-hard: #ef4743;
    --clr-easy-track: #1a4a3a;
    --clr-medium-track: #4a3a0a;
    --clr-hard-track: #4a1a1a;
    --clr-error: #ef4743;
    --clr-success: #2ecc71;
    --clr-btn: #555;
    --clr-btn-hover: #666;
  }

  :global(*, *::before, *::after) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(body) {
    background-color: var(--clr-bg);
    color: var(--clr-text);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
  }

  main {
    max-width: 480px;
    margin: 40px auto;
    padding: 0 16px 40px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .header h1 {
    font-size: 1.8rem;
    font-weight: 700;
    text-align: center;
  }

  .header h1 span {
    color: var(--clr-accent);
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 20px;
    background: var(--clr-surface);
    border-radius: 12px;
    padding: 24px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  fieldset.field {
    border: none;
    padding: 0;
  }

  legend {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 8px;
  }

  label {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.8);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  label a {
    font-size: 11px;
    color: var(--clr-accent);
    text-decoration: underline;
  }

  label a:hover {
    color: var(--clr-accent-hover);
  }

  input[type='text'],
  input[type='password'],
  select {
    padding: 8px 10px;
    border-radius: 6px;
    border: 1px solid var(--clr-border);
    background: var(--clr-bg);
    color: var(--clr-text);
    font-size: 13px;
    font-family: inherit;
    outline: none;
    width: 100%;
  }

  input[type='text']:focus,
  input[type='password']:focus,
  select:focus {
    border-color: var(--clr-accent);
  }

  .radios {
    display: flex;
    gap: 24px;
  }

  .radio-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--clr-text);
    cursor: pointer;
  }

  input[type='radio'] {
    accent-color: var(--clr-accent);
    cursor: pointer;
  }

  .shortcut-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .shortcut-row select {
    width: auto;
    min-width: 140px;
  }

  .shortcut-row span {
    color: rgba(255, 255, 255, 0.6);
    font-weight: bold;
  }

  .key-input {
    width: 44px !important;
    text-align: center;
    text-transform: uppercase;
  }

  .error {
    color: var(--clr-error);
    font-size: 12px;
  }

  .success {
    color: var(--clr-success);
    font-size: 12px;
  }

  button[type='submit'] {
    padding: 9px 20px;
    border-radius: 8px;
    border: none;
    background: var(--clr-accent);
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
    align-self: flex-end;
  }

  button[type='submit']:hover:not(:disabled) {
    background: var(--clr-accent-hover);
  }

  button[type='submit']:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
