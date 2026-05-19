# Implementation Phase 3: Extension Authoring

## Goal
Prove that the Nuxy Shell works by building the first features **completely outside** of the Nuxy repository, just as any third-party developer would.

## Step 1: Create an Independent Extension Repository
Do not write this code in the Nuxy core repo. Create a new directory anywhere on your computer.

```bash
mkdir nuxy-ext-clipboard
cd nuxy-ext-clipboard
npm init -y
npm install -D typescript @types/react @types/node vite
```

## Step 2: The `manifest.json`
Define the extension's metadata and required permissions.
```json
{
  "id": "com.nuxy.clipboard",
  "name": "Clipboard Manager",
  "version": "1.0.0",
  "entry": {
    "backend": "dist/backend.js",
    "frontend": "dist/frontend.js"
  },
  "permissions": ["storage"]
}
```

## Step 3: The Sandboxed Backend
Create `src/backend.ts`. This code will be executed by Nuxy's V8 VM Sandbox.

```typescript
// Imports must be types only, or bundled by your bundler. 
// You cannot require('fs') at runtime in the VM.
import type { CoreContext } from '@nuxy/core';

export function register(core: CoreContext) {
  // Use the safe, sandboxed storage provided by Nuxy
  core.ipc.handle('clipboard:getHistory', async () => {
    return await core.storage.read('history.json');
  });

  // Example: Emit a fake clipboard event every 5 seconds
  setInterval(() => {
    core.ipc.broadcast('clipboard:new', { text: 'Fake copied text' });
  }, 5000);
}
```

## Step 4: The React Frontend
Create `src/frontend.tsx`.

```tsx
import React, { useEffect, useState } from 'react';

// Must be exported as default for React.lazy to work seamlessly
export default function ClipboardView() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    // Calling the generic IPC bridge setup by the Nuxy Host
    window.core.ipc.invoke('clipboard:getHistory').then(res => {
      if(res.success) setHistory(res.data);
    });

    const unsub = window.core.ipc.on('clipboard:new', (data) => {
       setHistory(prev => [data, ...prev]);
    });
    return unsub;
  }, []);

  return (
    <div className="p-4 text-white">
      <h2>Clipboard History</h2>
      {history.map((item, i) => <div key={i}>{item.text}</div>)}
    </div>
  );
}
```

## Step 5: Compilation & Deployment
Compile your extension using Vite/Rollup to emit ESM modules.
Copy the `dist/` folder and `manifest.json` into:
`~/.nuxy/extensions/com.nuxy.clipboard/`

If you built the Nuxy Shell correctly in Phase 2, the app will instantly detect the folder, sandbox the backend, and render the UI.

---

**Next Phase:** [04. Integration](./04-integration.md) | **Previous Phase:** [02. Core Infrastructure](./02-core-infrastructure.md) | **Reference:** [Modular Plugin System](../15-modular-plugin-system.md)
