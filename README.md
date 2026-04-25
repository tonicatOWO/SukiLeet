# SukiLeet

Push LeetCode solutions to GitHub, GitLab, and Codeberg.

Multi-platform browser extension built with Svelte + WXT. Fork of [LeetPush](https://github.com/LeetPushExtension/LeetPush).

## Features

- **Multi-platform support**: GitHub, GitLab, Codeberg
- **One-click push**: Automatically push solved LeetCode problems
- **Easy setup**: Configure once, push forever
- **Modern stack**: Svelte 5 + WXT framework
- **Multi-browser**: Chrome, Firefox, Edge, and more

## Supported Browsers

- Chrome / Chromium
- Firefox
- Edge
- Safari (via WXT)

## Installation

### From Source

```bash
# Clone the repo
git clone https://github.com/your-username/SukiLeet.git
cd SukiLeet

# Install dependencies
bun install

# Development
bun run dev          # Chrome
bun run dev:firefox  # Firefox

# Build for production
bun run build        # Chrome
bun run build:firefox # Firefox

# Package as zip
bun run zip          # Chrome
bun run zip:firefox # Firefox
```

### From Browser Store

Extension available on browser web stores (coming soon).

## Usage

1. Generate a personal access token from your platform:
   - **GitHub**: Settings → Developer settings → Personal access tokens
   - **GitLab**: Settings → Access Tokens
   - **Codeberg**: Settings → Access Tokens

2. Configure the extension:
   - Click the SukiLeet icon in your browser toolbar
   - Enter your username, repository name, and access token

3. Push solutions:
   - Solve a problem on LeetCode
   - Click the **Push** button
   - Solution commits to your repository

## Project Structure

```
src/
├── entrypoints/          # Extension entry points
│   ├── background.ts     # Background service worker
│   ├── content.ts        # Content script (LeetCode page)
│   ├── popup/            # Popup UI (Svelte component)
│   └── options/          # Options page (Svelte component)
├── lib/                  # Core logic
│   ├── github.ts         # GitHub API integration
│   ├── gitlab.ts         # GitLab API integration
│   ├── codeberg.ts       # Codeberg API integration
│   ├── repo-write.ts     # Repository write operations
│   ├── storage.ts        # Storage utilities
│   ├── types.ts          # TypeScript types
│   └── utils.ts          # Helper functions
└── assets/               # Static assets
    └── content.css       # Content script styles
```

## Tech Stack

- [Svelte 5](https://svelte.dev/) - UI framework
- [WXT](https://wxt.dev/) - Browser extension framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Bun](https://bun.sh/) - Package manager & runtime

## Configuration

WXT configuration in `wxt.config.ts`:

```typescript
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: 'SukiLeet',
    description: 'Push LeetCode solutions to GitHub, GitLab, and Codeberg',
    permissions: ['storage'],
    host_permissions: ['https://*/*'],
  },
})
```

## License

MIT