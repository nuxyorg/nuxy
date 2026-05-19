# Documentation index — implementation status

Legend matches [21-extension-access.md](./21-extension-access.md):

| Status | Meaning |
|--------|---------|
| **Implemented** | Available in code today |
| **Partial** | API exists but incomplete |
| **Planned** | Designed, not wired |

## Canonical runtime paths

| Path | Purpose |
|------|---------|
| `~/.nuxy/nuxyconfig` | User settings |
| `~/.nuxy/extensions/` | Installed extensions |
| `~/.nuxy/data/<manifest.id>/` | Extension storage (chroot) |
| `~/.nuxy/themes/` | Runtime themes |

Source: [electron-fix-plan.md](./electron-fix-plan.md), [structure.md](./structure.md).

## Feature status

| Feature | Status | Notes |
|---------|--------|-------|
| Worker per extension | **Implemented** | `worker/spawn.ts` |
| `nuxy-ext://` protocol | **Implemented** | `protocol-resolve.ts` |
| Storage chroot | **Implemented** | `storage-path.ts` |
| `permissions` manifest gate | **Implemented** | `permissions.ts` |
| IPC channel allowlist | **Implemented** | `registry.ts`, `ipc-validate.ts` |
| Registry worker sync | **Implemented** | `registry:sync` message |
| Message broker | **Implemented** | `broker.ts` |
| Shell as extension | **Implemented** | `extensions/shell/` |
| Clipboard consent UI | **Planned** | Deny without permission today |
| AI orchestrator | **Planned** | Type exists; optional extension |
| Extension hot reload | **Partial** | `fs.watch` in dev |
| Playwright E2E | **Implemented** | `src/e2e/` |

## Doc hygiene

Historical references to `~/.local/share/nuxy` are obsolete. Use `~/.nuxy` only.

Pain-point audit: [pain-points-plan.md](./pain-points-plan.md).
