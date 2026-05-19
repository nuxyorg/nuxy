# 04 - Extensions directory (`~/.nuxy/extensions`)

## 1. The Single Source of Truth

Nuxy itself is a blank slate. **Every single feature** must be placed into the extensions directory. 

- On Linux: `~/.nuxy/extensions/`
- On macOS: `~/Library/Application Support/nuxy/extensions/`
- On Windows: `%APPDATA%\nuxy\extensions\`

## 2. Extension Anatomy
An extension is a compiled bundle created by a developer anywhere in the world. It is a folder that contains the backend logic, frontend UI, and a manifest.

```text
~/.nuxy/extensions/com.example.spotify-controller/
├── manifest.json       # Defines ID, Name, Role, Permissions, Capabilities
├── dist/
│   ├── backend.js      # The Node.js logic executed inside the VM Sandbox
│   └── frontend.js     # The React UI (ESM format) loaded dynamically by the Core UI
└── icon.svg
```

## 3. The `manifest.json` Contract

The manifest is the gateway. The Kernel reads this before executing any code to determine the extension's behavior and security sandboxing. 

**Crucially, extensions must define their primary `type` (Role) and `capabilities` (Cross-Invocation Rules).**
- `type`: `tool` (Utility), `provider` (Real-time Dropdown), `orchestrator` (AI Fallback), `headless` (Background Daemon).
- `capabilities.callable`: `boolean`. Can this extension be invoked programmatically by other extensions (e.g. by the AI)?
- `capabilities.caller`: `boolean`. Is this extension allowed to invoke *other* extensions? 

```json
{
  "id": "com.example.spotify-controller",
  "name": "Spotify Mini Player",
  "version": "1.0.0",
  "type": "tool",
  "capabilities": {
    "callable": true,  
    "caller": false    
  },
  "entry": {
    "backend": "dist/backend.js", // Can also point to "dist/backend.wasm"
    "frontend": "dist/frontend.js"
  },
  "peerExtensions": {
    "com.nuxy.vault": "^1.0.0"   // Nuxy will not boot this extension if Vault is missing
  },
  "permissions": [
    "network"            
  ]
}
```

## 4. Distributing Extensions
Because extensions are standalone JavaScript bundles independent of the Nuxy codebase:
- Developers build them in their own repositories.
- Users download `.nuxyext` (a renamed `.zip` file) and place it in the directory.
- Nuxy's directory watcher detects the new folder, reads the manifest, sandboxes the backend, and mounts the React frontend instantly without restarting the application.

---

**Next Step:** [API Design](./05-api-design.md) | **Previous:** [Data Flow](./03-data-flow.md)
