<script lang="ts">
  import { onMount } from 'svelte'
  import type { DailyProblemI, UserStatsI, UserStreakI } from '../../lib/types'
  import { fetchDailyProblem, fetchUserStats, fetchUserStreak } from '../../lib/api'
  import { getDifficultyColor, streakEmoji, getDayColor, formatStreak } from '../../lib/utils'
  import { leetcodeUsername } from '../../lib/storage'

  let username = $state('')
  let usernameInput = $state('')
  let submitLoading = $state(false)
  let submitError = $state('')

  onMount(async () => {
    username = await leetcodeUsername.getValue()
  })

  let stats = $state<UserStatsI | null>(null)
  let streak = $state<UserStreakI | null>(null)
  let daily = $state<DailyProblemI | null>(null)
  let dataLoading = $state(false)
  let dataError = $state('')

  let streakRef = $state<HTMLDivElement | null>(null)

  async function loadData(user: string) {
    dataLoading = true
    dataError = ''
    try {
      ;[stats, streak, daily] = await Promise.all([
        fetchUserStats(user),
        fetchUserStreak(user),
        fetchDailyProblem(),
      ])
    } catch (err) {
      dataError = err instanceof Error ? err.message : 'Failed to load data'
    } finally {
      dataLoading = false
    }
  }

  $effect(() => {
    if (username) loadData(username)
  })

  $effect(() => {
    if (streakRef && streak) {
      streakRef.scrollLeft = streakRef.scrollWidth
    }
  })

  async function handleSubmit(e: Event) {
    e.preventDefault()
    if (!usernameInput.trim()) {
      submitError = 'Enter username'
      return
    }
    submitLoading = true
    submitError = ''
    try {
      await fetchUserStats(usernameInput)
      username = usernameInput
      await leetcodeUsername.setValue(username)
    } catch (err) {
      submitError = err instanceof Error ? err.message : 'Failed to fetch user stats'
    } finally {
      submitLoading = false
    }
  }

  async function clearUsername() {
    username = ''
    await leetcodeUsername.setValue('')
    stats = null
    streak = null
    daily = null
    usernameInput = ''
  }

  let streakData = $derived(streak ? formatStreak(streak.fullSubmissionArray) : [])

  let acStats = $derived(
    stats
      ? {
          easy: stats.acSubmissionNum[1]?.count ?? 0,
          medium: stats.acSubmissionNum[2]?.count ?? 0,
          hard: stats.acSubmissionNum[3]?.count ?? 0,
          total: stats.acSubmissionNum[0]?.count ?? 0,
        }
      : null,
  )

  let totalStats = $derived(
    stats
      ? {
          easy: stats.allQuestionsCount[1]?.count ?? 0,
          medium: stats.allQuestionsCount[2]?.count ?? 0,
          hard: stats.allQuestionsCount[3]?.count ?? 0,
        }
      : null,
  )
</script>

