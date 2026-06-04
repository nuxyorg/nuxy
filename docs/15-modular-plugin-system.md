# 15 - Gnome Extensions Style Deep Dive

## 1. "Nuxy Tek Başına Bir İşe Yaramamalı"

The core philosophy of Nuxy is that the executable itself is a completely useless shell. If `~/.nuxy/extensions/` is empty, Nuxy does absolutely nothing.

## 2. The Strict Isolation Loading Sequence

Nuxy treats every extension as potentially hostile. They must be isolated.

1. **User Starts Nuxy**: The Electron app boots. The React frontend is a blank `div`.
2. **Directory Scan**: The Kernel watches `~/.nuxy/extensions/`.
3. **Detection**: It finds `com.nuxy.currency`.
4. **Thread Spawning**: The Kernel spawns a dedicated **Node.js Web Worker** (`worker_threads`). It does not use `require()`. It passes the extension's code into this isolated thread.
5. **Context Injection**: Inside the Worker, the code has no access to `fs` or `http`. The Kernel provides a proxy `CoreContext` over a `MessagePort`.
6. **Schema Registration**: The extension registers its Input/Output schema by sending an IPC message back to the Kernel.
7. **UI Mounting**: The Kernel tells the React frontend to load the UI via dynamic `import()`. The imported React UI utilizes Nuxy's globally shared `@nuxy/ui` components (Shadcn) to render native-looking HTML elements onto the screen.

## 3. The Core Context (MessagePort Proxy)

The `CoreContext` the extension sees is actually just a facade that serializes requests and sends them to the Kernel.

```typescript
// @nuxy/core (NPM package for extension developers to get types)
export interface CoreContext {
  registry: {
    registerTool: (config: ToolConfig) => void
    // ...
  }
  extensions: {
    // Only available if 'caller: true' in manifest
    // Sends a message to the Kernel, which validates and routes to the target Worker.
    invoke?: (extensionName: string, params: any) => Promise<any>
  }
  storage: {
    // Kernel intercepts this, forcing path to ~/.nuxy/data/<ext_id>/
    read: <T>(key: string) => Promise<T>
    write: <T>(key: string, value: T) => Promise<void>
  }
}
```

## 4. Developing an Orchestrator & Tool (Cross-Communication)

Because of Worker Thread isolation, modules **never** touch each other.

### 4.1 The Tool (Currency Converter)

**Manifest**: `"callable": true, "caller": false`

```typescript
// Runs in Worker Thread A
export function register(core: CoreContext) {
  core.registry.registerTool({
    name: 'currency',
    schema: {
      /* ... */
    },
    execute: async (payload) => {
      // Executed only when the Kernel forwards a valid request to this thread
      return { result: payload.amt * 1.5 }
    },
  })
}
```

### 4.2 The Orchestrator (AI Match Unmatched)

**Manifest**: `"callable": false, "caller": true`

```typescript
// Runs in Worker Thread B
export function register(core: CoreContext) {
  core.registry.registerOrchestrator(async (rawTextInput) => {
    const tools = core.registry.getCallableTools!()
    const llmResponse = await ollama.functionCall(rawTextInput, tools)

    // Thread B asks the Kernel to invoke the Currency Tool.
    // Thread B has zero direct access to Thread A.
    const output = await core.extensions!.invoke(llmResponse.name, llmResponse.parameters)
    core.notify('AI Result', JSON.stringify(output))
  })
}
```

By enforcing **Hardware-Level Thread Isolation** and routing all communication through the Kernel's Message Broker, Nuxy guarantees absolute security. A compromised extension cannot read the memory of another extension, nor can it bypass the strict schema validation rules enforced by the Kernel.

---

## Related Documents

| Topic                                      | Document                                                 | Notes                                                      |
| ------------------------------------------ | -------------------------------------------------------- | ---------------------------------------------------------- |
| Omni-input arbitration and extension types | [16-omni-input-system.md](./16-omni-input-system.md)     | Tool / Provider / Orchestrator roles and schema validation |
| Frontend UI loading and shared UI kit      | [17-frontend-extensions.md](./17-frontend-extensions.md) | How extension frontends mount into Nuxy's React canvas     |
| Extension access and permission status     | [21-extension-access.md](./21-extension-access.md)       | Implemented vs planned APIs and manifest rules             |
| Store extension                            | [22-store-extension.md](./22-store-extension.md)         | Security chain for installing third-party extensions       |
| Security model and threat analysis         | [10-security.md](./10-security.md)                       | Chroot jails, thread isolation, permission prompts         |
