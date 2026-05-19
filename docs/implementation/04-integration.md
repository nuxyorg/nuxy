# Implementation Phase 4: Dynamic UI Integration

## Goal
Connect the disparate external UIs onto the blank React canvas. The Nuxy frontend must dynamically fetch JS files from the user's hard drive and render them seamlessly.

## Step 1: The Custom Protocol Handler
In the Electron main process, you must register a protocol to serve files from `~/.nuxy/extensions/`. Browsers cannot fetch `file://` URIs due to security, so we need `nuxy-ext://`.

```typescript
// electron/main/protocol.ts
import { protocol, net } from 'electron';
import path from 'path';

export function registerProtocols() {
  protocol.handle('nuxy-ext', (request) => {
    // Example: nuxy-ext://com.nuxy.clipboard/dist/frontend.js
    const url = request.url.replace('nuxy-ext://', '');
    const extensionId = url.split('/')[0];
    const filePath = url.substring(extensionId.length + 1);
    
    // Resolve to the actual OS path
    const absolutePath = path.join(process.env.HOME, '.nuxy/extensions', extensionId, filePath);
    
    return net.fetch(`file://${absolutePath}`);
  });
}
```

## Step 2: The React Dynamic Loader
In the React frontend, create a component that takes an Extension ID and lazily loads it using the custom protocol.

```tsx
// src/components/ExtensionLoader.tsx
import React, { lazy, Suspense } from 'react';

interface Props {
  extensionId: string;
}

export function ExtensionLoader({ extensionId }: Props) {
  // Vite/Webpack must be configured to allow dynamic runtime imports
  // Ignore bundler warnings using /* @vite-ignore */ if necessary
  const ExtensionComponent = lazy(() => import(/* @vite-ignore */ `nuxy-ext://${extensionId}/dist/frontend.js`));

  return (
    <Suspense fallback={<div className="p-4 text-muted-foreground animate-pulse">Loading Extension {extensionId}...</div>}>
      <ExtensionComponent />
    </Suspense>
  );
}
```

## Step 3: The Empty Canvas Router
The main `App.tsx` is completely empty unless it receives a list of loaded extensions from the Kernel.

```tsx
// src/App.tsx
import { useState, useEffect } from 'react';
import { ExtensionLoader } from './components/ExtensionLoader';

export default function App() {
  const [activeExtension, setActiveExtension] = useState<string | null>(null);
  const [loadedExtensions, setLoadedExtensions] = useState<string[]>([]);

  useEffect(() => {
    // Get list of valid extensions from the backend
    window.core.ipc.invoke('system:getLoadedExtensions').then(res => {
      if (res.success && res.data.length > 0) {
        setLoadedExtensions(res.data);
        setActiveExtension(res.data[0]); // Default to first extension
      }
    });
  }, []);

  if (loadedExtensions.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
        <h2>Empty Shell. Please place extensions in ~/.nuxy/extensions/</h2>
      </div>
    );
  }

  return (
    <div className="bg-transparent h-screen w-screen flex items-center justify-center">
      <div className="bg-slate-900 rounded-xl shadow-2xl overflow-hidden w-[800px] h-[600px] flex">
        {/* Sidebar Navigation */}
        <nav className="w-16 bg-slate-800 flex flex-col items-center py-4 space-y-4 text-white">
          {loadedExtensions.map(extId => (
            <button key={extId} onClick={() => setActiveExtension(extId)}>
              {extId.substring(0, 2).toUpperCase()}
            </button>
          ))}
        </nav>
        
        {/* Module Render Area */}
        <main className="flex-1 relative">
          {activeExtension && <ExtensionLoader extensionId={activeExtension} />}
        </main>
      </div>
    </div>
  );
}
```

---

**Next Phase:** [05. Final Polish](./05-final-polish.md) | **Previous Phase:** [03. Feature Implementation](./03-feature-implementation.md)
