# 01 - System Analysis

## 1. Deconstructing the Monolith
Before implementing the "Empty Shell", we must analyze how the old architecture failed by trying to do too much.

### 1.1 The `electron/main.ts` God Object
In the legacy codebase, `main.ts` was an architectural bottleneck. It directly imported services (`ClipboardService`, `VaultService`) and hardcoded IPC routes.
**Risk Implication:**
- The application was impossible to extend without altering the core executable. 
- Features could not be disabled or updated independently.

## 2. The Shift to "Zero Built-in Features"
We are extracting *every single feature* from the core repository. 
The Nuxy core repository will no longer contain any code for:
- App Launcher
- Clipboard
- Notes
- Vault
- Terminal

Instead, the Nuxy team (and the community) will build these as **separate, standalone repositories**. They will be compiled into `.nuxyext` zip files and placed into the user's `~/.local/share/nuxy/extensions/` folder.

## 3. The Path Forward: The Extension Engine
The new Nuxy core consists *only* of:
1. **Window Manager**: Spawns the transparent React window.
2. **V8 Sandbox Engine**: Creates isolated Node environments for extension backends.
3. **CoreContext API**: The minimal set of safe APIs (Storage, Notify, Clipboard) passed into the sandbox.
4. **Dynamic Protocol Handler**: An Electron `protocol.handle` interceptor that serves external React JS files to the Chromium frontend.

---

**Next Step:** [Architecture](./02-architecture.md) | **Previous:** [System Overview](./00-overview.md)
