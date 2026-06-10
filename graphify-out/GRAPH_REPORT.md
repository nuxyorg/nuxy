# Graph Report - . (2026-06-10)

## Corpus Check

- Corpus is ~6,159 words - fits in a single context window. You may not need a graph.

## Summary

- 70 nodes · 65 edges · 17 communities (7 shown, 10 thin omitted)
- Extraction: 78% EXTRACTED · 22% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)

- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]

## God Nodes (most connected - your core abstractions)

1. `Lit Remake: Electron & Renderer Analysis (05-electron-renderer.md)` - 9 edges
2. `Lit Rewrite Plan (06-yeniden-yazirim-plani.md)` - 8 edges
3. `Lit Remake: Shell Extension Analysis (01-shell.md)` - 6 edges
4. `Lit Remake: UI Components Analysis (02-ui-components.md)` - 6 edges
5. `Lit Remake: Packages/Core Analysis (03-packages-core.md)` - 6 edges
6. `Lit Remake: Bundled Extensions Analysis (04-extensions.md)` - 6 edges
7. `Lit Remake: General Overview (docs/lit-remake/00-genel-bakis.md)` - 5 edges
8. `Rewrite Phase 2: Shell Extension — ShellController Split into ReactiveControllers, NuxyShellViewElement → LitElement` - 5 edges
9. `Problem: ShellController 992-Line God Class` - 4 edges
10. `Problem: nuxy-shell-view.ts Extends HTMLElement, Not LitElement` - 4 edges

## Surprising Connections (you probably didn't know these)

- `Critical: host:call Promise Map Has No Timeout — Memory Leak` --semantically_similar_to--> `Critical: Worker IPC Promises Have No Timeout (Memory Leak)` [INFERRED] [semantically similar]
  /home/xava/Documents/nuxy/docs/lit-remake/03-packages-core.md → /home/xava/Documents/nuxy/docs/lit-remake/00-genel-bakis.md
- `Bug: preload.ts Dispatches nuxy:ready Even When contextBridge.exposeInMainWorld Fails` --semantically_similar_to--> `Critical: Preload Signal Fires Even on Error (nuxy:ready)` [INFERRED] [semantically similar]
  /home/xava/Documents/nuxy/docs/lit-remake/05-electron-renderer.md → /home/xava/Documents/nuxy/docs/lit-remake/00-genel-bakis.md
- `Problem: packages/ui Stubs Are Dead Code (window.UI Pattern Unused)` --semantically_similar_to--> `Problem: packages/ui Stub Layer is Practically Dead Code` [INFERRED] [semantically similar]
  /home/xava/Documents/nuxy/docs/lit-remake/03-packages-core.md → /home/xava/Documents/nuxy/docs/lit-remake/00-genel-bakis.md
- `Core Decisions: Lit + Shadow DOM, Static Styles, Remove h()/packages/ui/ce-utils, EXT_ID from manifest` --rationale_for--> `Problem: ceListItem/ceList/h() — Manually Reinventing JSX` [INFERRED]
  /home/xava/Documents/nuxy/docs/lit-remake/06-yeniden-yazirim-plani.md → /home/xava/Documents/nuxy/docs/lit-remake/00-genel-bakis.md
- `Rewrite Phase 2: Shell Extension — ShellController Split into ReactiveControllers, NuxyShellViewElement → LitElement` --rationale_for--> `Problem: nuxy-shell-view.ts Extends HTMLElement, Not LitElement` [INFERRED]
  /home/xava/Documents/nuxy/docs/lit-remake/06-yeniden-yazirim-plani.md → /home/xava/Documents/nuxy/docs/lit-remake/01-shell.md

## Import Cycles

- None detected.

## Hyperedges (group relationships)

- **Lit Remake: Three-Paradigm Codebase Problem (Vanilla CE + Partial Lit + Real Lit)** — lit_genel_three_paradigm_problem, lit_shell_view_vanilla_not_lit, lit_shell_dom_factory_antipattern [EXTRACTED 0.95]
- **IPC/Worker Timeout & Memory Leak Cluster (No Timeout → Zombie Workers)** — lit_core_host_call_timeout_missing, lit_electron_worker_no_timeout, lit_genel_ipc_promise_no_timeout [EXTRACTED 1.00]
- **Security-Critical Issues Requiring Fix: Path Traversal, eval(), innerHTML XSS** — lit_electron_protocol_path_traversal, lit_ext_calculator_eval_security, lit_shell_omnibar_innerhtml_xss [INFERRED 0.95]

## Communities (17 total, 10 thin omitted)

### Community 0 - "Community 0"

Cohesion: 0.17
Nodes (13): Anti-Pattern: ce-utils.ts h() — Hand-Written JSX Alternative (to Be Removed in Rewrite), Critical: host:call Promise Map Has No Timeout — Memory Leak, Problem: IPC Messages Have No Discriminator Field (kind/type), Problem: packages/ui Stubs Are Dead Code (window.UI Pattern Unused), Bug: two-panel-nav.ts Uses document.querySelectorAll Crossing Component Boundaries, Problem: Worker Startup Failure Logged But Not Marked Failed in Registry, Critical: Worker Threads Have No Timeout — Zombie Workers on Hang, Lit Remake: General Overview (docs/lit-remake/00-genel-bakis.md) (+5 more)

### Community 1 - "Community 1"

