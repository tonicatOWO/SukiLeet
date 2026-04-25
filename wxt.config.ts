import { defineConfig } from 'wxt'

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte', '@wxt-dev/auto-icons'],
  autoIcons: {
    name: 'icon',
    target: 'public',
  },
  manifest: {
    name: 'SukiLeet',
    description: 'Push LeetCode solutions to GitHub, GitLab, and Codeberg',
    permissions: ['storage'],
    host_permissions: ['https://*/*'],
  },
  vite: () => ({
    optimizeDeps: {
      entries: ['src/**/*.html'],
    },
  }),
})
