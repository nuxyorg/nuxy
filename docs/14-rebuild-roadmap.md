# 14 - Rebuild Roadmap

This roadmap transitions the theoretical analysis into an actionable execution plan. Engineers should follow the Implementation guides in order.

## 1. Project Execution Phases

### Phase 1: Core Foundation & Tooling Setup

**Goal**: Establish the Empty Shell repository.

- Initialize Vite + React 18 + Electron template.
- Install Tailwind CSS and configure Shadcn UI components (to be used as the base canvas).
- Establish `tsconfig.json`, `eslint`, and `prettier`.
- **Actionable Guide**: [01. Setup](./implementation/01-setup.md)

### Phase 2: The Kernel & VM Sandbox

**Goal**: Build the secure `CoreContext`, routing mechanism, and directory scanner.

- Implement the `WindowManager` to handle invisible daemon status.
- Build the IPC router (`src/electron/ipc/register.ts`).
- Implement the `ExtensionScanner` to watch `~/.nuxy/extensions/`.
- Implement the Node `vm` sandbox to securely execute third-party backend code.
- **Actionable Guide**: [02. Core Infrastructure](./implementation/02-core-infrastructure.md)

### Phase 3: Building the First Extensions (Separate Repositories)

**Goal**: Prove the architecture by building the core features as completely standalone external extensions.

- Create new github repositories for `nuxy-ext-launcher`, `nuxy-ext-notes`, etc.
- Build the backend using `@nuxy/core` types.
- Build the frontend using React.
- Compile and drop them into the `~/.nuxy/extensions/` folder to watch Nuxy come alive.
- **Actionable Guide**: [03. Feature Implementation](./implementation/03-feature-implementation.md)

### Phase 4: Dynamic UI Integration

**Goal**: Connect the disparate external UIs onto the blank React canvas.

- Establish the dynamic React Router to `import('nuxy-ext://...')`.
- Register global OS hotkeys (`Alt+Space`) securely.
- **Actionable Guide**: [04. Integration](./implementation/04-integration.md)

### Phase 5: Hardening & Release

**Goal**: Ensure production readiness of the Shell.

- Apply Content Security Policies (CSP).
- Audit memory usage using Chromium DevTools.
- Configure `electron-builder` and CI/CD pipelines.
- **Actionable Guide**: [05. Final Polish](./implementation/05-final-polish.md)

---

**Next:** Jump straight to [Phase 1: Setup](./implementation/01-setup.md)

---

## Related Documents

| Topic | Document | Notes |
| ----- | -------- | ----- |
| MVP sprint plan | [19-mvp-roadmap.md](./19-mvp-roadmap.md) | Reduced scope to prove the paradigm in 2–3 weeks |
| Concrete remediation priorities | [pain-points-plan.md](./pain-points-plan.md) | Phased fix plan aligned with roadmap phases |
| Kernel audit and completed phases | [electron-fix-plan.md](./electron-fix-plan.md) | What has already been built and verified |
