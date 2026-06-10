---
layout: home

hero:
  name: 'Nuxy'
  text: 'A Launcher That Gets Out of Your Way'
  tagline: Frameless, transparent, and entirely extension-powered. Built with Electron and Lit.
  image:
    src: /logo.svg
    alt: Nuxy
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Build an Extension
      link: /extensions/first-extension

features:
  - icon: 🔌
    title: Extension-First
    details: The core is an empty shell. Tools, providers, orchestrators, themes, and UI kits are all extensions you install, swap, or build yourself.
  - icon: 🔒
    title: Sandboxed by Default
    details: Each extension backend runs in its own Worker thread. Permissions are declared in manifest.json and enforced at the kernel boundary.
  - icon: ⚡
    title: Instant Popup
    details: Summon a frameless transparent window from anywhere, act on results, dismiss — spring-physics animations included.
  - icon: 🎨
    title: Fully Themeable
    details: JSON theme extensions, icon packs, and CSS custom properties. Reskin the entire launcher without touching core code.
  - icon: 🧩
    title: Lit + UI Kit
    details: Extension frontends use LitElement with a shared UI kit. Consistent look, tiny bundles, keyboard-first interaction.
  - icon: 🌐
    title: Internationalized
    details: BCP 47 locale resolution, RTL support, and per-extension translation files. Ship in any language.
---