Cohesion: 0.20
Nodes (11): Problem: Bootstrap Sequence Race — Extensions Spawn After Window Opens, Problem: ipc/register.ts 600+ Line Monolith — All Handlers in One File, Bug: preload.ts Dispatches nuxy:ready Even When contextBridge.exposeInMainWorld Fails, Security: nuxy-ext:// Protocol No ext-id Validation — Directory Traversal Risk, Bug: renderer/bootstrap.ts Chain Has No Error Propagation (loadUiKit fail continues), Lit Remake: Electron & Renderer Analysis (05-electron-renderer.md), Problem: extensions/scanner.ts 612 Lines — Too Many Responsibilities, Bug: Scanner Accepts Manifests with Missing Required Fields (id can be undefined) (+3 more)

### Community 2 - "Community 2"

Cohesion: 0.29
Nodes (8): Critical: Lit Render Cycle vs Manual DOM Sync Clash (queueMicrotask vs updateComplete), Accessibility: nuxy-command-palette.ts No Focus Trap or role=dialog, Lit Remake: Shell Extension Analysis (01-shell.md), Anti-Pattern: shell-dom.ts — Imperative DOM Factory (Should be Lit Templates), Test Issue: pressOmnibarKey Workaround Concealed Real Bug, Security: nuxy-shell-omni-bar.ts innerHTML SVG Binding — XSS Risk, Bug: nuxy-shell-omni-bar.ts MutationObserver Infinite Loop, Problem: nuxy-shell-view.ts Extends HTMLElement, Not LitElement

### Community 3 - "Community 3"

Cohesion: 0.25
Nodes (8): Proposed Shared Utils: parse.ts, mirror-attrs.ts, host-classes.ts, focus-trap.ts, keyboard-nav.ts, Accessibility: ARIA Missing from Interactive Components (Checkbox, RadioGroup, Tooltip), Lit Remake: UI Components Analysis (02-ui-components.md), Problem: parseOptions() / parseNum() Duplicated Across 4+ Components, Problem: Shadow DOM vs Light DOM Inconsistency Across All Components, Problem: syncHostClasses() Repeated in Every Component, Security: Text/Heading unsafeHTML Dynamic Tag — XSS Risk, Problem: Layout-Only Components as Unnecessary Custom Elements (NuxyBadge, NuxyCard, etc.)

### Community 4 - "Community 4"

Cohesion: 0.29
Nodes (7): Security: calculator Extension Uses eval() — Expression Injection Risk, Problem: EXT_ID Hard-Coded in All Extensions (Should Come from extensionId Setter), Bug: nyaa Extension No AbortController — Parallel Fetch Accumulation, Bug: nyaa Extension .catch(() => {}) Silent Error Swallowing, Bug: settings State Race Condition — UI Updates Before Backend Confirmation, Bug: All Extensions Access window.core Without Null Check, Lit Remake: Bundled Extensions Analysis (04-extensions.md)

### Community 5 - "Community 5"

Cohesion: 0.33
Nodes (7): Core Decisions: Lit + Shadow DOM, Static Styles, Remove h()/packages/ui/ce-utils, EXT_ID from manifest, Lit Rewrite Plan (06-yeniden-yazirim-plani.md), Rewrite Phase 3: UI Component Library — Shadow DOM, Shared Utils, ARIA Checklist, Rewrite Phase 4: Extension Fixes — eval() removal, AbortController, async await fixes, Proposed: scanner.ts Split into 5 Modules (manifest-loader, worker-manager, theme-registrar, icon-registrar, dev-sync), Proposed SelectBox Split: nuxy-select-box + nuxy-select-dropdown + nuxy-select-option, Problem: SelectBox 210+ Lines Monolith — Multiple Responsibilities

### Community 6 - "Community 6"

Cohesion: 0.33
Nodes (6): Problem: ShellController 992-Line God Class, Proposed: NavigationController — Lit ReactiveController for selectedIndex/keyboard, Rewrite Phase 2: Shell Extension — ShellController Split into ReactiveControllers, NuxyShellViewElement → LitElement, Proposed: QueryController — Lit ReactiveController for Query State, Problem: ShellController 19-Field God State Object, Problem: bindGlobalKeyboard() 167-Line Method

## Knowledge Gaps

- **44 isolated node(s):** `Problem: Three Paradigms Running Simultaneously (Vanilla CE, Partial Lit, Real Lit)`, `Critical: Preload Signal Fires Even on Error (nuxy:ready)`, `Critical: Lit Render Cycle vs Manual DOM Sync Clash (queueMicrotask vs updateComplete)`, `Problem: Shell View render() 154-Line Monolith`, `Bug: nuxy-shell-omni-bar.ts MutationObserver Infinite Loop` (+39 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **Why does `Lit Rewrite Plan (06-yeniden-yazirim-plani.md)` connect `Community 5` to `Community 1`, `Community 3`, `Community 6`?**
  _High betweenness centrality (0.315) - this node is a cross-community bridge._
- **Why does `Rewrite Phase 2: Shell Extension — ShellController Split into ReactiveControllers, NuxyShellViewElement → LitElement` connect `Community 6` to `Community 2`, `Community 5`?**
  _High betweenness centrality (0.244) - this node is a cross-community bridge._
- **Why does `Lit Remake: Electron & Renderer Analysis (05-electron-renderer.md)` connect `Community 1` to `Community 0`?**
  _High betweenness centrality (0.163) - this node is a cross-community bridge._
- **What connects `Problem: Three Paradigms Running Simultaneously (Vanilla CE, Partial Lit, Real Lit)`, `Critical: Preload Signal Fires Even on Error (nuxy:ready)`, `Critical: Lit Render Cycle vs Manual DOM Sync Clash (queueMicrotask vs updateComplete)` to the rest of the system?**
  _44 weakly-connected nodes found - possible documentation gaps or missing edges._
