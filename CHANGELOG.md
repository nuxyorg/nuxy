# Changelog

## [2.2.0](https://github.com/nuxyorg/nuxy/compare/v2.1.0...v2.2.0) (2026-06-30)


### Features

* add caller commands to extension manifest for command palette integration ([b992daf](https://github.com/nuxyorg/nuxy/commit/b992daf950a64292aeb73470e3409c6ac0696a8a))
* **angrysearch:** enhance ignored roots handling and UI updates ([28e181e](https://github.com/nuxyorg/nuxy/commit/28e181eadf9795ac0420d3ce42bae44612b67aa9))
* **angrysearch:** port angrysearch extension to current Lit/controller architecture ([6b22b11](https://github.com/nuxyorg/nuxy/commit/6b22b1196af7323be8ebd2ad6e7791dafbc396f7))
* **clipboard:** add comprehensive tests for item type utilities ([85ad423](https://github.com/nuxyorg/nuxy/commit/85ad423d3db4e694be4a193f5c558db1be570527))
* **clipboard:** port clipboard extension to current Lit/controller architecture ([967f33b](https://github.com/nuxyorg/nuxy/commit/967f33b28ad7253f688dbdf7f3a1245afb01a478))
* **core:** add deeplink IPC contract types ([4e475ec](https://github.com/nuxyorg/nuxy/commit/4e475eccf84fd30e277220714e84e25c0c47d322))
* **deeplink:** add parse.ts and dispatch.ts with TDD coverage ([6d4e9b7](https://github.com/nuxyorg/nuxy/commit/6d4e9b7b5ece0e48cad9aabbdba3db102b665c2a))
* **deeplink:** renderer-side deeplink:open listener + settings example ([1745039](https://github.com/nuxyorg/nuxy/commit/174503950ae0a05fc0a73d26791870a6357e1e84))
* **deeplink:** validate manifest.deeplinks.schemes during extension load ([39bdfdb](https://github.com/nuxyorg/nuxy/commit/39bdfdbf1dc82e5371491810209521984e0dc96e))
* **deeplink:** wire OS-level nuxy:// registration and CLI/socket support ([0c192a3](https://github.com/nuxyorg/nuxy/commit/0c192a3826c39581bea9b8631dbb625cf58fc930))
* **download-manager:** backend queue, curl-based downloads, deeplink scheme ([7b35a96](https://github.com/nuxyorg/nuxy/commit/7b35a9622bd17b3fc740ca44e8328b00e5b46dfc))
* **download-manager:** controller, frontend element, and locales ([3e9b33b](https://github.com/nuxyorg/nuxy/commit/3e9b33bbf04f3ee8697413006aa42382ea0f4460))
* **download-manager:** enhance external download handling and UI updates ([a3e5cf7](https://github.com/nuxyorg/nuxy/commit/a3e5cf7e2db686d259ed6426d326acd5d31ade7c))
* **download-manager:** enhance filtering and multi-select features ([5a0708d](https://github.com/nuxyorg/nuxy/commit/5a0708df8cdb0b495a6b47947379b991ac6577c9))
* **download-manager:** implement multi-select functionality and enhance file handling ([af74174](https://github.com/nuxyorg/nuxy/commit/af741742ab150f48cfa78a58d73164d60ebc7db1))
* enhance command palette with section grouping and manifest updates ([f4c00f5](https://github.com/nuxyorg/nuxy/commit/f4c00f556aa1558b22595d1186c97639a2e5be3b))
* implement ratio-based split API for nuxy-two-panel component ([72520fa](https://github.com/nuxyorg/nuxy/commit/72520fa5c79bbcc466cde03e66001ede759321f9))
* introduce Icon Browser extension with grid navigation and filtering capabilities ([30eb132](https://github.com/nuxyorg/nuxy/commit/30eb13251c101d63539efe3c3dcbadb3806fcbcf))
* **ipc-explorer, security:** implement IPC public/private channel enforcement and enhance IPC Explorer tool ([f18d58d](https://github.com/nuxyorg/nuxy/commit/f18d58d79e4b57c46b9a987bd87368bc0098f00a))
* make icon browser grid copyable via keyboard and click ([e1b1dde](https://github.com/nuxyorg/nuxy/commit/e1b1dde3aa735dde90dec1480f770b30a69fab15))
* **ollama, download-manager:** enhance message handling and UI interactions ([20c077a](https://github.com/nuxyorg/nuxy/commit/20c077ac81961ff268d59a898a151f265cf2a37d))
* **ollama, shell:** implement omniBarPosition behavior and enhance message scrolling ([5ab63b4](https://github.com/nuxyorg/nuxy/commit/5ab63b44950d7444d8de62fe6155013ec8c19f1f))
* **ollama:** port ollama extension to current Lit/controller architecture ([a1ae753](https://github.com/nuxyorg/nuxy/commit/a1ae75357f389f09866de44b279b1b7e870991da))
* **qbittorrent, plans:** add gap closure plan and handoff documentation ([660816f](https://github.com/nuxyorg/nuxy/commit/660816f6a60e126482439545410d4dd14997c8bd))
* **qbittorrent, plans:** add gap closure plan and handoff documentation ([880b0fb](https://github.com/nuxyorg/nuxy/commit/880b0fba955246aaf77ae49707e2465eee78cb08))
* **store:** port store extension to current Lit/controller architecture ([f7c9418](https://github.com/nuxyorg/nuxy/commit/f7c94181965ec8250be9366ece1920460582202a))


### Bug Fixes

* add deeplink.dispatch to global.d.ts after merge ([079e6c7](https://github.com/nuxyorg/nuxy/commit/079e6c7876b8fd8e20aaf79a369a26d3dc463874))
* **extensions:** add settings localization to angrysearch/clipboard/ollama/store ([a979b89](https://github.com/nuxyorg/nuxy/commit/a979b8917b10f0d9bb7053db384f233480578654))
* restore extensions/global.d.ts so pnpm typecheck passes ([932e9a2](https://github.com/nuxyorg/nuxy/commit/932e9a2cbf0e6b1f4b96ce2e02a06094cf4923fc))
* three deeplink round-trip bugs found via e2e testing ([237d8cf](https://github.com/nuxyorg/nuxy/commit/237d8cfef19695e68495adeb3773bd93750bccd7))

## [2.1.0](https://github.com/nuxyorg/nuxy/compare/v2.0.0...v2.1.0) (2026-06-18)

### Features

- add Alert component and update UI extensions to use unified icons and key action rendering ([d490e29](https://github.com/nuxyorg/nuxy/commit/d490e29f2e93fc78099052e2081d80d7a1735253))
- add bitwarden and n8n extensions with emoji-picker e2e keyboard test ([2b08247](https://github.com/nuxyorg/nuxy/commit/2b0824725575b36cc36616dad37dc3b86e6a6f7d))
- add calendar extension with reminder notifications ([3a2889d](https://github.com/nuxyorg/nuxy/commit/3a2889d9ef4cdbf0388e4cbfd868024bf9e579b4))
- add devDependencies and scripts to multiple extensions for improved development workflow ([f6243b0](https://github.com/nuxyorg/nuxy/commit/f6243b081f08d0f4a6666d0d7115d8bb9ea85dd9))
- add extension summary feature to shell controller and frontend ([3ad8922](https://github.com/nuxyorg/nuxy/commit/3ad892238016c374400305c53aaf1e53cdcb7edc))
- add Git identity configuration and safe command execution in sync script ([4a95216](https://github.com/nuxyorg/nuxy/commit/4a95216fa69817305d73f9b2ced284df23982ff0))
- add i18n locale files and settings schemas for all extensions ([9ce721c](https://github.com/nuxyorg/nuxy/commit/9ce721cdb6342f9778cf6d9975bc705ab2012a26))
- add icon browser extension and update gradient icon ([91bd022](https://github.com/nuxyorg/nuxy/commit/91bd02202a5fc19e759859bfa1fa07fe37b81526))
- add new helper extensions, expand test suites, and update docs ([8299e86](https://github.com/nuxyorg/nuxy/commit/8299e86f594715afba8b60b8669b9a0f079def86))
- add Nuxy installer script and usage statistics tracking ([22b89b9](https://github.com/nuxyorg/nuxy/commit/22b89b97eedc956cef123b2929aec082963e0f4b))
- add nuxy-assets subtree and bundled revocation list fallback ([1d85997](https://github.com/nuxyorg/nuxy/commit/1d859979c1d48491a0c516235f6724d75632cd9a))
- add ollama, notes, and video-downloader extensions with ai-orchestrator Ollama fallback ([6bfc66c](https://github.com/nuxyorg/nuxy/commit/6bfc66cf403e8db74c4034d3e4b16fd507fc4c97))
- add status check and error handling for repository creation in sync workflow ([510fb08](https://github.com/nuxyorg/nuxy/commit/510fb0827cfd221ecdc0c14a66c8038f3d6c1248))
- add support for helper extension type and configurable thinking colors in ollama extension ([2a126af](https://github.com/nuxyorg/nuxy/commit/2a126af63168947464792cfb5e20588b9cf0a7de))
- add vertical orientation to TabBar and implement dual-pane navigation in emoji-picker extension ([52cee40](https://github.com/nuxyorg/nuxy/commit/52cee40b72726a93db69c062058969aacd1b4cb5))
- enhance ESLint configuration and improve DOM manipulation practices ([c8cd684](https://github.com/nuxyorg/nuxy/commit/c8cd6849f07157764ecaa577d12c360276544b1e))
- enhance NotesController with edit mode blur suppression and cleanup ([98b411d](https://github.com/nuxyorg/nuxy/commit/98b411db5e04c088d690ec855be1bc236e0654f5))
- enhance npm publishing and synchronization workflows ([1244bda](https://github.com/nuxyorg/nuxy/commit/1244bdad0a75038898e196a5169448024955f5dc))
- enhance settings extension with icon pack management ([f90615e](https://github.com/nuxyorg/nuxy/commit/f90615e901a98fe145a611ac98cee785a2751c34))
- enhance settings management and icon pack handling ([8516191](https://github.com/nuxyorg/nuxy/commit/8516191fff22d7ce6e9e33b0b564def346be21a2))
- enhance shell controller with new query, navigation, and settings functionality ([6ce52eb](https://github.com/nuxyorg/nuxy/commit/6ce52eb32a86f5815154cd4060ea787cfbed27e9))
- expand CoreContext API, add extension disable/enable, and new UI components ([ff35160](https://github.com/nuxyorg/nuxy/commit/ff351608ebad0445d86f5118bbf52632aa6e6047))
- implement asynchronous provider-based search and add new time-calculator, emoji-picker, and ai-orchestrator extensions ([3f2de91](https://github.com/nuxyorg/nuxy/commit/3f2de916346797beb2a24a487057c44938403044))
- implement blur suppression feature in tool behavior and window management ([e02e6c3](https://github.com/nuxyorg/nuxy/commit/e02e6c3470b2cc8b32c3fceef304a0be5f9ba020))
- implement comprehensive UI component library and integrate default extension components ([94d87af](https://github.com/nuxyorg/nuxy/commit/94d87afb5273245e56b8f3cd914fccfff0d589ff))
- implement end-to-end testing suite for Electron application using Playwright ([f2538ae](https://github.com/nuxyorg/nuxy/commit/f2538ae9b778e0a3bd7007f5d535056b7ced9084))
- implement extension development server and scaffold multiple initial extensions ([ec79ff7](https://github.com/nuxyorg/nuxy/commit/ec79ff7d10c7195d349935a56011f9d06109ae2b))
- implement extension security integrity verification and preload lifecycle management synchronization ([667e5e6](https://github.com/nuxyorg/nuxy/commit/667e5e6dbce0313231382f58c42cc27e25f71a4c))
- implement extension settings API, enhance keyboard navigation input handling, add calendar functionality, and optimize e2e testing. ([ae050e7](https://github.com/nuxyorg/nuxy/commit/ae050e7f182595467a02b0fea931b9642414050f))
- implement extension system v2 with declarative keyboard hooks and expanded UI component library ([84a9cd5](https://github.com/nuxyorg/nuxy/commit/84a9cd503d48eacf241d95e6f1bc54dbf1bc6b29))
- implement hold-to-confirm functionality for keyboard actions ([f944452](https://github.com/nuxyorg/nuxy/commit/f944452c416d46d2ce591d9380796fb24589648b))
- implement IPC socket server for window control and add global uncaught exception handling ([3b50172](https://github.com/nuxyorg/nuxy/commit/3b501721063e918ca5baf9628fe7751a2dc69ea6))
- implement standardized extension architecture with comprehensive hook, component, and utility modules across all extensions. ([97fab3a](https://github.com/nuxyorg/nuxy/commit/97fab3a83dc0573f12d79c24f9e5726a3e823b35))
- implement Toaster component and refactor CommandPalette positioning and navigation logic ([352bdde](https://github.com/nuxyorg/nuxy/commit/352bdde189bcb95ed8492f4c0c10cb2b800b3331))
- introduce extension development standards, add utility hooks, and migrate n8n extension to JSX syntax. ([23d2d55](https://github.com/nuxyorg/nuxy/commit/23d2d55abba8eb507c55ea643d51768567a77f04))
- make everything reflective ([7c2d16d](https://github.com/nuxyorg/nuxy/commit/7c2d16ded0acd7702e7892e0d4090c5c9a5e40fe))
- migrate to lit ([098c9cc](https://github.com/nuxyorg/nuxy/commit/098c9ccca6c1c73d83358728e80e40cecc8e8c62))
- portal SelectBox dropdown to document body, implement resize logic, and add clipboard history sorting ([ccdd018](https://github.com/nuxyorg/nuxy/commit/ccdd018db20272da1e1c7ec19d4dc7648d3e7af1))
- refactor all codebase and optimise ([6718e56](https://github.com/nuxyorg/nuxy/commit/6718e56600d8498e355b7d8770d70f178f796c55))
- refactor extensions to TypeScript, add n8n backend, and update icon registry ([20911f8](https://github.com/nuxyorg/nuxy/commit/20911f81b19a036e5665c40a46d41d837b3dfa1c))

### Bug Fixes

- add minimal package.json to extensions missing workspace registration ([cb5e33d](https://github.com/nuxyorg/nuxy/commit/cb5e33dbd93af24b265cf35c20514d453f0cf0cd))
- adjust selectedIndex handling in NotesController and UI components ([a39c365](https://github.com/nuxyorg/nuxy/commit/a39c365bac35d31b763a71e1daf399cfa9066d48))
- adjust spacing and padding in List and ListItem components ([1720402](https://github.com/nuxyorg/nuxy/commit/1720402b0e72e54de376a8238ff76544d6639953))
- break IPC circular dependency and unexport rescanExtensions ([57456f6](https://github.com/nuxyorg/nuxy/commit/57456f6763ad5d58b0bda88a31d31d3dd117f57a))
- clean up fallow warnings and improve TwoPanel for reuse ([066b04d](https://github.com/nuxyorg/nuxy/commit/066b04dc22fbd0eae8c2b8e20efdd67ad27ec867))
- enhance state management in SettingsController and NuxyListElement ([7c397e3](https://github.com/nuxyorg/nuxy/commit/7c397e3c522e9e9d4867f638f93819a975ec61c9))
- replace Math.random() with crypto.randomUUID() and silence react-doctor ([2f4e21d](https://github.com/nuxyorg/nuxy/commit/2f4e21ddf9bcf42d1159e2fbeb18c2a12657b70a))
- resolve 3 pre-existing test failures ([1545005](https://github.com/nuxyorg/nuxy/commit/1545005a07f83233e7d13357053ce3c24b76748b))
- update dependencies in package.json, improve CI workflow with type checking, and enhance documentation for clarity ([23d2941](https://github.com/nuxyorg/nuxy/commit/23d29413de398733e1037df38976841f30e04d45))
- update directory paths from .nuxy to .nxy ([3fc0646](https://github.com/nuxyorg/nuxy/commit/3fc064604e0a25ca975e3b99a251251a715cc757))
- update package references and remove deprecated files ([96ee01d](https://github.com/nuxyorg/nuxy/commit/96ee01d563bc7e5e07eefcaba4dd6157238efbc7))
- update window position settings and localization labels ([06a3814](https://github.com/nuxyorg/nuxy/commit/06a38147a426fe9ce063d4866705905beef4757c))

## [2.0.0](https://github.com/nuxy/nuxy/compare/v2.0.0...v2.0.0) (2026-06-18)

### Features

- Baseline release for release-please automation.
