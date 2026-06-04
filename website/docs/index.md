---
layout: home

hero:
  name: 'Nuxy'
  text: 'A Launcher That Gets Out of Your Way'
  tagline: Frameless, transparent, extension-powered. Built on Electron + React.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Create an Extension
      link: /extensions/first-extension

features:
  - icon: 🔌
    title: Extension-First
    details: Every feature is an extension. The launcher core is intentionally minimal — all power comes from the ecosystem of tools, providers, and orchestrators.
  - icon: 🔒
    title: Zero-Trust Security
    details: Extensions run in isolated Worker threads. Permissions are declared in manifest.json and enforced by the kernel. No extension can access another's data or memory.
  - icon: ⚡
    title: Instant Popup
    details: Frameless transparent window with spring-physics animations. Summon it with a global shortcut, use it, dismiss it — zero friction.
  - icon: 🎨
    title: Fully Themeable
    details: CSS custom properties, JSON theme extensions, and icon pack extensions. Make Nuxy look exactly how you want without touching core code.
  - icon: 🌐
    title: Internationalized
    details: Built-in i18n system with BCP 47 locale resolution, RTL support, and per-extension translation files. Ship extensions in any language.
  - icon: 🧪
    title: TDD Culture
    details: Every extension ships with a backend.test.ts. The mock CoreContext helper makes testing fast and reliable without spinning up Electron.
---
