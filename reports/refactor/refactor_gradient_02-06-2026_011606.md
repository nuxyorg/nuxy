# Refactor Assessment: extensions/gradient/gradient.ts

**Date**: 2026-06-02  
**Analyst**: Senior Architect (automated)  
**Target**: `/home/xava/Documents/nuxy/extensions/gradient/gradient.ts` (764 lines)  
**Extension**: `com.nuxy.gradient` — type `helper`, frontend-only, no backend

---

## 1. Executive Summary

**This file is vendored third-party code. Do not refactor it.**

`gradient.ts` is a verbatim (or near-verbatim) copy of the Stripe.com WebGL gradient animation, as reverse-engineered and published by Kevin Hufnagl at https://kevinhufnagl.com. The file acknowledges this in its opening block comment:

```
/*
 *   Stripe WebGl Gradient Animation
 *   All Credits to Stripe.com
 *   ScrollObserver functionality to disable animation when not scrolled into view
 *   has been disabled and commented out for now.
 *   https://kevinhufnagl.com
 */
```

Additionally the file embeds two further vendored GLSL shader libraries verbatim as string constants:

- **Ashima / webgl-noise** `snoise()` implementation (MIT License, Ian McEwan / Ashima Arts, https://github.com/ashima/webgl-noise) — attributed in the embedded string at line 526
- **glsl-blend** blending functions (Jamie Owen, https://github.com/jamieowen/glsl-blend) — attributed in the embedded string at line 528

**Risk Level: LOW to TOUCH, HIGH to MISREFACTOR**

The code is intentionally obfuscated/minified (single-letter variable names, comma-expression chains, semicolon-at-start-of-line idioms) because it was produced by a minifier. It has `// @ts-nocheck` at line 1, zero TypeScript types, and single-character parameter names throughout (`e`, `t`, `n`, `i`, `s`, `r`). This is characteristic of vendored minified browser JavaScript, not hand-authored TypeScript. Applying automated refactoring heuristics to minified code will produce incorrect or broken results.

The single project-specific change documented in the file is the disabling of `ScrollObserver` (commented out at lines 547–555 and 704). The export surface at line 764 (`export { Gradient }`) was added by the project.

---

## 2. File-Level Inventory

### 2.1 Directory Contents

| File | Size | Purpose |
|---|---|---|
| `gradient.ts` | 764 lines / 39 KB | Vendored WebGL gradient engine |
| `frontend.tsx` | 161 lines | Original project code — React adapter & shell self-attacher |
| `manifest.json` | 16 lines | Extension manifest (type: helper, no backend) |
| `e2e.spec.ts` | 195 lines | Playwright E2E tests (canvas presence, shell border toggle, Ollama thinking state) |

No `backend.ts`, no unit tests (`*.test.ts`) — consistent with `type: helper` which has no backend requirement.

---

## 3. Function / Class Inventory Table

All entries below are from `gradient.ts`. Line ranges are exact.

| Symbol | Kind | Lines | Line Count | Notes |
|---|---|---|---|---|
| `normalizeColor()` | function | 11–13 | 3 | Hex int → normalized RGB float[3] |
| blendMode IIFE | statement | 14–20 | 7 | Dead code — result discarded (no `const` assignment) |
| `MiniGl` | class | 25–403 | 379 | Entire WebGL micro-renderer |
| `MiniGl.constructor` | method | 26–364 | 339 | Registers 5 nested classes via `Object.defineProperties` |
| `MiniGl.Material` | nested class | 52–121 | 70 | GLSL program: compiles shaders, links program |
| `Material.constructor` | method | 53–95 | 43 | Builds vertex + fragment sources, attaches uniforms |
| `Material.attachUniforms` | method | 97–120 | 24 | Recursive: handles array/struct/scalar uniform types |
| `MiniGl.Uniform` | nested class | 124–177 | 54 | WebGL uniform wrapper with type-mapped `gl.uniform*` calls |
| `Uniform.constructor` | method | 126–138 | 13 | Maps type string to WebGL uniform function suffix |
| `Uniform.update()` | method | 139–146 | 8 | Pushes value to GPU |
| `Uniform.getDeclaration()` | method | 150–175 | 26 | Generates GLSL uniform declaration strings |
| `MiniGl.PlaneGeometry` | nested class | 179–272 | 94 | Tessellated plane mesh geometry |
| `PlaneGeometry.constructor` | method | 181–203 | 23 | Creates attribute buffers, calls setTopology + setSize |
| `PlaneGeometry.setTopology()` | method | 205–241 | 37 | Builds UV, uvNorm, index arrays for NxM grid |
| `PlaneGeometry.setSize()` | method | 242–271 | 30 | Positions vertices in worldspace |
| `MiniGl.Mesh` | nested class | 275–311 | 37 | Geometry + Material container |
| `Mesh.constructor` | method | 277–293 | 17 | Attaches attributes to shader program locations |
| `Mesh.draw()` | method | 294–306 | 13 | `gl.drawElements()` call |
| `Mesh.remove()` | method | 307–309 | 3 | Removes from MiniGl.meshes array |
| `MiniGl.Attribute` | nested class | 313–344 | 32 | WebGL buffer wrapper (ARRAY_BUFFER / ELEMENT_ARRAY_BUFFER) |
| `Attribute.constructor` | method | 315–321 | 7 | Creates GL buffer and calls update() |
| `Attribute.update()` | method | 322–326 | 5 | `bufferData()` upload |
| `Attribute.attach()` | method | 327–335 | 9 | `getAttribLocation` + `vertexAttribPointer` |
| `Attribute.use()` | method | 336–341 | 6 | `bindBuffer` + re-enables attrib pointer |
| `MiniGl.setSize()` | method | 365–377 | 13 | Resizes canvas + GL viewport + updates resolution uniform |
| `MiniGl.setOrthographicCamera()` | method | 379–399 | 21 | Computes orthographic projection matrix |
| `MiniGl.render()` | method | 400–402 | 3 | Clears + draws all meshes |
| `e()` helper | function | 406–418 | 13 | `Object.defineProperty` wrapper used in `Gradient` constructor |
| `Gradient` | class | 421–747 | 327 | High-level animation controller |
| `Gradient.constructor` | method | 422–520 | 99 | Initializes 30 instance properties via `e()` helper; sets up arrow-function event handlers inline |
| `Gradient.connect()` | async method | 521–556 | 36 | Embeds all 4 GLSL shaders as string constants; sets conf; bootstraps MiniGl |
| `Gradient.disconnect()` | method | 557–565 | 9 | Removes event listeners (scroll, mouse, resize) |
| `Gradient.initMaterial()` | method | 566–674 | 109 | Builds the full WebGL uniform tree (u_time, u_global, u_vertDeform, u_waveLayers…) |
| `Gradient.initMesh()` | method | 675–679 | 5 | Calls initMaterial + PlaneGeometry + Mesh |
| `Gradient.shouldSkipFrame()` | method | 680–682 | 3 | Throttle: skip even frames + hidden tab check |
| `Gradient.updateFrequency()` | method | 683–685 | 3 | Increments freqX and freqY |
| `Gradient.toggleColor()` | method | 686–688 | 3 | Flips activeColors[index] between 0 and 1 |
| `Gradient.showGradientLegend()` | method | 689–692 | 4 | Adds CSS class to body if width > minWidth |
| `Gradient.hideGradientLegend()` | method | 693–696 | 4 | Removes CSS class from body |
| `Gradient.init()` | method | 697–703 | 7 | Calls initGradientColors → initMesh → resize → animate → addEventListener |
| `Gradient.waitForCssVars()` | method | 708–719 | 12 | Polls via rAF for CSS custom properties to appear |
| `Gradient.initGradientColors()` | method | 724–746 | 23 | Reads `--gradient-color-1..4` CSS vars, normalizes to float arrays |
| `export { Gradient }` | export | 764 | 1 | Only project-added line (besides ScrollObserver comments) |

**Embedded vendored GLSL shaders (as JS string constants inside `connect()`):**

| Shader | Lines (approx) | Attribution |
|---|---|---|
| vertex | ~40 GLSL LOC | Stripe/kevinhufnagl |
| noise (`snoise`) | ~90 GLSL LOC | Ashima Arts / Ian McEwan, MIT License |
| blend | ~150 GLSL LOC | Jamie Owen (glsl-blend), MIT License |
| fragment | ~10 GLSL LOC | Stripe/kevinhufnagl |

---

## 4. Vendored vs. Original Determination

**Verdict: VENDORED**

Evidence:

1. **Explicit attribution header** (lines 2–8): "Stripe WebGl Gradient Animation / All Credits to Stripe.com / https://kevinhufnagl.com"
2. **`// @ts-nocheck` at line 1**: The entire file opts out of TypeScript checking — standard practice for vendored JS dropped into a TypeScript project without wanting to type it
3. **Minifier artifact style**: Single-letter parameters (`e`, `t`, `n`, `i`, `s`, `r`, `o`, `l`), semicolons as statement starters (`;(a, b, c)` idiom), comma-expression chains — all hallmarks of Terser/UglifyJS output that was lightly formatted (prettier-ized) but not hand-authored
4. **Dead code at line 14–20**: `['SCREEN', 'LINEAR_LIGHT'].reduce(...)` result is discarded — this is a leftover from the minified source that originally used the result
5. **`Object.defineProperties` pattern for nested classes**: Unusual class registration pattern (Material, Uniform, PlaneGeometry, Mesh, Attribute defined as non-enumerable properties on `this`) — this is a deliberate encapsulation choice from the original Stripe implementation, not idiomatic TypeScript OOP
6. **Three embedded GLSL libraries as string constants** with their own MIT attribution comments intact — libraries that are normally separate npm packages (`webgl-noise`, `glsl-blend`) embedded verbatim
7. **Commented-out ScrollObserver blocks**: Lines 547–555 and 704 show the original code is preserved as comments with a note "disabled and commented out for now" — consistent with maintaining a vendor copy
8. **Git history**: The file was introduced as part of a mass extension-to-TypeScript refactor commit (3b50172), not authored incrementally — also consistent with a copy-in

The **only** project-authored changes are:
- Line 1: `// @ts-nocheck` (added by project)
- Line 764: `export { Gradient }` (added by project)
- ScrollObserver blocks commented out (lines 429, 547–555, 698)

---

## 5. Code Smell Analysis (Vendored Context)

Because this is vendored code, smells are documented for awareness, **not as targets for refactoring**.

| Smell | Location | Severity (in a new codebase) | Relevance here |
|---|---|---|---|
| Single-letter params everywhere | Throughout | High | Minifier artifact — expected |
| `MiniGl.constructor` is 339 lines | Lines 26–364 | High | Structural: nested class definitions via `Object.defineProperties` |
| `Gradient.constructor` initializes 30 properties | Lines 422–520 | High | Vendor pattern — all done via `e()` helper calls |
| `Gradient.connect()` embeds 4 GLSL shaders as string literals | Lines 522–531 | Medium | Consolidation over separate shader files — intentional |
| `Gradient.initMaterial()` is 109 lines of nested Uniform construction | Lines 566–674 | Medium | Data-heavy: 8 top-level uniforms + array of wave layer structs |
| Dead code: blendMode IIFE result discarded | Lines 14–20 | Low | Minifier artifact leftover |
| `e()` property-definition helper function | Lines 406–418 | Low | Could be `this.x = val` — minifier-era pattern |
| Max brace nesting depth: 9 | Line ~164 | High | Inside `Uniform.getDeclaration` template literal construction |
| `@ts-nocheck` disables all type safety | Line 1 | High | Intentional for vendored JS compatibility |
| No unit tests | — | Medium | Appropriate for vendored rendering code |

---

## 6. Complexity Metrics

| Metric | Value | Notes |
|---|---|---|
| Total lines | 764 | Includes 4 embedded GLSL shaders |
| Effective TypeScript lines | ~580 | Remainder is embedded GLSL string content |
| Maximum brace nesting depth | 9 | Line ~164, inside `Uniform.getDeclaration` template literal |
| `MiniGl` constructor size | 339 lines | Defines 5 nested classes inline |
| `Gradient.constructor` | 99 lines | Defines 13 arrow-function methods inline |
| Cyclomatic complexity — `Gradient.constructor` | ~19 | High — driven by inline event handler conditionals |
| Cyclomatic complexity — `Gradient.connect()` | ~9 | Medium — GLSL shader embedding + MiniGl bootstrap logic |
| Cyclomatic complexity — `Gradient.initMaterial()` | ~2 | Low — mostly declarative uniform construction |
| `@ts-nocheck` scope | Entire file | No TypeScript enforcement anywhere |
| External vendor attributions | 3 | Stripe/kevinhufnagl, Ashima Arts, Jamie Owen |

---

## 7. Test Coverage Assessment

| Test type | Coverage | Notes |
|---|---|---|
| Unit tests (`*.test.ts`) | None | No unit tests exist — appropriate for vendor code |
| E2E tests (`e2e.spec.ts`) | Present — 3 test suites | Canvas presence, shell border toggle, Ollama thinking-state gradient activation |
| Isolation | E2E only tests observable DOM behavior | Internal WebGL rendering is not tested (canvas draw calls, shader compilation) |

The E2E tests in `e2e.spec.ts` cover the integration surface: the canvas element appears in the DOM, dimensions are non-zero, and the CSS class toggle lifecycle (activate/deactivate) works correctly. This is the appropriate level of testing for a vendored rendering library.

---

## 8. Recommended Approach

### Decision: WRAP, DO NOT REFACTOR

The file must be treated as an opaque black box. Do not refactor its internals.

**Rationale:**
- The original code has embedded algorithmic knowledge (Perlin/simplex noise implementation, GLSL blend modes, orthographic projection matrix math) that is not hand-authored and not locally owned
- It carries implicit MIT license obligations from Ashima Arts and glsl-blend that must not be disrupted
- Refactoring would require understanding and preserving three independent shader programs embedded as strings
- The `@ts-nocheck` flag is intentional — attempting to add types would require restructuring the class hierarchy
- The code works correctly as evidenced by passing E2E tests

### What IS appropriate to do

1. **Document the vendor source** in a comment block or in `EXTENSION_GUIDE.md`
2. **Isolate the adapter layer** — `frontend.tsx` already does this well; it imports `Gradient` dynamically and adapts it to the React/Nuxy shell lifecycle
3. **Optionally extract shaders** to separate `.glsl` files — this is a cosmetic improvement that doesn't touch any logic, only improves readability of `connect()`
4. **Add a LICENSE comment** explicitly listing the three attributions with their licenses, to satisfy MIT attribution requirements

### Wrapping Strategy (if extension of behavior is needed)

If new gradient behavior is needed (different colors, animation speed, pause/resume), it should be implemented **exclusively in `frontend.tsx`**, not in `gradient.ts`. The `Gradient` class already exposes the necessary control surface:

```typescript
// In frontend.tsx — the correct place for project-specific customization:
const g = new Gradient()
g.amp = 200           // Change amplitude
g.seed = 8            // Change noise seed
g.freqX = 12e-5       // Change horizontal frequency
g.freqY = 25e-5       // Change vertical frequency
g.height = window.innerHeight
g.initGradient(`#${CANVAS_ID}`)

// Later:
g.pause()
g.play()
g.toggleColor(2)       // Disable color slot 2
g.updateFrequency(-2e-5) // Slow down
```

If an entirely new animation behavior is required, write a new `gradient-v2.ts` file from scratch in TypeScript, do not modify `gradient.ts`.

---

## 9. Extraction Proposals

**Not applicable.** This is vendored code. No extractions are proposed.

The one candidate that might appear worth extracting is the embedded GLSL shaders from `Gradient.connect()` into separate `.glsl` files. This is documented as an optional cosmetic improvement below, not a refactoring.

### Optional: Extract GLSL shaders to separate files (cosmetic only)

**BEFORE** (current state — all shaders embedded as string literals in `connect()`):
```javascript
// Lines 522-531 inside Gradient.connect()
this.shaderFiles = {
  vertex: 'varying vec3 v_color;\n\nvoid main() { ... }',  // ~40 GLSL lines
  noise: '// Description: Array and textureless GLSL 2D/3D/4D simplex\n...',  // ~90 GLSL lines
  blend: '// https://github.com/jamieowen/glsl-blend\n...',  // ~150 GLSL lines
  fragment: 'varying vec3 v_color;\n\nvoid main() { ... }',  // ~10 GLSL lines
}
```

**AFTER** (separate files, loaded via import or fetch):
```
extensions/gradient/
  gradient.ts       (unchanged logic)
  shaders/
    vertex.glsl     (40 LOC)
    noise.glsl      (90 LOC, Ashima attribution preserved)
    blend.glsl      (150 LOC, jamieowen attribution preserved)
    fragment.glsl   (10 LOC)
```

```javascript
// gradient.ts connect() — after extraction
import vertexSrc from './shaders/vertex.glsl?raw'
import noiseSrc from './shaders/noise.glsl?raw'
import blendSrc from './shaders/blend.glsl?raw'
import fragmentSrc from './shaders/fragment.glsl?raw'

this.shaderFiles = { vertex: vertexSrc, noise: noiseSrc, blend: blendSrc, fragment: fragmentSrc }
```

**Risk**: Medium. The extension is served via `nuxy-ext://` protocol and transpiled at runtime by `typescript.transpileModule`. Vite `?raw` imports work in the Vite build pipeline but may not work in the runtime transpilation path. This extraction should only be done after confirming the protocol server supports static asset imports. **This is the only extraction that could be considered, and it is optional.**

---

## 10. Step-by-Step Execution Plan

```json
[
  {
    "id": "gradient-001",
    "title": "Add vendor attribution block to gradient.ts",
    "description": "Replace the existing informal comment header (lines 1-8) with a formal SPDX-style attribution block listing all three vendor sources: Stripe/kevinhufnagl (WebGL gradient), Ashima Arts/Ian McEwan (snoise, MIT), Jamie Owen/glsl-blend (MIT). Add the @ts-nocheck rationale as a comment.",
    "file": "extensions/gradient/gradient.ts",
    "type": "documentation",
    "risk": "none",
    "priority": "low"
  },
  {
    "id": "gradient-002",
    "title": "Document gradient.ts as vendored in EXTENSION_GUIDE.md",
    "description": "Add a section or callout in EXTENSION_GUIDE.md noting that gradient.ts is vendored code and must not be refactored. Describe the correct extension pattern: customize via frontend.tsx using the Gradient public API surface only.",
    "file": "extensions/EXTENSION_GUIDE.md",
    "type": "documentation",
    "risk": "none",
    "priority": "medium"
  },
  {
    "id": "gradient-003",
    "title": "[Optional] Investigate GLSL shader extraction feasibility",
    "description": "Check whether the nuxy-ext:// protocol server (src/electron/protocol/register.ts) supports serving .glsl files as static assets and whether typescript.transpileModule can handle ?raw imports. If yes, proceed to gradient-004. If no, close as not applicable.",
    "file": "src/electron/protocol/register.ts",
    "type": "investigation",
    "risk": "low",
    "priority": "low"
  },
  {
    "id": "gradient-004",
    "title": "[Optional, depends on gradient-003] Extract GLSL shaders to separate files",
    "description": "If gradient-003 confirms feasibility: extract the four embedded GLSL shader strings from Gradient.connect() to extensions/gradient/shaders/{vertex,noise,blend,fragment}.glsl. Update the connect() method to import them. Ensure license attributions in noise.glsl and blend.glsl are preserved verbatim. Run e2e tests to confirm gradient renders correctly.",
    "file": "extensions/gradient/gradient.ts",
    "type": "cosmetic-refactor",
    "risk": "medium",
    "priority": "low",
    "depends_on": "gradient-003"
  },
  {
    "id": "gradient-005",
    "title": "Do NOT touch MiniGl internals",
    "description": "This is a tracking task / constraint. MiniGl class (lines 25-403) and Gradient class internals (lines 421-747, except connect() GLSL strings) must not be refactored. Any future work on gradient animation behavior must be implemented as new code in frontend.tsx using the Gradient public API.",
    "file": null,
    "type": "constraint",
    "risk": "n/a",
    "priority": "permanent"
  }
]
```

---

## 11. Summary Table

| Question | Answer |
|---|---|
| Is it vendored? | Yes — Stripe WebGL gradient via kevinhufnagl.com |
| Contains sub-vendors? | Yes — Ashima Arts snoise (MIT), glsl-blend (MIT) |
| Is it refactorable? | No — treat as black box |
| TypeScript types? | None (`@ts-nocheck` throughout) |
| Unit tests? | None (E2E tests only, appropriate) |
| Project-authored lines | ~3 (export, ts-nocheck, ScrollObserver comment) |
| Public API surface | `initGradient()`, `pause()`, `play()`, `resize()`, `disconnect()`, `toggleColor()`, `updateFrequency()`, `amp`, `seed`, `freqX`, `freqY`, `height` |
| Correct customization point | `frontend.tsx` only |
| Max nesting depth | 9 |
| Highest CC function | `Gradient.constructor` (~19) |
| Recommended action | Document, constrain, wrap — no internal changes |