<main>
  <!-- Header -->
  <div class="header">
    <a href="https://codeberg.org/tonicatOWO/SukiLeet" target="_blank" class="gh-link" aria-label="Codeberg repository">
      <img src="/codeberg-svgrepo-com.svg" width="18" height="18" alt="Codeberg" />
    </a>
    <button class="settings-btn" onclick={() => browser.runtime.openOptionsPage()} aria-label="Settings">
      <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
        <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
      </svg>
    </button>
  </div>

  <!-- Logo -->
  <div class="logo">
    <h1>Suki<span>Leet</span></h1>
  </div>

  {#if !username}
    <!-- Input Form -->
    <div class="form-section">
      <form onsubmit={handleSubmit}>
        <input
          type="text"
          placeholder="LeetCode username"
          bind:value={usernameInput}
          disabled={submitLoading}
        />
        <button type="submit" disabled={submitLoading}>
          {submitLoading ? '...' : 'Submit'}
        </button>
      </form>
      {#if submitError}
        <p class="error">{submitError}</p>
      {/if}
    </div>
  {:else}
    <!-- Logged in view -->
    {#if dataLoading}
      <div class="spinner-wrap">
        <div class="spinner"></div>
      </div>
    {:else if dataError}
      <div class="data-error">Error: {dataError}</div>
    {:else}
      <!-- Welcome -->
      <div class="welcome">
        <span class="greet">Hi, <strong>{username}</strong></span>
        <span class="total">Total: <strong>{acStats?.total ?? '—'}</strong></span>
      </div>

      <!-- Stats -->
      {#if acStats && totalStats}
        <div class="stats">
          <div class="stat-labels">
            <span class="easy">Easy</span>
            <span class="medium">Medium</span>
            <span class="hard">Hard</span>
          </div>
          <div class="stat-counts">
            <span><strong>{acStats.easy}</strong>/{totalStats.easy}</span>
            <span><strong>{acStats.medium}</strong>/{totalStats.medium}</span>
            <span><strong>{acStats.hard}</strong>/{totalStats.hard}</span>
          </div>
          <div class="bars">
            <div class="bar-track easy-track">
              <div class="bar easy-bar" style="width:{(acStats.easy/totalStats.easy*100).toFixed(1)}%"></div>
            </div>
            <div class="bar-track medium-track">
              <div class="bar medium-bar" style="width:{(acStats.medium/totalStats.medium*100).toFixed(1)}%"></div>
            </div>
            <div class="bar-track hard-track">
              <div class="bar hard-bar" style="width:{(acStats.hard/totalStats.hard*100).toFixed(1)}%"></div>
            </div>
          </div>
        </div>
      {/if}

      <!-- Streak -->
      {#if streak}
        <div class="streak-section">
          <p class="streak-label">
            Max Streak: <strong>{streak.maxStreak}</strong> {streakEmoji(streak.maxStreak)}
          </p>
          <div class="streak-scroll" bind:this={streakRef}>
            {#each streakData as monthData}
              <div class="month-block">
                <div class="day-grid">
                  {#each monthData.days as day}
                    <div
                      class="day-cell"
                      style="background-color:{getDayColor(day.value)}"
                      title="{monthData.month} {day.day}: {day.value}"
                    ></div>
                  {/each}
                </div>
                <p class="month-label">{monthData.month}</p>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Daily Problem -->
      {#if daily}
        <div class="daily">
          <span class="daily-tag">Daily</span>
          <a
            href="https://leetcode.com{daily.link}"
            target="_blank"
            class="daily-title"
          >{daily.question.title}</a>
          <span
            class="difficulty-badge"
            style="color:{getDifficultyColor(daily.question.difficulty as 'Easy'|'Medium'|'Hard')}"
          >{daily.question.difficulty}</span>
          <div class="tags">
            {#each daily.question.topicTags as tag}
              <span class="tag">{tag.name}</span>
            {/each}
          </div>
        </div>
      {/if}
    {/if}

    <!-- Edit button -->
    <div class="edit-row">
      <button class="edit-btn" onclick={clearUsername}>Edit</button>
    </div>
  {/if}

  <!-- Footer -->
  <footer>
    <span>SukiLeet v0.1</span>
  </footer>
</main>

<style>
  main {
    background-color: var(--clr-bg);
    color: var(--clr-text);
    padding: 16px;
    width: 320px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 200px;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .gh-link {
    color: var(--clr-muted);
    transition: color 0.2s;
  }
  .gh-link:hover { color: #fff; }

  .settings-btn {
    background: none;
    border: none;
    color: var(--clr-muted);
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    transition: color 0.2s;
  }
  .settings-btn:hover { color: #fff; }

  .logo {
    text-align: center;
  }

  .logo h1 {
    font-size: 1.6rem;
    font-weight: 700;
  }

  .logo h1 span {
    color: var(--clr-accent);
  }

  /* Form */
  .form-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px 0;
  }

  .form-section form {
    display: flex;
    gap: 8px;
    width: 100%;
  }

  .form-section input {
    flex: 1;
    padding: 6px 10px;
    border-radius: 6px;
    border: 1px solid var(--clr-border);
    background: var(--clr-surface);
    color: var(--clr-text);
    font-size: 13px;
    outline: none;
  }

  .form-section input:focus {
    border-color: var(--clr-accent);
  }

  .form-section button {
    padding: 6px 14px;
    border-radius: 6px;
    border: none;
    background: var(--clr-btn);
    color: #fff;
    font-size: 13px;
    transition: background 0.2s;
  }

  .form-section button:hover:not(:disabled) {
    background: var(--clr-btn-hover);
  }

  .form-section button:disabled {
    opacity: 0.5;
  }

  .error {
    color: var(--clr-error);
    font-size: 12px;
  }

  /* Spinner */
  .spinner-wrap {
    display: flex;
    justify-content: center;
    padding: 24px;
  }

  .spinner {
    width: 28px;
    height: 28px;
    border: 3px solid var(--clr-border);
    border-top-color: var(--clr-accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .data-error {
    color: var(--clr-error);
    font-size: 13px;
    font-weight: 600;
    text-align: center;
  }

  /* Welcome */
  .welcome {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 4px;
  }

  .greet {
    font-size: 14px;
    color: var(--clr-muted);
  }

  .greet strong { color: var(--clr-text); }

  .total {
    font-size: 13px;
    color: var(--clr-muted);
  }

  .total strong { color: var(--clr-text); }

  /* Stats */
  .stats {
    display: grid;
    grid-template-columns: auto auto 1fr;
    gap: 6px 12px;
    align-items: center;
  }

  .stat-labels {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .stat-counts {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 12px;
    color: var(--clr-dim);
  }

  .stat-counts strong { color: var(--clr-text); }

  .bars {
    display: flex;
    flex-direction: column;
    gap: 8px;
    justify-content: center;
  }

  .bar-track {
    height: 8px;
    border-radius: 4px;
    overflow: hidden;
  }

  .easy-track { background: var(--clr-easy-track); }
  .medium-track { background: var(--clr-medium-track); }
  .hard-track { background: var(--clr-hard-track); }

  .bar { height: 100%; border-radius: 4px; }
  .easy-bar { background: var(--clr-easy); }
  .medium-bar { background: var(--clr-medium); }
  .hard-bar { background: var(--clr-hard); }

  .easy { color: var(--clr-easy); font-size: 13px; }
  .medium { color: var(--clr-medium); font-size: 13px; }
  .hard { color: var(--clr-hard); font-size: 13px; }

  /* Streak */
  .streak-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .streak-label {
    font-size: 12px;
    text-align: center;
    color: var(--clr-muted);
  }

  .streak-label strong { color: var(--clr-text); }

  .streak-scroll {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    scrollbar-width: none;
    padding-bottom: 4px;
  }

  .streak-scroll::-webkit-scrollbar { display: none; }

  .month-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    min-width: 80px;
  }

  .day-grid {
    display: grid;
    grid-template-columns: repeat(5, 14px);
    gap: 2px;
  }

  .day-cell {
    width: 14px;
    height: 14px;
    border-radius: 2px;
  }

  .month-label {
    font-size: 10px;
    color: var(--clr-dim);
    text-align: center;
  }

  /* Daily */
  .daily {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    font-size: 12px;
  }

  .daily-tag {
    color: var(--clr-dim);
    font-size: 11px;
  }

  .daily-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--clr-text);
    text-decoration: underline;
    transition: color 0.2s;
  }

  .daily-title:hover { color: var(--clr-accent); }

  .difficulty-badge {
    font-size: 12px;
    font-weight: 600;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    width: 100%;
  }

  .tag {
    background: var(--clr-surface);
    color: var(--clr-dim);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
  }

  /* Edit */
  .edit-row {
    display: flex;
    justify-content: flex-end;
  }

  .edit-btn {
    padding: 4px 12px;
    border-radius: 6px;
    border: 1px solid var(--clr-border);
    background: var(--clr-surface);
    color: var(--clr-muted);
    font-size: 12px;
    transition: background 0.2s;
  }

  .edit-btn:hover {
    background: var(--clr-surface-hover);
    color: var(--clr-text);
  }

  /* Footer */
  footer {
    text-align: center;
    font-size: 11px;
    color: var(--clr-faint);
  }
</style>
