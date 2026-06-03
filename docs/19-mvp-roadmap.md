# 19 - MVP (Minimum Viable Product) Roadmap

## The Philosophy of the MVP

The architectural design of Nuxy is incredibly ambitious. Attempting to build the AI Orchestrator, Chroot Jails, and WASM support on day one will result in "Development Hell".

To reach a **Minimum Viable Product (MVP)** within 2-3 weeks, we must drastically reduce scope. The MVP has only one goal: **Prove that the "Empty Shell + Worker Thread Extension" paradigm works.**

---

## 🚫 What is EXCLUDED from the MVP

- **AI Orchestrator**: No Ollama/Functiongemma integration yet.
- **Chroot Jails**: The `core.storage` API will just be a basic wrapper. We will "trust" the first few official extensions not to be malicious.
- **Dynamic Permission Prompts**: We will skip the user-consent UI blocks for now.
- **Advanced Capabilities**: No WASM, no Dependency Graph, no Hot Reloading.

---

## ✅ Sprint 1: The Bare Metal Shell (Days 1-3)

**Goal:** Have a blank transparent window that opens when the executable is launched, utilizing a Single Instance Daemon pattern.

1. **Scaffold**: Initialize Vite + React + Electron + Tailwind + Shadcn.
2. **Window Manager**: Implement the frameless, transparent window that pauses Chromium rendering when blurred/hidden.
3. **Single Instance Daemon**: Do **not** use Electron's `globalShortcut`. Instead, use `app.requestSingleInstanceLock()` and a UNIX Socket (`/tmp/nuxy.sock`). When the OS shortcut runs `nuxy` a second time, the first instance intercepts it and calls `window.show()`.
4. **OmniBar UI**: Build the central Input component in React. If nothing is typed, it displays: _"Nuxy MVP: Ready"_.

---

## ✅ Sprint 2: The Extension Engine (Days 4-7)

**Goal:** The Kernel can discover an extension and spawn it in a Worker thread.

1. **The Scanner**: Write Node.js logic to read `~/.nuxy/extensions`.
2. **The Worker**: Use Node's `worker_threads` to execute `backend.js`.
3. **The Minimal CoreContext**: Inject a basic MessagePort object into the Worker so it can send a simple `{ action: 'ping' }` to the Kernel.
4. **The Protocol**: Register `nuxy-ext://` in Electron so Chrome can fetch local files.

---

## ✅ Sprint 3: The First Provider (Days 8-10)

**Goal:** Build a Calculator extension to prove the `Provider` (Dropdown) pattern.

1. **External Repo**: Create a dummy folder `nuxy-ext-calculator`.
2. **Backend**: Write a simple math evaluator that listens to text input.
3. **Integration**: When the user types `2 + 2` in the OmniBar, Nuxy routes it to the Calculator Worker. The Worker returns `4`. Nuxy displays `4` in the dropdown list.

---

## ✅ Sprint 4: The First Tool (Days 11-14)

**Goal:** Build a Clipboard extension to prove the `Tool` (Custom UI) pattern.

1. **Backend**: The Clipboard Worker polls the OS clipboard using Electron APIs (passed safely via `CoreContext`).
2. **Frontend UI**: Create `frontend.tsx` using `@nuxy/ui` components (a simple list).
3. **Integration**: When the user types `>clip`, the React shell dynamically imports `nuxy-ext://clipboard/frontend.js` and mounts the UI.

---

## 🎉 MVP Milestone Reached

At the end of Sprint 4, you have a working, blazingly fast desktop launcher that successfully isolates its logic into external plugins.

**Post-MVP (V1.0 Focus):**
Once the MVP is stable, you begin adding the "Pro" features iteratively:

1. Implement the AI Orchestrator (Ollama integration).
2. Enforce strict Chroot paths in `core.storage`.
3. Build the Vault and add the capabilities/permissions firewall.

---

## Related Documents

| Topic | Document | Notes |
| ----- | -------- | ----- |
| Gap analysis between design and reality | [pain-points-plan.md](./pain-points-plan.md) | Phased remediation plan aligned with MVP phases |
| Feature implementation status | [DOCUMENTATION.md](./DOCUMENTATION.md) | Implemented vs planned tracker |
| Full rebuild phases | [14-rebuild-roadmap.md](./14-rebuild-roadmap.md) | Longer-term execution plan beyond the MVP |
