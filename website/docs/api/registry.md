---
title: Registry API
---

# Registry API

Extensions register themselves with the kernel so the shell can list and route to them.

## Register a tool

```ts
core.registry.registerTool({
  name: 'My Tool',
  // optional display metadata
})
```

Use `type: "tool"` in `manifest.json`. The tool appears in the launcher's tool list (unless `bootstrap: true`).

## Register a provider

```ts
core.registry.registerProvider({
  name: 'Calculator',
})
```

Providers answer live omnibar queries. The shell invokes the `eval` channel on each keystroke.

## Register an orchestrator

```ts
core.registry.registerOrchestrator({
  name: 'AI Orchestrator',
})
```

Orchestrators handle Enter when no result is selected — typically routing to an LLM or intent parser.

## Register themes and icon packs

```ts
core.registry.registerTheme({ name: 'ocean', ... })
core.registry.registerIconPack({ name: 'my-icons', ... })
```

Theme and iconpack extensions usually declare `entry.theme` or `entry.icons` in the manifest instead — the scanner registers them automatically.

## Cross-extension invocation

```ts
const result = await core.extensions.invoke(targetId, channel, payload)
```

Requires `capabilities.callable: true` on the target and `capabilities.caller: true` on the caller. Routed via the message broker in the main process.

## Related

- [Extension System](/guide/extension-system)
- [Manifest Reference](/extensions/manifest)
