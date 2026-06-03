import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Nuxy',
  description: 'A frameless, transparent Electron launcher with a powerful extension system',
  lang: 'en-US',

  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Extensions', link: '/extensions/overview' },
      { text: 'API', link: '/api/core-context' },
      { text: 'Roadmap', link: '/roadmap' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is Nuxy?', link: '/guide/what-is-nuxy' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Configuration', link: '/guide/configuration' },
          ],
        },
        {
          text: 'Architecture',
          items: [
            { text: 'Overview', link: '/guide/architecture' },
            { text: 'Extension System', link: '/guide/extension-system' },
            { text: 'IPC & Kernel', link: '/guide/ipc-kernel' },
            { text: 'Security Model', link: '/guide/security' },
          ],
        },
      ],
      '/extensions/': [
        {
          text: 'Extension Development',
          items: [
            { text: 'Overview', link: '/extensions/overview' },
            { text: 'Your First Extension', link: '/extensions/first-extension' },
            { text: 'Manifest Reference', link: '/extensions/manifest' },
            { text: 'CoreContext API', link: '/extensions/core-context' },
            { text: 'Frontend Guide', link: '/extensions/frontend' },
            { text: 'Testing Extensions', link: '/extensions/testing' },
          ],
        },
        {
          text: 'Built-in Extensions',
          items: [
            { text: 'Shell', link: '/extensions/built-in/shell' },
            { text: 'Settings', link: '/extensions/built-in/settings' },
            { text: 'Clipboard', link: '/extensions/built-in/clipboard' },
            { text: 'Calculator', link: '/extensions/built-in/calculator' },
            { text: 'Snippets', link: '/extensions/built-in/snippets' },
            { text: 'Notes', link: '/extensions/built-in/notes' },
            { text: 'AI Orchestrator', link: '/extensions/built-in/ai-orchestrator' },
            { text: 'Themes & Icons', link: '/extensions/built-in/themes' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'CoreContext', link: '/api/core-context' },
            { text: 'Registry API', link: '/api/registry' },
            { text: 'IPC API', link: '/api/ipc' },
            { text: 'Storage API', link: '/api/storage' },
            { text: 'Clipboard API', link: '/api/clipboard' },
            { text: 'Window API', link: '/api/window' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/nuxy/nuxy' }],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Nuxy',
    },

    search: {
      provider: 'local',
    },
  },
})
