import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
import { rewriteLinksPlugin } from './rewrite-links'

export default withMermaid(
  defineConfig({
    title: 'Nuxy',
    description: 'A frameless, transparent Electron launcher with a powerful extension system',
    lang: 'en-US',

    markdown: {
      config(md) {
        rewriteLinksPlugin(md)
      },
    },

    vite: {
      optimizeDeps: {
        include: [
          'mermaid',
          'dayjs',
          '@braintree/sanitize-url',
          'cytoscape',
          'cytoscape-cose-bilkent',
        ],
      },
      ssr: {
        noExternal: ['mermaid', 'dayjs'],
      },
    },

    themeConfig: {
      logo: '/logo.svg',
      nav: [
        { text: 'Guide', link: '/guide/getting-started' },
        { text: 'Extensions', link: '/extensions/overview' },
        { text: 'API', link: '/api/' },
        { text: 'Architecture', link: '/design/overview' },
      ],

      sidebar: {
        '/guide/': [
          {
            text: 'Getting Started',
            items: [
              { text: 'What is Nuxy?', link: '/guide/what-is-nuxy' },
              { text: 'Quick Start', link: '/guide/getting-started' },
              { text: 'Installation', link: '/guide/installation' },
              { text: 'Configuration', link: '/guide/configuration' },
            ],
          },
          {
            text: 'Core Concepts',
            items: [
              { text: 'Architecture', link: '/guide/architecture' },
              { text: 'Extension System', link: '/guide/extension-system' },
              { text: 'IPC & Kernel', link: '/guide/ipc-kernel' },
              { text: 'Security', link: '/guide/security' },
            ],
          },
          {
            text: 'Tooling',
            items: [{ text: 'MCP Server', link: '/guide/mcp-server' }],
          },
          {
            text: 'Internal Reference',
            items: [
              { text: 'Core Package', link: '/guide/core-package' },
              { text: 'Shell Extension', link: '/guide/shell-extension' },
              { text: 'Refactoring Roadmap', link: '/guide/refactoring-roadmap' },
            ],
          },
        ],
        '/extensions/': [
          {
            text: 'Build Extensions',
            items: [
              { text: 'Overview', link: '/extensions/overview' },
              { text: 'Your First Extension', link: '/extensions/first-extension' },
              { text: 'Manifest Reference', link: '/extensions/manifest' },
              { text: 'Frontend Structure', link: '/extensions/frontend-structure' },
              { text: 'Testing', link: '/extensions/testing' },
            ],
          },
          {
            text: 'Reference',
            items: [
              { text: 'Development Guide', link: '/extensions/development-guide' },
              { text: 'Access & Permissions', link: '/extensions/extension-access' },
              { text: 'Built-in Extensions', link: '/extensions/built-in' },
            ],
          },
          {
            text: 'Tooling',
            items: [
              { text: 'Simulator', link: '/extensions/simulator' },
              { text: 'Linter', link: '/extensions/linting' },
              { text: 'Packaging', link: '/extensions/packaging' },
            ],
          },
        ],
        '/api/': [
          {
            text: 'API Reference',
            items: [
              { text: 'Overview', link: '/api/' },
              { text: 'CoreContext', link: '/api/core-context' },
              { text: 'Registry', link: '/api/registry' },
              { text: 'IPC', link: '/api/ipc' },
              { text: 'Storage', link: '/api/storage' },
              { text: 'Clipboard', link: '/api/clipboard' },
              { text: 'Window', link: '/api/window' },
            ],
          },
        ],
        '/design/': [
          {
            text: 'Architecture',
            items: [
              { text: 'Philosophy', link: '/design/overview' },
              { text: 'Architecture Map', link: '/design/architecture-map' },
              { text: 'System Architecture', link: '/design/system-architecture' },
              { text: 'Data Flow', link: '/design/data-flow' },
              { text: 'Modules', link: '/design/modules' },
            ],
          },
          {
            text: 'Extension Platform',
            items: [
              { text: 'Plugin System', link: '/design/modular-plugin-system' },
              { text: 'Omni Input', link: '/design/omni-input-system' },
              { text: 'Frontend Extensions', link: '/design/frontend-extensions' },
              { text: 'Lit Renderer', link: '/design/lit-renderer' },
              { text: 'API Design', link: '/design/api-design' },
            ],
          },
          {
            text: 'Operations',
            items: [
              { text: 'Security Model', link: '/design/security' },
              { text: 'Testing Strategy', link: '/design/testing-strategy' },
              { text: 'Deployment', link: '/design/deployment' },
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
)
