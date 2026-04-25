import { defineConfig } from 'wxt'

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: 'SukiLeet',
    description: 'Push LeetCode solutions to GitHub',
    permissions: ['storage'],
    host_permissions: ['https://api.github.com/*'],
  },
  vite: () => ({
    optimizeDeps: {
      entries: ['src/**/*.html'],
    },
  }),
})
