---
title: Clipboard API
---

# Clipboard API

The clipboard API lets extension backends read and write the OS clipboard through the kernel.

## Text

```ts
const text = await core.clipboard.readText()
await core.clipboard.writeText('copied text')
```

## Images

```ts
const dataUrl = await core.clipboard.readImage() // → string | null
await core.clipboard.writeImage(dataUrl)
```

## Files

```ts
await core.clipboard.writeFiles(['/path/to/file.png'])
```

## Permission

Declare `clipboard` in `manifest.json`:

```json
{
  "permissions": ["clipboard", "storage"]
}
```

User consent prompts for clipboard access are planned but not yet enforced.

## Related

- [CoreContext](/api/core-context)
- [Security Model](/guide/security)
