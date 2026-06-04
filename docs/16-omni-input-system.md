# 16 - Extension Types & Omni-Input Arbitration

## 1. The Challenge of an Open Ecosystem

In a system where extensions control features, Nuxy must act as a strict traffic controller. If an AI Assistant wants to silently use the "Currency Converter" extension, it needs to know _exactly_ what parameters the converter accepts, and whether the converter even _wants_ to be called by an AI.

To solve this, Nuxy mandates a strict **Type & Capability Registry** defined in the `manifest.json` and validated at runtime.

## 2. Capabilities: `callable` vs `caller`

Not all extensions are created equal. To prevent security loops and restrict power, every extension must define its invocation rights in its manifest.

- **`callable: true`**: This extension exposes a JSON schema and allows other extensions (like the AI) to execute it. (e.g., Currency, Spotify).
- **`callable: false`**: This extension is hidden from the AI. It cannot be invoked programmatically. (e.g., The AI itself, to prevent recursive AI loops).
- **`caller: true`**: This extension is granted the `core.extensions.invoke()` API, allowing it to execute other `callable` extensions. (e.g., The AI Orchestrator).
- **`caller: false`**: This extension is blocked from executing other extensions. (e.g., Currency).

## 3. The 3 Extension Types (Roles)

Extensions must explicitly declare their behavior type (`type`) in the manifest.

### Type A: `Tool` (The Standard Extension)

A `Tool` is an extension designed to perform a specific task (e.g., Currency Converter, Notes Manager).

- **Manifest Setup**: Usually `"callable": true, "caller": false`.
- **Requirement**: Must register an **Input Schema** and an **Output Schema**.
- **Behavior**: An Orchestrator can call the Currency `Tool` with predefined parameters (`{ from: "USD", to: "EUR", amount: 50 }`). Nuxy validates the payload against the schema before execution.

### Type B: `Provider` (Direct Omni-Input Modifier)

A `Provider` interacts directly with the user's keystrokes in real-time.

- **Manifest Setup**: Usually `"callable": false, "caller": false`.
- **Behavior**: As the user types into the OmniBar, Nuxy feeds the raw string to the `Provider`. The `Provider` returns an array of passive list items (results) to be shown in the dropdown. (e.g., App Launcher).

### Type C: `Orchestrator` ("Match Unmatched")

An `Orchestrator` is the ultimate fallback and execution engine (e.g., an AI/LLM extension).

- **Manifest Setup**: `"callable": false, "caller": true`.
- **Behavior**: If the user presses `Enter` on raw text without selecting a dropdown result, the input falls through to the Orchestrator.
- **Functionality**: The Orchestrator receives the raw text, uses `getCallableTools()` to fetch the schemas of all `callable: true` extensions, parses the user's intent (via Ollama/Functiongemma), and programmatically invokes the correct `Tool` using the `invoke()` API.

## 4. Input/Output Schema Validation Example

Nuxy Kernel acts as the validator.

### 4.1 Registering a Tool

```typescript
// backend.js of the Currency Extension
export function register(core: CoreContext) {
  core.registry.registerTool({
    name: 'currency_converter',
    schema: {
      input: { type: 'object', properties: { amount: { type: 'number' } }, required: ['amount'] },
      output: { type: 'object', properties: { result: { type: 'number' } } },
    },
    execute: async (payload) => {
      // Nuxy guarantees that `payload` matches the input schema perfectly.
      return { result: payload.amount * 1.5 }
    },
  })
}
```

### 4.2 Programmatic Invocation by an Orchestrator

```typescript
// backend.js of the AI Orchestrator Extension
export function register(core: CoreContext) {
  core.registry.registerOrchestrator(async (rawText) => {
    // 1. Get schemas of ONLY the extensions where manifest -> callable: true
    const availableTools = core.registry.getCallableTools!()

    // 2. The LLM decided to use the 'currency_converter' tool.
    try {
      // Nuxy will automatically validate the parameters before invoking it.
      const result = await core.extensions!.invoke('currency_converter', { amount: 100 })
      core.notify('Success', `Result: ${result.result}`)
    } catch (e) {
      console.error('Nuxy Validation Failed:', e)
    }
  })
}
```

## 5. Summary

By combining **Manifest Capabilities (`callable`, `caller`)** with strict **Extension Types (`Tool`, `Provider`, `Orchestrator`)**, Nuxy creates an impenetrable sandbox. The AI Orchestrator can confidently call Tools without crashing them, and standard Tools are strictly prevented from gaining unauthorized control over the system or other extensions.

---

## Related Documents

| Topic                               | Document                                                     | Notes                                              |
| ----------------------------------- | ------------------------------------------------------------ | -------------------------------------------------- |
| Plugin system and CoreContext proxy | [15-modular-plugin-system.md](./15-modular-plugin-system.md) | Thread isolation and extension loading sequence    |
| Frontend extension rendering        | [17-frontend-extensions.md](./17-frontend-extensions.md)     | Canvas zones for Provider dropdowns and Tool views |
