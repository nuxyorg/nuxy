# 09 - Error Handling

## 1. Unified Error Architecture
Error handling in desktop applications spanning multiple isolated threads (React UI, Nuxy Kernel, Extension Workers) is notoriously difficult. If an IPC call fails silently, the UI may enter an infinite loading state.

Nuxy solves this via a **Unified Error Boundary** architecture spanning three layers.

## 2. Layer 1: Kernel Message Broker Error Catcher
The Nuxy Kernel intercepts every message sent from the React UI to a Worker Thread, and every message sent between Worker Threads. If a Worker crashes or throws an exception, the Kernel catches it and standardizes the response.

```typescript
// electron/sandbox/MessageBroker.ts
export async function invokeWorker(targetId: string, payload: any) {
  try {
    // Validate Schema
    validateSchema(targetId, payload);
    
    // Send to worker via MessagePort
    const data = await sendToPort(targetId, payload);
    return { success: true, data };
  } catch (error: any) {
    console.error(`[Broker Error] ${targetId}:`, error);
    
    // Standardize the response sent back across the bridge
    return { 
      success: false, 
      error: error.message || 'Worker execution failed',
      code: error.code || 'INTERNAL_ERROR' 
    };
  }
}
```

## 3. Layer 2: Frontend UI Resilience
React components in `frontend.js` must always check the `success` boolean before proceeding. They must never assume an IPC call succeeded.

```typescript
// com.nuxy.notes/frontend.tsx
const handleSave = async () => {
  const res = await window.core.ipc.invoke('notes:add', { text });
  if (!res.success) {
    // Trigger Nuxy's global toast notification (via @nuxy/ui)
    toast({ title: 'Error', description: res.error, variant: 'destructive' });
    return;
  }
  // Proceed
};
```

## 4. Layer 3: React Error Boundaries
If a malicious or buggy extension's UI crashes (e.g., trying to map over a null array), React will unmount it. The Nuxy Core wraps every dynamically imported extension UI in an `<ErrorBoundary>`.

```tsx
// src/components/ExtensionLoader.tsx
import { ErrorBoundary } from '@nuxy/ui';

export function ExtensionLoader({ id }) {
  const ExtView = React.lazy(() => import(`nuxy-ext://${id}/dist/frontend.js`));

  return (
    <ErrorBoundary fallback={<div>The UI for this extension crashed.</div>}>
      <React.Suspense fallback={<div>Loading...</div>}>
         <ExtView />
      </React.Suspense>
    </ErrorBoundary>
  );
}
```
