# Graph Report - . (2026-05-31)

## Corpus Check

- 449 files · ~203,132 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary

- 2792 nodes · 3826 edges · 306 communities (179 shown, 127 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 67 edges (avg confidence: 0.83)
- Token cost: 62,000 input · 19,000 output

## Issue Status Audit (checked 2026-06-01)

| Issue                                                         | Status                                                                                |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Import cycle: broker→worker-invoke→spawn→host-handlers→broker | ✅ FIXED — `worker-invoke.ts` now imports `active-workers.js`, cycle broken           |
| TypeScript 6 non-existent version (High)                      | ✅ FIXED — all packages on `^5.x.x`                                                   |
| `CoreContext.ipc.broadcast` unimplemented no-op               | ✅ FIXED — removed from interface                                                     |
| `CoreContext.registry` stub methods (registerTool etc.)       | ✅ FIXED — implemented in `core-proxy.ts:196-209`                                     |
| `migrateLegacyData` unbounded scan on every spawn             | ✅ FIXED — early-return guard when target dir exists                                  |
| Unsafe `BROKER_INVOKE` cast in host-handlers.ts               | ✅ FIXED — runtime validation guard before cast                                       |
| `prefers-reduced-motion` missing support                      | ✅ FIXED — `shell.css:314`, `shell.css:640`                                           |
| `transition:all` performance issue in CSS                     | ✅ FIXED — no instances found                                                         |
| Extension scan blocks window creation                         | ⚠️ OPEN — `scanExtensions()` still runs before `createMainWindow()` (`main.ts:91-94`) |
| `window.UI = {} as any`                                       | ⚠️ OPEN — `src/renderer/main.tsx:11`                                                  |
| `HostToWorkerMessage` missing `type` discriminant             | ⚠️ OPEN — second variant `{ id, channel, payload }` is not discriminated              |
| Duplicate `ExtensionModule` interface (sdk vs host)           | ⚠️ OPEN — `extension-sdk/src/index.ts:15` + `load-extension.ts:8`                     |
| IPC channel casing inconsistency                              | ⚠️ OPEN                                                                               |
| Shell CSS class namespace collision risk                      | ⚠️ OPEN                                                                               |
| TypeScript runtime dependency in protocol transpiler          | ⚠️ OPEN                                                                               |
| Hardcoded px / CSS design tokens gap                          | ⚠️ OPEN                                                                               |
| Accessibility gaps (ARIA roles, keyboard semantics)           | ⚠️ OPEN                                                                               |

## Community Hubs (Navigation)

- [[_COMMUNITY_Default Icon Registry|Default Icon Registry]]
- [[_COMMUNITY_E2E Test Infrastructure|E2E Test Infrastructure]]
- [[_COMMUNITY_UI Extension Icons|UI Extension Icons]]
- [[_COMMUNITY_Electron App Bootstrap|Electron App Bootstrap]]
- [[_COMMUNITY_@nuxyui Icon Library|@nuxy/ui Icon Library]]
- [[_COMMUNITY_Package Dependencies|Package Dependencies]]
- [[_COMMUNITY_Extension Scanner|Extension Scanner]]
- [[_COMMUNITY_Shell UI Frontend Bundle|Shell UI Frontend Bundle]]
- [[_COMMUNITY_Extension Registry & Kernel|Extension Registry & Kernel]]
- [[_COMMUNITY_Settings Extension|Settings Extension]]
- [[_COMMUNITY_Ocean Theme|Ocean Theme]]
- [[_COMMUNITY_Glassmorphism Theme|Glassmorphism Theme]]
- [[_COMMUNITY_Media Provider System|Media Provider System]]
- [[_COMMUNITY_Extension Manifests Overview|Extension Manifests Overview]]
- [[_COMMUNITY_IPC Permissions & Core|IPC Permissions & Core]]
- [[_COMMUNITY_UI Code Display Components|UI Code Display Components]]
- [[_COMMUNITY_Emoji Picker Extension|Emoji Picker Extension]]
- [[_COMMUNITY_Root Package Config|Root Package Config]]
- [[_COMMUNITY_Extension Backend Tests|Extension Backend Tests]]
- [[_COMMUNITY_Shell UI Bundle (2)|Shell UI Bundle (2)]]
- [[_COMMUNITY_Chat Message UI|Chat Message UI]]
- [[_COMMUNITY_Notes Extension|Notes Extension]]
- [[_COMMUNITY_Calendar Key Conditions|Calendar Key Conditions]]
- [[_COMMUNITY_@nuxyui Components|@nuxy/ui Components]]
- [[_COMMUNITY_Scan Report Details|Scan Report Details]]
- [[_COMMUNITY_Extensions TSConfig|Extensions TSConfig]]
- [[_COMMUNITY_Shell Extension Frontend|Shell Extension Frontend]]
- [[_COMMUNITY_Time Calculator Extension|Time Calculator Extension]]
- [[_COMMUNITY_Bitwarden Extension|Bitwarden Extension]]
- [[_COMMUNITY_Src TSConfig|Src TSConfig]]
- [[_COMMUNITY_Video Downloader Extension|Video Downloader Extension]]
- [[_COMMUNITY_Window Spring Physics|Window Spring Physics]]
- [[_COMMUNITY_Calendar Frontend|Calendar Frontend]]
- [[_COMMUNITY_AI Orchestrator Extension|AI Orchestrator Extension]]
- [[_COMMUNITY_Ollama Extension|Ollama Extension]]
- [[_COMMUNITY_Config Paths & Migration|Config Paths & Migration]]
- [[_COMMUNITY_Extension Host Package|Extension Host Package]]
- [[_COMMUNITY_Calendar Utilities|Calendar Utilities]]
- [[_COMMUNITY_n8n Extension|n8n Extension]]
- [[_COMMUNITY_Root TSConfig|Root TSConfig]]
- [[_COMMUNITY_Theme Registry|Theme Registry]]
- [[_COMMUNITY_UI Grid Components|UI Grid Components]]
- [[_COMMUNITY_Ollama Manifest|Ollama Manifest]]
- [[_COMMUNITY_Vault & Auth Security|Vault & Auth Security]]
- [[_COMMUNITY_Performance Docs|Performance Docs]]
- [[_COMMUNITY_Clipboard Frontend|Clipboard Frontend]]
- [[_COMMUNITY_E2E Run Cache|E2E Run Cache]]
- [[_COMMUNITY_UI Default Package|UI Default Package]]
- [[_COMMUNITY_UI Navigation Hooks|UI Navigation Hooks]]
- [[_COMMUNITY_Shell Manifest|Shell Manifest]]
- [[_COMMUNITY_Time Calculator Manifest|Time Calculator Manifest]]
- [[_COMMUNITY_Video Downloader Manifest|Video Downloader Manifest]]
- [[_COMMUNITY_AI Orchestrator Manifest|AI Orchestrator Manifest]]
- [[_COMMUNITY_Angrysearch Manifest|Angrysearch Manifest]]
- [[_COMMUNITY_Calendar Manifest|Calendar Manifest]]
- [[_COMMUNITY_Clipboard Manifest|Clipboard Manifest]]
- [[_COMMUNITY_Planned Extensions Docs|Planned Extensions Docs]]
- [[_COMMUNITY_Emoji Picker Manifest|Emoji Picker Manifest]]
- [[_COMMUNITY_Bitwarden Manifest|Bitwarden Manifest]]
- [[_COMMUNITY_Calculator Manifest|Calculator Manifest]]
- [[_COMMUNITY_n8n Manifest|n8n Manifest]]
- [[_COMMUNITY_Notes Manifest|Notes Manifest]]
- [[_COMMUNITY_Angrysearch Backend|Angrysearch Backend]]
- [[_COMMUNITY_@nuxyui Navigation Hooks|@nuxy/ui Navigation Hooks]]
- [[_COMMUNITY_Settings Manifest|Settings Manifest]]
- [[_COMMUNITY_Ext Template Manifest|Ext Template Manifest]]
- [[_COMMUNITY_Gradient Manifest|Gradient Manifest]]
- [[_COMMUNITY_Calendar Backend Tests|Calendar Backend Tests]]
- [[_COMMUNITY_@nuxyui Table|@nuxy/ui Table]]
- [[_COMMUNITY_Extension System V2 Docs|Extension System V2 Docs]]
- [[_COMMUNITY_Scan Report Summary|Scan Report Summary]]
- [[_COMMUNITY_Architecture Security Docs|Architecture Security Docs]]
- [[_COMMUNITY_Data Flow & Frontend Docs|Data Flow & Frontend Docs]]
- [[_COMMUNITY_Dead Code Reports|Dead Code Reports]]
- [[_COMMUNITY_Database Design Docs|Database Design Docs]]
- [[_COMMUNITY_Calendar Create Form|Calendar Create Form]]
- [[_COMMUNITY_Calendar Backend|Calendar Backend]]
- [[_COMMUNITY_Extension SDK Package|Extension SDK Package]]
- [[_COMMUNITY_Extension Guide Docs|Extension Guide Docs]]
- [[_COMMUNITY_Toaster UI Component|Toaster UI Component]]
- [[_COMMUNITY_Zero Trust Docs|Zero Trust Docs]]
- [[_COMMUNITY_Extension Host Deps|Extension Host Deps]]
- [[_COMMUNITY_Logger Module|Logger Module]]
- [[_COMMUNITY_Icon Registry|Icon Registry]]
- [[_COMMUNITY_Ext Template Package|Ext Template Package]]
- [[_COMMUNITY_UI Package Config|UI Package Config]]
- [[_COMMUNITY_Architecture Refactor Docs|Architecture Refactor Docs]]
- [[_COMMUNITY_Dev Extension Scripts|Dev Extension Scripts]]
- [[_COMMUNITY_Settings E2E Tests|Settings E2E Tests]]
- [[_COMMUNITY_CI Workflow|CI Workflow]]
- [[_COMMUNITY_MVP Roadmap Docs|MVP Roadmap Docs]]
- [[_COMMUNITY_Calculator Extension|Calculator Extension]]
- [[_COMMUNITY_Clipboard Backend|Clipboard Backend]]
- [[_COMMUNITY_UI Card (ext)|UI Card (ext)]]
- [[_COMMUNITY_UI Card (pkg)|UI Card (pkg)]]
- [[_COMMUNITY_Type Safety Reports|Type Safety Reports]]
- [[_COMMUNITY_Project Analysis Docs|Project Analysis Docs]]
- [[_COMMUNITY_UI Default Manifest|UI Default Manifest]]
- [[_COMMUNITY_Logging Docs|Logging Docs]]
- [[_COMMUNITY_IPC Register Docs|IPC Register Docs]]
- [[_COMMUNITY_@nuxycore Package|@nuxy/core Package]]
- [[_COMMUNITY_Overview Tenets Docs|Overview Tenets Docs]]
- [[_COMMUNITY_@nuxyui Toaster|@nuxy/ui Toaster]]
- [[_COMMUNITY_Icons Default Manifest|Icons Default Manifest]]
- [[_COMMUNITY_UI Dropdown (ext)|UI Dropdown (ext)]]
- [[_COMMUNITY_UI Dropdown (pkg)|UI Dropdown (pkg)]]
- [[_COMMUNITY_Scratch Test Watcher|Scratch Test Watcher]]
- [[_COMMUNITY_Glassmorphism Manifest|Glassmorphism Manifest]]
- [[_COMMUNITY_Ocean Theme Manifest|Ocean Theme Manifest]]
- [[_COMMUNITY_AI Orchestrator Package|AI Orchestrator Package]]
- [[_COMMUNITY_Bitwarden Package|Bitwarden Package]]
- [[_COMMUNITY_Calculator Package|Calculator Package]]
- [[_COMMUNITY_Calendar Package|Calendar Package]]
- [[_COMMUNITY_Preload & Window API|Preload & Window API]]
- [[_COMMUNITY_Clipboard Package|Clipboard Package]]
- [[_COMMUNITY_System Analysis Docs|System Analysis Docs]]
- [[_COMMUNITY_Error Handling Docs|Error Handling Docs]]
- [[_COMMUNITY_Modules Capabilities Docs|Modules Capabilities Docs]]
- [[_COMMUNITY_Hardcoded PX Report|Hardcoded PX Report]]
- [[_COMMUNITY_Emoji Picker Package|Emoji Picker Package]]
- [[_COMMUNITY_Ollama Package|Ollama Package]]
- [[_COMMUNITY_Extension Seed Paths|Extension Seed Paths]]
- [[_COMMUNITY_Angrysearch Tests|Angrysearch Tests]]
- [[_COMMUNITY_Shell UI Bundle (3)|Shell UI Bundle (3)]]
- [[_COMMUNITY_UI Avatar (ext)|UI Avatar (ext)]]
- [[_COMMUNITY_UI Progress (ext)|UI Progress (ext)]]
- [[_COMMUNITY_UI Media Preview|UI Media Preview]]
- [[_COMMUNITY_n8n Package|n8n Package]]
- [[_COMMUNITY_Notes Package|Notes Package]]
- [[_COMMUNITY_UI Avatar (pkg)|UI Avatar (pkg)]]
- [[_COMMUNITY_UI Circular Progress (pkg)|UI Circular Progress (pkg)]]
- [[_COMMUNITY_Future Evolution Docs|Future Evolution Docs]]
- [[_COMMUNITY_Time Calculator Package|Time Calculator Package]]
- [[_COMMUNITY_Video Downloader Package|Video Downloader Package]]
- [[_COMMUNITY_Features Extension List|Features Extension List]]
- [[_COMMUNITY_Extension V2 UI Docs|Extension V2 UI Docs]]
- [[_COMMUNITY_Shell Result Card|Shell Result Card]]
- [[_COMMUNITY_Inline CSS Scripts|Inline CSS Scripts]]
- [[_COMMUNITY_UI Collapsible (ext)|UI Collapsible (ext)]]
- [[_COMMUNITY_UI Alert Dialog (ext)|UI Alert Dialog (ext)]]
- [[_COMMUNITY_UI Text (ext)|UI Text (ext)]]
- [[_COMMUNITY_UI Collapsible (pkg)|UI Collapsible (pkg)]]
- [[_COMMUNITY_UI Text (pkg)|UI Text (pkg)]]
- [[_COMMUNITY_Scan AI Orchestrator|Scan AI Orchestrator]]
- [[_COMMUNITY_Scan Calculator|Scan Calculator]]
- [[_COMMUNITY_Scan Calendar|Scan Calendar]]
- [[_COMMUNITY_Scan Clipboard|Scan Clipboard]]
- [[_COMMUNITY_Scan Gradient|Scan Gradient]]
- [[_COMMUNITY_Scan Icons Default|Scan Icons Default]]
- [[_COMMUNITY_Scan Notes|Scan Notes]]
- [[_COMMUNITY_Scan Ollama|Scan Ollama]]
- [[_COMMUNITY_Scan Settings|Scan Settings]]
- [[_COMMUNITY_Scan Glassmorphism|Scan Glassmorphism]]
- [[_COMMUNITY_Scan Ocean Theme|Scan Ocean Theme]]
- [[_COMMUNITY_Scan Time Calculator|Scan Time Calculator]]
- [[_COMMUNITY_Scan Video Downloader|Scan Video Downloader]]
- [[_COMMUNITY_Agents & Gnome Docs|Agents & Gnome Docs]]
- [[_COMMUNITY_Extension Access Docs|Extension Access Docs]]
- [[_COMMUNITY_Implementation Plan|Implementation Plan]]
- [[_COMMUNITY_Naming Report|Naming Report]]
- [[_COMMUNITY_UI Label (ext)|UI Label (ext)]]
- [[_COMMUNITY_UI Stack (ext)|UI Stack (ext)]]
- [[_COMMUNITY_UI Code (pkg)|UI Code (pkg)]]
- [[_COMMUNITY_UI Grid (pkg)|UI Grid (pkg)]]
- [[_COMMUNITY_UI Label (pkg)|UI Label (pkg)]]
- [[_COMMUNITY_UI Stack (pkg)|UI Stack (pkg)]]
- [[_COMMUNITY_Scan Extensions Config|Scan Extensions Config]]
- [[_COMMUNITY_Extensions Review Docs|Extensions Review Docs]]
- [[_COMMUNITY_Shell Package|Shell Package]]
- [[_COMMUNITY_Testing Strategy Docs|Testing Strategy Docs]]
- [[_COMMUNITY_Gradient Frontend|Gradient Frontend]]
- [[_COMMUNITY_Shell Utils|Shell Utils]]
- [[_COMMUNITY_Shell UI Bundle (4)|Shell UI Bundle (4)]]
- [[_COMMUNITY_UI Callout (ext)|UI Callout (ext)]]
- [[_COMMUNITY_UI Breadcrumb (ext)|UI Breadcrumb (ext)]]
- [[_COMMUNITY_UI Heading (ext)|UI Heading (ext)]]
- [[_COMMUNITY_UI List (ext)|UI List (ext)]]
- [[_COMMUNITY_UI List Item Text (ext)|UI List Item Text (ext)]]
- [[_COMMUNITY_UI Radio Group (ext)|UI Radio Group (ext)]]
- [[_COMMUNITY_UI Select Box (ext)|UI Select Box (ext)]]
- [[_COMMUNITY_UI Shortcut Hint (ext)|UI Shortcut Hint (ext)]]
- [[_COMMUNITY_UI Tabs (ext)|UI Tabs (ext)]]
- [[_COMMUNITY_UI Stepper (ext)|UI Stepper (ext)]]
- [[_COMMUNITY_UI Tooltip (ext)|UI Tooltip (ext)]]
- [[_COMMUNITY_UI Spinner (ext)|UI Spinner (ext)]]
- [[_COMMUNITY_UI Default Vite Config|UI Default Vite Config]]
- [[_COMMUNITY_UI Breadcrumb (pkg)|UI Breadcrumb (pkg)]]
- [[_COMMUNITY_UI Heading (pkg)|UI Heading (pkg)]]
- [[_COMMUNITY_UI Radio Group (pkg)|UI Radio Group (pkg)]]
- [[_COMMUNITY_UI Select Box (pkg)|UI Select Box (pkg)]]
- [[_COMMUNITY_UI Shortcut Hint (pkg)|UI Shortcut Hint (pkg)]]
- [[_COMMUNITY_UI Tab Bar (pkg)|UI Tab Bar (pkg)]]
- [[_COMMUNITY_UI Tabs (pkg)|UI Tabs (pkg)]]
- [[_COMMUNITY_UI Stepper (pkg)|UI Stepper (pkg)]]
- [[_COMMUNITY_UI Tooltip (pkg)|UI Tooltip (pkg)]]
- [[_COMMUNITY_UI Scroll Utils (pkg)|UI Scroll Utils (pkg)]]
- [[_COMMUNITY_Declarative Keyboard API|Declarative Keyboard API]]
- [[_COMMUNITY_Scratch Transpile|Scratch Transpile]]
- [[_COMMUNITY_Scratch Update Timeouts|Scratch Update Timeouts]]
- [[_COMMUNITY_VSCode Settings|VSCode Settings]]
- [[_COMMUNITY_Claude Settings Local|Claude Settings Local]]
- [[_COMMUNITY_Claude Settings Global|Claude Settings Global]]
- [[_COMMUNITY_Advanced Capabilities Docs|Advanced Capabilities Docs]]
- [[_COMMUNITY_Dependency Report|Dependency Report]]
- [[_COMMUNITY_Redundant Tests Audit|Redundant Tests Audit]]
- [[_COMMUNITY_Ext Template Frontend|Ext Template Frontend]]
- [[_COMMUNITY_Shell UI Bundle (5)|Shell UI Bundle (5)]]
- [[_COMMUNITY_Shell UI Bundle (6)|Shell UI Bundle (6)]]
- [[_COMMUNITY_UI Alert (ext)|UI Alert (ext)]]
- [[_COMMUNITY_UI Badge (ext)|UI Badge (ext)]]
- [[_COMMUNITY_UI Box (ext)|UI Box (ext)]]
- [[_COMMUNITY_UI Button (ext)|UI Button (ext)]]
- [[_COMMUNITY_UI Checkbox (ext)|UI Checkbox (ext)]]
- [[_COMMUNITY_UI Divider (ext)|UI Divider (ext)]]
- [[_COMMUNITY_UI Empty State (ext)|UI Empty State (ext)]]
- [[_COMMUNITY_UI File Input (ext)|UI File Input (ext)]]
- [[_COMMUNITY_UI Icon Button (ext)|UI Icon Button (ext)]]
- [[_COMMUNITY_UI Item Leading (ext)|UI Item Leading (ext)]]
- [[_COMMUNITY_UI Kbd (ext)|UI Kbd (ext)]]
- [[_COMMUNITY_UI Link (ext)|UI Link (ext)]]
- [[_COMMUNITY_UI List Item Actions (ext)|UI List Item Actions (ext)]]
- [[_COMMUNITY_UI List Item Body (ext)|UI List Item Body (ext)]]
- [[_COMMUNITY_UI List Item Meta (ext)|UI List Item Meta (ext)]]
- [[_COMMUNITY_UI Number Input (ext)|UI Number Input (ext)]]
- [[_COMMUNITY_UI Pin Input (ext)|UI Pin Input (ext)]]
- [[_COMMUNITY_UI Scroll Area (ext)|UI Scroll Area (ext)]]
- [[_COMMUNITY_UI Search Input (ext)|UI Search Input (ext)]]
- [[_COMMUNITY_UI Shortcut Bar (ext)|UI Shortcut Bar (ext)]]
- [[_COMMUNITY_UI Skeleton (ext)|UI Skeleton (ext)]]
- [[_COMMUNITY_UI Slider (ext)|UI Slider (ext)]]
- [[_COMMUNITY_UI Switch (ext)|UI Switch (ext)]]
- [[_COMMUNITY_UI Tabs Pagination (ext)|UI Tabs Pagination (ext)]]
- [[_COMMUNITY_UI Tag (ext)|UI Tag (ext)]]
- [[_COMMUNITY_UI Aspect Ratio (ext)|UI Aspect Ratio (ext)]]
- [[_COMMUNITY_UI Portal (ext)|UI Portal (ext)]]
- [[_COMMUNITY_UI Visually Hidden (ext)|UI Visually Hidden (ext)]]
- [[_COMMUNITY_UI Textarea (ext)|UI Textarea (ext)]]
- [[_COMMUNITY_UI Two Panel (ext)|UI Two Panel (ext)]]
- [[_COMMUNITY_Calculator Missing Types|Calculator Missing Types]]
- [[_COMMUNITY_nuxy.sh Entry|nuxy.sh Entry]]
- [[_COMMUNITY_Icons Default Data|Icons Default Data]]
- [[_COMMUNITY_Nuxy Scratch|Nuxy Scratch]]
- [[_COMMUNITY_Ollama Settings|Ollama Settings]]
- [[_COMMUNITY_UI Alert (pkg)|UI Alert (pkg)]]
- [[_COMMUNITY_UI Badge (pkg)|UI Badge (pkg)]]
- [[_COMMUNITY_UI Box (pkg)|UI Box (pkg)]]
- [[_COMMUNITY_UI Button (pkg)|UI Button (pkg)]]
- [[_COMMUNITY_UI Callout (pkg)|UI Callout (pkg)]]
- [[_COMMUNITY_UI Copy Button (pkg)|UI Copy Button (pkg)]]
- [[_COMMUNITY_UI Empty State (pkg)|UI Empty State (pkg)]]
- [[_COMMUNITY_UI File Input (pkg)|UI File Input (pkg)]]
- [[_COMMUNITY_UI Icon Button (pkg)|UI Icon Button (pkg)]]
- [[_COMMUNITY_UI Item Leading (pkg)|UI Item Leading (pkg)]]
- [[_COMMUNITY_UI Kbd (pkg)|UI Kbd (pkg)]]
- [[_COMMUNITY_UI Link (pkg)|UI Link (pkg)]]
- [[_COMMUNITY_UI List (pkg)|UI List (pkg)]]
- [[_COMMUNITY_UI List Item (pkg)|UI List Item (pkg)]]
- [[_COMMUNITY_UI List Item Actions (pkg)|UI List Item Actions (pkg)]]
- [[_COMMUNITY_UI List Item Body (pkg)|UI List Item Body (pkg)]]
- [[_COMMUNITY_UI List Item Text (pkg)|UI List Item Text (pkg)]]
- [[_COMMUNITY_UI Alert Dialog (pkg)|UI Alert Dialog (pkg)]]
- [[_COMMUNITY_UI Modal (pkg)|UI Modal (pkg)]]
- [[_COMMUNITY_UI Number Input (pkg)|UI Number Input (pkg)]]
- [[_COMMUNITY_UI Progress Bar (pkg)|UI Progress Bar (pkg)]]
- [[_COMMUNITY_UI Scroll Area (pkg)|UI Scroll Area (pkg)]]
- [[_COMMUNITY_UI Search Input (pkg)|UI Search Input (pkg)]]
- [[_COMMUNITY_UI Section Header (pkg)|UI Section Header (pkg)]]
- [[_COMMUNITY_UI Shortcut Bar (pkg)|UI Shortcut Bar (pkg)]]
- [[_COMMUNITY_UI Slider (pkg)|UI Slider (pkg)]]
- [[_COMMUNITY_UI Spinner (pkg)|UI Spinner (pkg)]]
- [[_COMMUNITY_UI Switch (pkg)|UI Switch (pkg)]]
- [[_COMMUNITY_UI Tabs Pagination (pkg)|UI Tabs Pagination (pkg)]]
- [[_COMMUNITY_UI Tag (pkg)|UI Tag (pkg)]]
- [[_COMMUNITY_UI Aspect Ratio (pkg)|UI Aspect Ratio (pkg)]]
- [[_COMMUNITY_UI Portal (pkg)|UI Portal (pkg)]]
- [[_COMMUNITY_UI Textarea (pkg)|UI Textarea (pkg)]]
- [[_COMMUNITY_UI Two Panel (pkg)|UI Two Panel (pkg)]]
- [[_COMMUNITY_Robust Reset Script|Robust Reset Script]]
- [[_COMMUNITY_Video Downloader Settings|Video Downloader Settings]]
- [[_COMMUNITY_Deployment & CICD Docs|Deployment & CI/CD Docs]]
- [[_COMMUNITY_Shell UI Bundle (7)|Shell UI Bundle (7)]]
- [[_COMMUNITY_Shell UI Bundle (8)|Shell UI Bundle (8)]]
- [[_COMMUNITY_Renderer Env Types|Renderer Env Types]]
- [[_COMMUNITY_Tool Extension Type|Tool Extension Type]]
- [[_COMMUNITY_Theme Extension Type|Theme Extension Type]]
- [[_COMMUNITY_Iconpack Extension Type|Iconpack Extension Type]]
- [[_COMMUNITY_Settings Feature|Settings Feature]]
- [[_COMMUNITY_Vite Config|Vite Config]]
- [[_COMMUNITY_Eksik Missing Features|Eksik Missing Features]]
- [[_COMMUNITY_Changelog 2026-05-18|Changelog 2026-05-18]]
- [[_COMMUNITY_Backward Compat|Backward Compat]]
- [[_COMMUNITY_NowPlaying Indirection|NowPlaying Indirection]]
- [[_COMMUNITY_Notes Extension Analysis|Notes Extension Analysis]]
- [[_COMMUNITY_Angrysearch Analysis|Angrysearch Analysis]]
- [[_COMMUNITY_Bitwarden Analysis|Bitwarden Analysis]]
- [[_COMMUNITY_Clipboard Analysis|Clipboard Analysis]]
- [[_COMMUNITY_Monorepo Scaffold Doc|Monorepo Scaffold Doc]]
- [[_COMMUNITY_TSConfig Strict Doc|TSConfig Strict Doc]]
- [[_COMMUNITY_CICD Pipeline Doc|CI/CD Pipeline Doc]]
- [[_COMMUNITY_Extensions README|Extensions README]]

## God Nodes (most connected - your core abstractions)

1. `icons` - 50 edges
2. `mergeProps()` - 44 edges
3. `CoreContext` - 38 edges
4. `v()` - 35 edges
5. `createMockCore()` - 29 edges
6. `scanExtensions()` - 24 edges
7. `entry` - 23 edges
8. `kernelLogger` - 20 edges
9. `permissions` - 19 edges
10. `tokens` - 19 edges

## Surprising Connections (you probably didn't know these)

- `Worker Thread Isolation` --semantically_similar_to--> `Hardware-Level Thread Isolation` [INFERRED] [semantically similar]
  features.md → docs/10-security.md
- `CoreContext (Implementation Spec)` --semantically_similar_to--> `CoreContext API Reference` [INFERRED] [semantically similar]
  docs/implementation/02-core-infrastructure.md → extensions/EXTENSION_GUIDE.md
- `Gnome-Style Extension Architecture` --semantically_similar_to--> `Isolated V8 Worker Threads` [INFERRED] [semantically similar]
  agents.md → docs/02-architecture.md
- `Zero-Trust Permission Model` --semantically_similar_to--> `Manifest Rules` [INFERRED] [semantically similar]
  docs/project-analysis/01-general-overview.md → extensions/EXTENSION_GUIDE.md
- `Zero-Trust Permission Model` --semantically_similar_to--> `Strict Permission Policy` [INFERRED] [semantically similar]
  docs/project-analysis/01-general-overview.md → extensions/MANIFEST_GUIDE.md

## Import Cycles

- ~~4-file cycle: `src/electron/ipc/broker.ts -> src/electron/ipc/worker-invoke.ts -> src/electron/spawn/spawn.ts -> src/electron/spawn/host-handlers.ts -> src/electron/ipc/broker.ts`~~ **FIXED** — `worker-invoke.ts` now imports `active-workers.js` instead of `spawn.ts`, breaking the cycle (2026-06-01)

## Hyperedges (group relationships)

- **Kernel Security Isolation Triad: Worker Threads + Chroot Storage + Cross-Module Broker** — features_worker_thread_isolation, docs_10_chroot_storage, docs_10_cross_module_security, docs_02_message_broker [EXTRACTED 0.95]
- **Extension Bootstrap Flow: Scanner -> Spawn -> Worker -> CoreContext** — claude_extension_scanner, claude_spawn_ts, claude_extension_host_package, claude_corecontext [EXTRACTED 0.95]
- **Planned Extensions Shared Infrastructure: Encrypted Storage + Notification Bridge** — docs_planned_encrypted_storage, docs_planned_notification_bridge, docs_planned_calendar, docs_planned_n8n, docs_planned_notes [EXTRACTED 0.95]
- **Extension Security Triad: Worker Isolation + CoreContext Proxy + Zero-Trust** — docs_01_sysanalysis_v8sandbox, docs_15_pluginsystem_messageport, docs_00_overview_zerotrusttenet, docs_21_extaccess_blockedaccess [INFERRED 0.95]
- **Omni-Input Routing: Provider fan-out + Tool invocation + Orchestrator fallback** — docs_16_omni_tooltype, docs_16_omni_providertype, docs_16_omni_orchestratortype, docs_16_omni_omnibararbitration [EXTRACTED 1.00]
- **MVP Milestone Sequence: Shell → Engine → Provider → Tool** — docs_impl_plan_milestone1, docs_impl_plan_milestone2, docs_impl_plan_milestone3, docs_impl_plan_milestone4 [EXTRACTED 1.00]
- **9-Agent Parallel Cleanup Audit (2026-05-19)** — docs_master_cleanup_summary_doc, docs_dead_code_report_doc, docs_dep_report_doc, docs_naming_report_doc, docs_doc_audit_report_doc, docs_ui_cleanup_report_doc, docs_perf_report_doc [EXTRACTED 1.00]
- **MVP Sprint Sequence (Sprint 1-4)** — docs_19_mvp_roadmap_sprint1, docs_19_mvp_roadmap_sprint2, docs_19_mvp_roadmap_sprint3, docs_19_mvp_roadmap_sprint4 [EXTRACTED 1.00]
- **Extension Security Model (Chroot + Worker Isolation + Permissions)** — docs_07_database_design_chroot_jail, docs_17_frontend_extensions_frontend_security, docs_changelog_20260519_permissions_ts, docs_04_modules_capabilities [INFERRED 0.85]
- **Type Safety Problem Triad: renderer, worker protocol, CoreContext** — docs_architecture_refactor_plan_renderer_any_cast, docs_architecture_refactor_plan_untyped_worker_protocol, docs_types_type_safety_report_corecontext_unknown [INFERRED 0.85]
- **Extension Authoring Contract: Guide + Manifest + Checklist** — extensions_extension_guide_document, extensions_manifest_guide_document, extensions_extension_guide_checklist [INFERRED 0.95]
- **Implementation Phases 1-5 Sequential Build** — docs_implementation_01_setup_document, docs_implementation_02_core_infra_document, docs_implementation_03_feature_impl_document, docs_implementation_04_integration_document, docs_implementation_05_final_polish_document [EXTRACTED 1.00]

## Communities (306 total, 127 thin omitted)

### Community 0 - "Default Icon Registry"

Cohesion: 0.04
Nodes (50): icons, ai, arrow-left, arrow-right, bitwarden, calculator, calendar, check (+42 more)

### Community 1 - "E2E Test Infrastructure"

Cohesion: 0.06
Nodes (27): APP_DIR, createTestDataDir(), \_\_dirname, ELECTRON_BIN, ElectronTestFixtures, ElectronWorkerFixtures, launchApp(), PROJECT_ROOT (+19 more)

### Community 2 - "UI Extension Icons"

Cohesion: 0.08
Nodes (46): IconArchive(), IconArrowLeft(), IconArrowRight(), IconBell(), IconCalendar(), IconCheck(), IconChevronDown(), IconChevronUp() (+38 more)

### Community 3 - "Electron App Bootstrap"

Cohesion: 0.09
Nodes (36): gotTheLock, log, DEFAULTS, EscAction, getConfig(), getWindowPosition(), loadConfig(), log (+28 more)

### Community 5 - "Package Dependencies"

Cohesion: 0.05
Nodes (42): author, dependencies, adm-zip, dbus-next, typescript, description, devDependencies, autoprefixer (+34 more)

### Community 6 - "Extension Scanner"

Cohesion: 0.11
Nodes (37): activeWatchers, ALLOWED_PERMISSIONS, BUILTIN_LIST, clearWatchers(), log, promptTrustPublisherKey(), rescanExtensions(), scanDirectoryForNodeImports() (+29 more)

### Community 8 - "Extension Registry & Kernel"

Cohesion: 0.13
Nodes (28): sample, byId, clearRegistry(), folderToId, getDisplayName(), getExtensionById(), getExtensionFolder(), ipcChannelsByExtId (+20 more)

### Community 9 - "Settings Extension"

Cohesion: 0.07
Nodes (33): DEFAULT, register(), createCore(), DEFAULT_SETTINGS, BOOL_OPTIONS, DEFAULT_SETTINGS, ESC_ACTION_OPTIONS, FONT_OPTIONS_STATIC (+25 more)

### Community 10 - "Ocean Theme"

Cohesion: 0.05
Nodes (37): colors, bg-base, scrollbar-thumb, scrollbar-thumb-hover, syntax-comment, syntax-constant, syntax-deprecated, syntax-function (+29 more)

### Community 11 - "Glassmorphism Theme"

Cohesion: 0.05
Nodes (37): colors, bg-base, scrollbar-thumb, scrollbar-thumb-hover, syntax-comment, syntax-constant, syntax-deprecated, syntax-function (+29 more)

### Community 12 - "Media Provider System"

Cohesion: 0.11
Nodes (24): createDarwinMediaProvider(), createLinuxMediaProvider(), DbusModule, getMprisNowPlaying(), getSessionBus(), listMprisBusNames(), log, MessageBus (+16 more)

### Community 13 - "Extension Manifests Overview"

Cohesion: 0.23
Nodes (37): manifest, manifest, manifest, manifest, manifest, callable, caller, manifest (+29 more)

### Community 14 - "IPC Permissions & Core"

Cohesion: 0.11
Nodes (23): assertHostPermission(), effectivePermissions(), HOST_CHANNEL_PERMISSION, base, resolveStoragePath(), HostCallReply, log, HostChannel (+15 more)

### Community 15 - "UI Code Display Components"

Cohesion: 0.07
Nodes (23): CodeBlock(), CodeBlockProps, CodeProps, CopyButtonProps, MarkdownText(), MarkdownTextProps, DataListItem, DataListProps (+15 more)

### Community 16 - "Emoji Picker Extension"

Cohesion: 0.07
Nodes (11): register(), NavSection, Props, TwoPanelNav, UseTwoPanelNavOptions, CopyResult, EmojiCategory, EmojiEntry (+3 more)

### Community 17 - "Root Package Config"

Cohesion: 0.06
Nodes (31): author, description, devDependencies, adm-zip, prettier, @types/adm-zip, typescript, devEngines (+23 more)

### Community 18 - "Extension Backend Tests"

Cohesion: 0.11
Nodes (17): createCore(), ExecFn, freshBackend(), createCore(), Handlers, register(), createCore(), CoreContext (+9 more)

### Community 19 - "Shell UI Bundle (2)"

Cohesion: 0.07
Nodes (30): at(), bt(), ct(), dt(), et(), ft(), ge(), gt() (+22 more)

### Community 20 - "Chat Message UI"

Cohesion: 0.10
Nodes (18): ChatList(), ChatListProps, ChatMessage(), ChatMessageProps, ConversionCard(), ConversionCardProps, Input, SectionHeader (+10 more)

### Community 21 - "Notes Extension"

Cohesion: 0.11
Nodes (16): notePath(), readNote(), writeNote(), ErrorBoundary, IpcResponse, Props, FtsRow, Note (+8 more)

### Community 22 - "Calendar Key Conditions"

Cohesion: 0.16
Nodes (22): canCreateEvent(), canDeleteEvent(), canEnterCalendar(), canGoBack(), canNavigateDayList(), canNavigateForm(), canNavigateMonth(), canNavigateSearchDown() (+14 more)

### Community 23 - "@nuxy/ui Components"

Cohesion: 0.08
Nodes (8): Window, CheckboxProps, DividerProps, ListItemMetaProps, MarkdownTextProps, PinInputProps, SkeletonProps, VisuallyHiddenProps

### Community 24 - "Scan Report Details"

Cohesion: 0.09
Nodes (25): bitwarden, filesCount, hasBackend, hasBackendTest, hasFrontend, violations, Extension Scan Report, emoji-picker (+17 more)

### Community 25 - "Extensions TSConfig"

Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, allowSyntheticDefaultImports, forceConsistentCasingInFileNames, jsx, jsxFactory, jsxFragmentFactory, lib (+16 more)

### Community 26 - "Shell Extension Frontend"

Cohesion: 0.17
Nodes (19): CommandPaletteProps, \_imp, Props, ShellView(), useKeyboard(), useProviders(), useShellInit(), useToolHistory() (+11 more)

### Community 27 - "Time Calculator Extension"

Cohesion: 0.12
Nodes (16): CITY_TO_TZ, findTimezone(), toTitleCase(), EXAMPLE_QUERIES, injectStyles(), Props, TimeCalculatorView(), TimeCardProps (+8 more)

### Community 28 - "Bitwarden Extension"

Cohesion: 0.14
Nodes (19): detectOS(), execCmd(), fetchPassword(), getRbwConfig(), hasBinary(), register(), Props, UseListNavigationFn (+11 more)

### Community 29 - "Src TSConfig"

Cohesion: 0.08
Nodes (23): compilerOptions, allowJs, allowSyntheticDefaultImports, baseUrl, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx (+15 more)

### Community 30 - "Video Downloader Extension"

Cohesion: 0.13
Nodes (15): checkBinary(), register(), CombinedListItem, getRecommendedFormats(), getVideoAndAudioFormats(), NavSection, Props, TabId (+7 more)

### Community 31 - "Window Spring Physics"

Cohesion: 0.13
Nodes (8): CRITICAL_DAMPING, DEFAULTS, getOrCreateSpring(), log, registry, SpringConfig, State, WindowSpringController

### Community 32 - "Calendar Frontend"

Cohesion: 0.10
Nodes (13): buildGrid(), CalendarEvent, CREATE_SELECT_FIELDS, CreateSelectField, DAY_ABBR, getDaysInMonth(), GridCell, mondayWeekday() (+5 more)

### Community 33 - "AI Orchestrator Extension"

Cohesion: 0.14
Nodes (17): broadcastResult(), BUILTIN_TOOL_SCHEMAS, handleRoute(), ollamaChat(), register(), createCore(), MockHandlers, TOOL_CHANNEL_MAP (+9 more)

### Community 34 - "Ollama Extension"

Cohesion: 0.15
Nodes (14): register(), createCore(), IpcResponse, Props, ChatMessage, ChatPayload, ChatResult, ConfigurePayload (+6 more)

### Community 35 - "Config Paths & Migration"

Cohesion: 0.15
Nodes (15): EXTRACTED_DIR, LEGACY_DATA_DIR, NUXY_HOME, detectNodeImports(), mockHome, getNowPlaying(), activeWorkers, handleHostCall() (+7 more)

### Community 36 - "Extension Host Package"

Cohesion: 0.15
Nodes (14): channelHandlers, { core, getSyncPayload }, logger, pendingHostCalls, WorkerData, ExtensionModule, loadExtensionModule(), resolveExtensionModule() (+6 more)

### Community 37 - "Calendar Utilities"

Cohesion: 0.17
Nodes (16): buildCalendarGrid(), CalendarMode, CalendarView, filterEventsByDay(), filterEventsByQuery(), getDaysInMonth(), getEventDays(), getRenderView() (+8 more)

### Community 38 - "n8n Extension"

Cohesion: 0.19
Nodes (12): register(), createCore(), Handlers, Props, N8nConfig, N8nConfigurePayload, N8nExecution, N8nExecutionsPayload (+4 more)

### Community 39 - "Root TSConfig"

Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, allowJs, allowSyntheticDefaultImports, composite, downlevelIteration, forceConsistentCasingInFileNames, jsx (+9 more)

### Community 40 - "Theme Registry"

Cohesion: 0.23
Nodes (11): DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME, byName, clearExtensionThemes(), getExtensionTheme(), listExtensionThemeNames(), registerExtensionTheme(), forest (+3 more)

### Community 41 - "UI Grid Components"

Cohesion: 0.14
Nodes (10): Grid, GridItem, GridItemProps, GridProps, ListItemProps, TabBarProps, TabOption, getScrollParent() (+2 more)

### Community 42 - "Ollama Manifest"

Cohesion: 0.12
Nodes (15): capabilities, callable, caller, description, entry, backend, frontend, settings (+7 more)

### Community 43 - "Vault & Auth Security"

Cohesion: 0.14
Nodes (15): Vault Cryptographic Engine (scryptSync + aes-256-gcm), Strict Memory Handling (Volatile Key, Auto-Lock), Password Vault Extension Security Architecture, Orchestrator + Tool Cross-Communication Pattern, callable/caller Capability Flags, Omni-Input Arbitration (OmniBar Traffic Control), Extension Type: Orchestrator (Match Unmatched), Extension Type: Provider (+7 more)

### Community 44 - "Performance Docs"

Cohesion: 0.16
Nodes (14): Dynamic Import Caching for Extension UIs, Performance Document (11), Window Throttling (hide + setBackgroundThrottling), UIKit Missing Components (SectionHeader, ChatMessage, FormField, etc.), Ctrl+K Command Palette, Electron Frameless Overlay Window, com.nuxy.shell (Shell Extension), nuxy-ext:// Custom Protocol (+6 more)

### Community 45 - "Clipboard Frontend"

Cohesion: 0.20
Nodes (11): ClipboardItemLeading(), FileIconFor(), FileIconType, getFileExtension(), getFileIconType(), getFilename(), getListLabel(), getListMeta() (+3 more)

### Community 46 - "E2E Run Cache"

Cohesion: 0.16
Nodes (12): cacheDir, cacheFile, computeHashForFiles(), **dirname, extensionsDir, **filename, getFiles(), packagesDir (+4 more)

### Community 47 - "UI Default Package"

Cohesion: 0.14
Nodes (13): devDependencies, @nuxy/ui, react, react-dom, vite, @vitejs/plugin-react, name, private (+5 more)

### Community 48 - "UI Navigation Hooks"

Cohesion: 0.14
Nodes (8): UseListNavigationOptions, UseListNavigationResult, KeyAction, TwoPanelFocusArea, TwoPanelNavSection, UseTwoPanelNavOptions, UseTwoPanelNavResult, BUILTIN_KEYS

### Community 49 - "Shell Manifest"

Cohesion: 0.14
Nodes (13): bootstrap, capabilities, callable, caller, entry, backend, frontend, icon (+5 more)

### Community 50 - "Time Calculator Manifest"

Cohesion: 0.14
Nodes (13): capabilities, callable, caller, entry, backend, frontend, icon, id (+5 more)

### Community 51 - "Video Downloader Manifest"

Cohesion: 0.14
Nodes (13): capabilities, callable, caller, entry, backend, frontend, settings, icon (+5 more)

### Community 52 - "AI Orchestrator Manifest"

Cohesion: 0.15
Nodes (12): capabilities, callable, caller, entry, backend, icon, id, name (+4 more)

### Community 53 - "Angrysearch Manifest"

Cohesion: 0.15
Nodes (12): capabilities, callable, caller, entry, backend, frontend, icon, id (+4 more)

### Community 54 - "Calendar Manifest"

Cohesion: 0.15
Nodes (12): capabilities, callable, caller, entry, backend, frontend, icon, id (+4 more)

### Community 55 - "Clipboard Manifest"

Cohesion: 0.15
Nodes (12): capabilities, callable, caller, entry, backend, frontend, icon, id (+4 more)

### Community 56 - "Planned Extensions Docs"

Cohesion: 0.23
Nodes (13): com.nuxy.bitwarden (Planned Bitwarden Extension), com.nuxy.calendar (Planned Calendar Extension), Encrypted Storage SDK Addition (core.storage.writeSecret), Planned Extensions Document, com.nuxy.n8n (Planned n8n Extension), com.nuxy.notes (Planned Notes Extension), System Notification Bridge (core.notification.send), com.nuxy.ollama (Planned Ollama Extension) (+5 more)

### Community 57 - "Emoji Picker Manifest"

Cohesion: 0.15
Nodes (12): capabilities, callable, caller, entry, backend, frontend, icon, id (+4 more)

### Community 58 - "Bitwarden Manifest"

Cohesion: 0.15
Nodes (12): capabilities, callable, caller, entry, backend, frontend, icon, id (+4 more)

### Community 59 - "Calculator Manifest"

Cohesion: 0.15
Nodes (12): capabilities, callable, caller, entry, backend, icon, id, name (+4 more)

### Community 60 - "n8n Manifest"

Cohesion: 0.15
Nodes (12): capabilities, callable, caller, entry, backend, frontend, icon, id (+4 more)

### Community 61 - "Notes Manifest"

Cohesion: 0.15
Nodes (12): capabilities, callable, caller, entry, backend, frontend, icon, id (+4 more)

### Community 62 - "Angrysearch Backend"

Cohesion: 0.26
Nodes (9): IGNORED_ROOTS, register(), updateDatabase(), Props, AngrysearchItem, DbRow, DbStatus, SearchPayload (+1 more)

### Community 63 - "@nuxy/ui Navigation Hooks"

Cohesion: 0.15
Nodes (7): UseListNavigationOptions, UseListNavigationResult, KeyAction, TwoPanelFocusArea, TwoPanelNavSection, UseTwoPanelNavOptions, UseTwoPanelNavResult

### Community 64 - "Settings Manifest"

Cohesion: 0.15
Nodes (12): capabilities, callable, caller, entry, backend, frontend, icon, id (+4 more)

### Community 65 - "Ext Template Manifest"

Cohesion: 0.17
Nodes (11): capabilities, callable, caller, entry, backend, frontend, id, name (+3 more)

### Community 66 - "Gradient Manifest"

Cohesion: 0.17
Nodes (11): capabilities, callable, caller, entry, frontend, icon, id, name (+3 more)

### Community 67 - "Calendar Backend Tests"

Cohesion: 0.27
Nodes (10): createCore(), freshBackend(), makeMockDb(), MockDb, createCore(), freshBackend(), makeMockDb(), MockDb (+2 more)

### Community 68 - "@nuxy/ui Table"

Cohesion: 0.17
Nodes (6): DataListItem, DataListProps, StatProps, TableCellProps, TableProps, TableRowProps

### Community 69 - "Extension System V2 Docs"

Cohesion: 0.17
Nodes (12): Extension Asset Loading Pattern, Implementation Phase 1: Setup, CoreContext (Implementation Spec), Implementation Phase 2: Core Infrastructure, ExtensionScanner (Implementation Spec), Preload Bridge (Implementation Spec), WindowManager Class (Implementation Spec), Implementation Phase 3: Extension Authoring (+4 more)

### Community 70 - "Scan Report Summary"

Cohesion: 0.15
Nodes (12): angrysearch, filesCount, hasBackend, hasBackendTest, hasFrontend, violations, n8n, filesCount (+4 more)

### Community 71 - "Architecture Security Docs"

Cohesion: 0.18
Nodes (11): Zero-Trust Security Tenet, V8 Sandbox Engine (Worker Isolation), Phase 1: Core Foundation & Tooling Setup, Phase 2: Kernel & VM Sandbox, Phase 3: Building First Extensions, Phase 4: Dynamic UI Integration, Phase 5: Hardening & Release, Strict Isolation Loading Sequence (+3 more)

### Community 72 - "Data Flow & Frontend Docs"

Cohesion: 0.20
Nodes (11): 03 - Data Flow, Publisher-Subscriber Real-Time Event Stream, Unidirectional Data Flow, Canvas Zones (Zone A Provider, Zone B Tool), 17 - Frontend Extensions and UI Library, Frontend Security Limitations, Shared UI Paradigm, useExtensionContext Hook (+3 more)

### Community 73 - "Dead Code Reports"

Cohesion: 0.24
Nodes (11): ~~CoreContext.ipc.broadcast Unimplemented No-Op~~ **FIXED** (removed from interface), Dead Code Report 2026-05-19, ~~migrateLegacyData Unbounded Scan on Every Spawn~~ **FIXED** (early-return guard added), ~~CoreContext.registry Stub Methods (registerTool etc.)~~ **FIXED** (implemented in core-proxy.ts:196-209), Launch Readiness Score 72/100, Master Cleanup Summary 2026-05-19, Performance Report 2026-05-19, Four Uncoordinated useEffect IPC Calls on App Mount (+3 more)

### Community 74 - "Database Design Docs"

Cohesion: 0.20
Nodes (11): Atomic Write Pattern (tmp + rename), Storage Chroot Jail, 07 - Database Design and Data Isolation, Offline-First Local-Only Persistence Philosophy, Canonical ~/.nuxy/ User Data Layout, Electron Kernel Fix Plan, manifest.id as Canonical Extension Identity, Nuxy Restructure Plan (+3 more)

### Community 75 - "Calendar Create Form"

Cohesion: 0.35
Nodes (9): canSaveCreate(), CREATE_FORM_FIELDS, CreateFormField, enterFormAction, isSelectField(), isTextInputField(), navigateSelectFocused(), nextField() (+1 more)

### Community 76 - "Calendar Backend"

Cohesion: 0.29
Nodes (6): CalendarCreatePayload, CalendarDeletePayload, CalendarEvent, CalendarEventRow, CalendarListPayload, CalendarUpdatePayload

### Community 77 - "Extension SDK Package"

Cohesion: 0.18
Nodes (10): dependencies, @nuxy/core, devDependencies, typescript, main, name, private, type (+2 more)

### Community 78 - "Extension Guide Docs"

Cohesion: 0.18
Nodes (11): Extension Anti-Patterns Catalog, Backend Rules (No Direct Node Imports), Extension Submission Checklist, CoreContext API Reference, Core TODOs (Unimplemented APIs), Extension Development Guide, Extension File Structure Rules, Helper Extension Type (+3 more)

### Community 79 - "Toaster UI Component"

Cohesion: 0.25
Nodes (5): Subscriber, Toast, ToastOptions, ToastStore, ToastType

### Community 80 - "Zero Trust Docs"

Cohesion: 0.24
Nodes (10): Zero-Trust Default Deny Security Model, Chroot Storage Jail, Cross-Module Invocation Security (caller/callable gates), Content Security Policy (CSP), Hardware-Level Thread Isolation, Dynamic Permission Prompts (OS-Style Consent), Security Document (10), Documentation Index (Implementation Status) (+2 more)

### Community 81 - "Extension Host Deps"

Cohesion: 0.20
Nodes (9): dependencies, @nuxy/core, devDependencies, typescript, main, name, private, type (+1 more)

### Community 82 - "Logger Module"

Cohesion: 0.24
Nodes (8): C, createLogger(), formatLine(), LEVELS, Logger, LogLevel, pad(), timestamp()

### Community 83 - "Icon Registry"

Cohesion: 0.31
Nodes (8): clearIconRegistry(), getDefaultPackName(), getIcon(), listIconPacks(), packs, registerIconPack(), altPack, samplePack

### Community 84 - "Ext Template Package"

Cohesion: 0.20
Nodes (9): dependencies, @nuxy/extension-sdk, description, name, private, scripts, build, type (+1 more)

### Community 85 - "UI Package Config"

Cohesion: 0.20
Nodes (9): devDependencies, @types/react, typescript, main, name, peerDependencies, react, react-dom (+1 more)

### Community 86 - "Architecture Refactor Docs"

Cohesion: 0.22
Nodes (10): Architecture Refactor Plan, Proposed kernel-router.ts, Weak msgId Generation (Finding 10), nuxyconfig.ts God-Module (Finding 3), Runtime TypeScript Transpilation in Protocol Handler (Finding 11), register.ts God-Handler (Finding 2), Extension Registration Race Condition (Finding 13), Scanner Lifecycle Overload (Finding 7) (+2 more)

### Community 87 - "Dev Extension Scripts"

Cohesion: 0.33
Nodes (8): copyDefaultExtensions(), copyExtensionTree(), findWorkspaceExtensionsDir(), isExtensionsRoot(), log, shouldSyncPath(), SKIP_DIR_NAMES, syncDirectory()

### Community 88 - "Settings E2E Tests"

Cohesion: 0.20
Nodes (9): APP_DIR, cleanEnv, consoleLogs, ELECTRON_BIN, extTab, nuxyDataDir, settingsDir, settingsItem (+1 more)

### Community 89 - "CI Workflow"

Cohesion: 0.25
Nodes (9): GitHub Actions CI Workflow, @nuxy/extension-host Package, src/electron/extensions/scanner.ts, CLAUDE.md Project Instructions, Monorepo Package Layout, src/electron/spawn/spawn.ts, TDD Mandatory Development Workflow, Extension Scanner (+1 more)

### Community 90 - "MVP Roadmap Docs"

Cohesion: 0.22
Nodes (9): 19 - MVP Roadmap, Empty Shell + Worker Thread Extension Paradigm, MVP Sprint 1 - Bare Metal Shell, MVP Sprint 2 - Extension Engine, MVP Sprint 3 - First Provider (Calculator), MVP Sprint 4 - First Tool (Clipboard), Documentation Audit Report 2026-05-19, Stale Documentation File Path References (+1 more)

### Community 91 - "Calculator Extension"

Cohesion: 0.33
Nodes (4): register(), safeEvalMath(), CalcResultItem, EvalResult

### Community 92 - "Clipboard Backend"

Cohesion: 0.36
Nodes (4): register(), createCore(), AddHistoryItemInput, ClipboardItem

### Community 93 - "UI Card (ext)"

Cohesion: 0.22
Nodes (4): CardBodyProps, CardFooterProps, CardHeaderProps, CardProps

### Community 94 - "UI Card (pkg)"

Cohesion: 0.22
Nodes (4): CardBodyProps, CardFooterProps, CardHeaderProps, CardProps

### Community 95 - "Type Safety Reports"

Cohesion: 0.22
Nodes (9): Renderer (window as any).core Bypass (Finding 6) **OPEN**, Untyped Worker Message Protocol (Finding 5) **OPEN** (HostToWorkerMessage second variant missing `type` discriminant), ~~WorkerToHostMessage / HostToWorkerMessage Discriminated Union~~ **PARTIAL** (WorkerToHostMessage typed, HostToWorkerMessage incomplete), ~~Unsafe BROKER_INVOKE Cast in host-handlers.ts (Issue 6)~~ **FIXED** (runtime validation guard added), ~~CoreContext.registry Uses unknown (Issue 4)~~ **FIXED** (implemented), Type Safety Report, @nuxy/ui Components Use props: any (Issue 3) **OPEN**, window as any in App.tsx (Issue 1) **OPEN** (main.tsx:11) (+1 more)

### Community 96 - "Project Analysis Docs"

Cohesion: 0.22
Nodes (9): General Overview - Nuxy Architecture, Storage Chroot / Jail Sandboxing, Three-Layer Architecture, Useless Core Principle, Zero-Trust Permission Model, Manifest Rules, Manifest Developer Guide, Strict Permission Policy (+1 more)

### Community 97 - "UI Default Manifest"

Cohesion: 0.22
Nodes (8): entry, frontend, id, name, permissions, priority, type, version

### Community 98 - "Logging Docs"

Cohesion: 0.29
Nodes (8): @nuxy/core Package, CoreContext (Extension Backend API), kernelLogger (packages/core/src/logger.ts), LOG_LEVEL Environment Variable, Logging System Document (20), Worker Logger (core.logger in extensions), Extension Template README, @nuxy/extension-sdk

### Community 99 - "IPC Register Docs"

Cohesion: 0.25
Nodes (8): src/electron/ipc/register.ts, src/electron/main.ts (Bootstrap), Architecture Document (02), Nuxy Kernel (Main Process Authority), Kernel Message Broker & Validator, React Canvas (Blank Renderer), IPC Router (ext:invoke), src/index.html (Renderer Entry)

### Community 100 - "@nuxy/core Package"

Cohesion: 0.25
Nodes (7): dependencies, devDependencies, typescript, exports, main, name, version

### Community 101 - "Overview Tenets Docs"

Cohesion: 0.25
Nodes (8): Empty Shell Tenet (The Core Must Be Useless), Gnome Extensions Ecosystem Inspiration, Legacy Vue 3 Monolith (Fat Main Process), Colocated State via React Custom Hooks, CSS Variables for Cross-Extension Theme Sharing, Documentation Index (README), Runtime Paths (~/.nuxy layout), Structure Guiding Principles (No Monoliths, Clear Boundaries)

### Community 102 - "@nuxy/ui Toaster"

Cohesion: 0.25
Nodes (4): Subscriber, Toast, ToastOptions, ToastType

### Community 103 - "Icons Default Manifest"

Cohesion: 0.25
Nodes (7): entry, icons, id, name, permissions, type, version

### Community 104 - "UI Dropdown (ext)"

Cohesion: 0.25
Nodes (3): DropdownHeaderProps, DropdownItemProps, DropdownMenuProps

### Community 105 - "UI Dropdown (pkg)"

Cohesion: 0.25
Nodes (3): DropdownHeaderProps, DropdownItemProps, DropdownMenuProps

### Community 106 - "Scratch Test Watcher"

Cohesion: 0.25
Nodes (5): extDestDir, repoRoot, skipDirs, sourceDir, targetDir

### Community 107 - "Glassmorphism Manifest"

Cohesion: 0.25
Nodes (7): entry, theme, id, name, permissions, type, version

### Community 108 - "Ocean Theme Manifest"

Cohesion: 0.25
Nodes (7): entry, theme, id, name, permissions, type, version

### Community 109 - "AI Orchestrator Package"

Cohesion: 0.29
Nodes (6): dependencies, @nuxy/extension-sdk, name, private, type, version

### Community 110 - "Bitwarden Package"

Cohesion: 0.29
Nodes (6): dependencies, @nuxy/extension-sdk, name, private, type, version

### Community 111 - "Calculator Package"

Cohesion: 0.29
Nodes (6): dependencies, @nuxy/extension-sdk, name, private, type, version

### Community 112 - "Calendar Package"

Cohesion: 0.29
Nodes (6): dependencies, @nuxy/extension-sdk, name, private, type, version

### Community 113 - "Preload & Window API"

Cohesion: 0.29
Nodes (7): src/renderer/preload.ts (contextBridge), window.core API (Renderer-side), API Design Document (05), Electron contextBridge (window.core.ipc), CoreContext Interface (API Design), Standardized IpcResponse Wrapper, Zod Runtime IPC Payload Validation

### Community 114 - "Clipboard Package"

Cohesion: 0.29
Nodes (6): dependencies, @nuxy/extension-sdk, name, private, type, version

### Community 115 - "System Analysis Docs"

Cohesion: 0.29
Nodes (7): Extension Engine (New Core), electron/main.ts God Object Anti-pattern, Dynamic Protocol Handler (nuxy-ext://), Window Manager (Transparent React Window), Renderer APIs (window.core via contextBridge), Raw HTML Elements Report (Extensions), Monorepo Layout (pnpm workspaces)

### Community 116 - "Error Handling Docs"

Cohesion: 0.29
Nodes (7): Kernel Message Broker Error Catcher (Layer 1), React ErrorBoundary for Extension UI (Layer 3), Frontend UI Resilience - success bool check (Layer 2), Unified Error Boundary Architecture (3 Layers), P1: Fat Shell - Core Owns Product UX, P3: No Kernel Message Broker / Cross-Extension Invoke, Pain Points Phased Implementation Plan (Phase 0-4)

### Community 117 - "Modules Capabilities Docs"

Cohesion: 0.38
Nodes (7): Extension Capabilities (callable/caller), 04 - Extensions Directory, Extension Manifest Contract, .nuxyext Distribution Format, Cross-Extension IPC Broker (broker.ts), Changelog 2026-05-19, Permissions Enforcement Module (permissions.ts)

### Community 118 - "Hardcoded PX Report"

Cohesion: 0.29
Nodes (7): CSS Design Tokens vs Hardcoded px **OPEN**, Hardcoded px Usage Report, Accessibility Gaps (ARIA roles, keyboard semantics) **OPEN**, UI Cleanup Report 2026-05-19, ~~prefers-reduced-motion Missing Support~~ **FIXED** (shell.css:314, shell.css:640), ThemeTokens Type Contract Gap **OPEN**, ~~transition:all Performance Issue in CSS~~ **FIXED** (no instances found)

### Community 119 - "Emoji Picker Package"

Cohesion: 0.29
Nodes (6): dependencies, @nuxy/extension-sdk, name, private, type, version

### Community 120 - "Ollama Package"

Cohesion: 0.29
Nodes (6): dependencies, @nuxy/extension-sdk, name, private, type, version

### Community 121 - "Extension Seed Paths"

Cohesion: 0.43
Nodes (5): EXTENSION_DIR, bundledExtensionsDir(), isExtensionsRoot(), log, seedBundledExtensions()

### Community 122 - "Angrysearch Tests"

Cohesion: 0.33
Nodes (6): createCore(), freshBackend(), makeMockDb(), MockDb, MockDbResult, MockPreparedStmt

### Community 124 - "UI Avatar (ext)"

Cohesion: 0.29
Nodes (4): AvatarGroupProps, AvatarProps, AvatarSize, AvatarStatus

### Community 125 - "UI Progress (ext)"

Cohesion: 0.29
Nodes (3): BannerProps, CircularProgressProps, ErrorStateProps

### Community 126 - "UI Media Preview"

Cohesion: 0.33
Nodes (4): ProgressBarProps, fmtDuration(), MediaPreview(), MediaPreviewProps

### Community 127 - "n8n Package"

Cohesion: 0.29
Nodes (6): dependencies, @nuxy/extension-sdk, name, private, type, version

### Community 128 - "Notes Package"

Cohesion: 0.29
Nodes (6): dependencies, @nuxy/extension-sdk, name, private, type, version

### Community 129 - "UI Avatar (pkg)"

Cohesion: 0.29
Nodes (4): AvatarGroupProps, AvatarProps, AvatarSize, AvatarStatus

### Community 130 - "UI Circular Progress (pkg)"

Cohesion: 0.29
Nodes (3): BannerProps, CircularProgressProps, ErrorStateProps

### Community 131 - "Future Evolution Docs"

Cohesion: 0.29
Nodes (7): Extension Marketplace (Future), Future Evolution Roadmap, isolated-vm Integration (Future), Nuxy Companion Mobile App (Future), Multi-Agent Chained Workflow (Future), WebGPU Embedded SLM (Future), Worker Hibernation / Lazy Loading (Future)

### Community 132 - "Time Calculator Package"

Cohesion: 0.29
Nodes (6): dependencies, @nuxy/extension-sdk, name, private, type, version

### Community 133 - "Video Downloader Package"

Cohesion: 0.29
Nodes (6): dependencies, @nuxy/extension-sdk, name, private, type, version

### Community 134 - "Features Extension List"

Cohesion: 0.33
Nodes (6): com.nuxy.angrysearch (File Search Extension), com.nuxy.clipboard (Clipboard Extension), Core API Gaps (core.fs, core.db, core.shell), Known Extension Violations (angrysearch, clipboard, settings), Memory Index, Memory: Project Extension Guide

### Community 135 - "Extension V2 UI Docs"

Cohesion: 0.33
Nodes (6): Grid + GridItem Components, ItemLeading Component, SectionHeader Component, TabBar Component, TwoPanel Component, UI Kit Extension (v2 Components)

### Community 136 - "Shell Result Card"

Cohesion: 0.33
Nodes (3): CompareCardProps, ResultCardProps, ResultItem

### Community 137 - "Inline CSS Scripts"

Cohesion: 0.33
Nodes (5): css, cssPath, \_\_dirname, escaped, jsPath

### Community 138 - "UI Collapsible (ext)"

Cohesion: 0.33
Nodes (3): AccordionItem, AccordionProps, CollapsibleProps

### Community 140 - "UI Text (ext)"

Cohesion: 0.33
Nodes (4): TextAs, TextProps, TextSize, TextVariant

### Community 141 - "UI Collapsible (pkg)"

Cohesion: 0.33
Nodes (3): AccordionItem, AccordionProps, CollapsibleProps

### Community 142 - "UI Text (pkg)"

Cohesion: 0.33
Nodes (4): TextAs, TextProps, TextSize, TextVariant

### Community 143 - "Scan AI Orchestrator"

Cohesion: 0.33
Nodes (6): ai-orchestrator, filesCount, hasBackend, hasBackendTest, hasFrontend, violations

### Community 144 - "Scan Calculator"

Cohesion: 0.33
Nodes (6): calculator, filesCount, hasBackend, hasBackendTest, hasFrontend, violations

### Community 145 - "Scan Calendar"

Cohesion: 0.33
Nodes (6): calendar, filesCount, hasBackend, hasBackendTest, hasFrontend, violations

### Community 146 - "Scan Clipboard"

Cohesion: 0.33
Nodes (6): clipboard, filesCount, hasBackend, hasBackendTest, hasFrontend, violations

### Community 147 - "Scan Gradient"

Cohesion: 0.33
Nodes (6): gradient, filesCount, hasBackend, hasBackendTest, hasFrontend, violations

### Community 148 - "Scan Icons Default"

Cohesion: 0.33
Nodes (6): icons-default, filesCount, hasBackend, hasBackendTest, hasFrontend, violations

### Community 149 - "Scan Notes"

Cohesion: 0.33
Nodes (6): notes, filesCount, hasBackend, hasBackendTest, hasFrontend, violations

### Community 150 - "Scan Ollama"

Cohesion: 0.33
Nodes (6): ollama, filesCount, hasBackend, hasBackendTest, hasFrontend, violations

### Community 151 - "Scan Settings"

Cohesion: 0.33
Nodes (6): settings, filesCount, hasBackend, hasBackendTest, hasFrontend, violations

### Community 152 - "Scan Glassmorphism"

Cohesion: 0.33
Nodes (6): theme-glassmorphism, filesCount, hasBackend, hasBackendTest, hasFrontend, violations

### Community 153 - "Scan Ocean Theme"

Cohesion: 0.33
Nodes (6): theme-ocean, filesCount, hasBackend, hasBackendTest, hasFrontend, violations

### Community 154 - "Scan Time Calculator"

Cohesion: 0.33
Nodes (6): time-calculator, filesCount, hasBackend, hasBackendTest, hasFrontend, violations

### Community 155 - "Scan Video Downloader"

Cohesion: 0.33
Nodes (6): video-downloader, filesCount, hasBackend, hasBackendTest, hasFrontend, violations

### Community 156 - "Agents & Gnome Docs"

Cohesion: 0.50
Nodes (5): Gnome-Style Extension Architecture, AI Agent Guidelines for Nuxy, Useless Core Principle (Kernel Only), Isolated V8 Worker Threads, Worker Thread Isolation

### Community 157 - "Extension Access Docs"

Cohesion: 0.40
Nodes (5): CoreContext API (Restricted Extension API), electron-updater Auto-Update, CoreContext MessagePort Proxy (Facade), Extension Host Privileges (Backend Worker APIs), Media / Now Playing API (MPRIS Linux, stubs macOS/Win)

### Community 158 - "Implementation Plan"

Cohesion: 0.70
Nodes (5): Milestone 1: Bare Metal Shell, Milestone 2: Extension Engine, Milestone 3: First Provider (Calculator), Milestone 4: First Tool (Clipboard), MVP Plan Document

### Community 159 - "Naming Report"

Cohesion: 0.50
Nodes (5): Shell CSS Class Namespace Collision Risk **OPEN**, Naming Consistency Report 2026-05-19, Duplicate ExtensionModule Interface (sdk vs host) **OPEN** (local copy in load-extension.ts, exported in extension-sdk), IPC Channel Casing Inconsistency (camelCase vs lowercase) **OPEN**, kernel vs core IPC Target Naming Inconsistency **OPEN**

### Community 161 - "UI Stack (ext)"

Cohesion: 0.40
Nodes (3): Align, Justify, StackProps

### Community 165 - "UI Stack (pkg)"

Cohesion: 0.40
Nodes (3): Align, Justify, StackProps

### Community 166 - "Scan Extensions Config"

Cohesion: 0.40
Nodes (3): EXCLUDE_DIRS, extensions, report

### Community 167 - "Extensions Review Docs"

Cohesion: 0.40
Nodes (5): com.nuxy.ai-orchestrator Extension Analysis, Extensions Review Analysis, com.nuxy.n8n Extension Analysis, com.nuxy.ollama Extension Analysis, com.nuxy.shell Extension Analysis

### Community 168 - "Shell Package"

Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 169 - "Testing Strategy Docs"

Cohesion: 0.50
Nodes (4): CoreContext Mock Pattern, 12 - Testing Strategy, Playwright E2E Test, Vitest Unit Testing

### Community 172 - "Shell UI Bundle (4)"

Cohesion: 0.50
Nodes (4): gn(), M(), ue(), z()

### Community 195 - "UI Scroll Utils (pkg)"

Cohesion: 0.83
Nodes (3): getScrollParent(), smoothScrollIntoViewIfNeeded(), smoothScrollTo()

### Community 196 - "Declarative Keyboard API"

Cohesion: 0.50
Nodes (4): Declarative Keyboard API, KeyAction Interface, useToolKeyActions Hook, Frontend Rules (window.React, window.UI)

### Community 197 - "Scratch Transpile"

Cohesion: 0.50
Nodes (3): absolutePath, code, transpiled

### Community 199 - "VSCode Settings"

Cohesion: 0.50
Nodes (3): cSpell.words, css.lint.unknownAtRules, scss.lint.unknownAtRules

### Community 202 - "Advanced Capabilities Docs"

Cohesion: 0.67
Nodes (3): Absolute Extension Autonomy Tenet, Headless Extensions (Background Daemons), Dev Hot Reloading (Watch Mode)

### Community 203 - "Dependency Report"

Cohesion: 1.00
Nodes (3): Dependency Audit Report 2026-05-19, ~~TypeScript 6 Non-Existent Version Issue (High)~~ **FIXED** (downgraded to ^5.9.0 / ^5.0.0 across all packages), TypeScript Runtime Dependency in Protocol Transpiler **OPEN**

### Community 204 - "Redundant Tests Audit"

Cohesion: 0.67
Nodes (3): Pain Points & Remediation Plan, Shared createMockCore() Helper Proposal, Redundant Tests Audit Report

### Community 206 - "Shell UI Bundle (5)"

Cohesion: 0.67
Nodes (3): fe(), H(), je()

### Community 207 - "Shell UI Bundle (6)"

Cohesion: 0.67
Nodes (3): U(), ve(), Y()

### Community 238 - "Calculator Missing Types"

Cohesion: 0.67
Nodes (3): Calculator types.ts Missing, com.nuxy.calculator (Calculator Provider), Provider Extension Type

## Knowledge Gaps

- **1213 isolated node(s):** `lib`, `module`, `target`, `moduleResolution`, `moduleDetection` (+1208 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **127 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **Why does `Toast()` connect `Chat Message UI` to `@nuxy/ui Components`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Why does `CoreContext` connect `Extension Backend Tests` to `Extension Registry & Kernel`, `Settings Extension`, `Media Provider System`, `IPC Permissions & Core`, `Emoji Picker Extension`, `Notes Extension`, `Time Calculator Extension`, `Bitwarden Extension`, `Video Downloader Extension`, `AI Orchestrator Extension`, `Ollama Extension`, `Extension Host Package`, `n8n Extension`, `Angrysearch Backend`, `Calendar Backend Tests`, `Calendar Backend`, `Calculator Extension`, `Clipboard Backend`, `Angrysearch Tests`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `IpcResult` connect `Extension Registry & Kernel` to `Extension Backend Tests`, `Electron App Bootstrap`, `IPC Permissions & Core`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `lib`, `module`, `target` to the rest of the system?**
  _1236 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Default Icon Registry` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `E2E Test Infrastructure` be split into smaller, more focused modules?**
  _Cohesion score 0.06205673758865248 - nodes in this community are weakly interconnected._
- **Should `UI Extension Icons` be split into smaller, more focused modules?**
  _Cohesion score 0.08233117483811286 - nodes in this community are weakly interconnected._
