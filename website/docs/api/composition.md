---
title: Composition API
---

# Composition API

The Composition API enables dynamic UI injection into the Nuxy shell. It allows the shell extension (or other extensions) to declare UI "slots", and allows other extensions to "mount" custom Lit elements into those slots at runtime.

## Core Concepts

- **Provides**: An extension declares in its `manifest.json` that it provides a specific composition slot (e.g., `shell.header`, `shell.sidebar`).
- **Claims**: Other extensions declare in their `manifest.json` that they intend to mount UI into a specific slot.
- **Mount**: At runtime, an extension can mount its UI component (Custom Element) into a claimed slot using the `window.core.composition` bridge.

## Frontend Usage

Extensions mount their UI into slots via `window.core.composition`.

```ts
// 1. Mount a custom element into the 'shell.header' slot
const handle = await window.core.composition.mount('shell.header', 'com.nuxy.my-extension', {
  props: { title: 'My Custom Header' },
})

// 2. Later, unmount it if needed
await window.core.composition.unmount(handle.id)
```

## Manifest Configuration

### Providing Slots

The shell extension (or any extension acting as a host) declares the slots it provides:

```json
{
  "composition": {
    "provides": [
      {
        "name": "shell.header",
        "description": "Top bar of the shell window",
        "maxMounts": 1
      }
    ]
  }
}
```

### Claiming Slots

An extension that wishes to render into a slot must claim it:

```json
{
  "composition": {
    "claims": ["shell.header"]
  }
}
```

If an extension attempts to mount a component into a slot it hasn't claimed, or if the slot doesn't exist, the kernel will reject the mount request.
