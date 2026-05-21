# 11 - Performance

## 1. The Invisible Daemon Problem

Because Nuxy is a launcher designed to be instantly available via a hotkey (`Alt+Space`), the Electron process must run constantly in the background. If the React frontend constantly triggers re-renders or the Backend holds onto memory, the app becomes a "resource hog".

## 2. Nuxy Kernel Optimization

### 2.1 Window Throttling

When the user hides Nuxy, the window should not be destroyed (as recreating it takes >500ms). Instead, we hide it and instruct Chromium to pause rendering.

```typescript
// electron/main/WindowManager.ts
export function hideWindow(win: BrowserWindow) {
  win.hide()
  // Drops renderer FPS to 1 and pauses non-essential timers
  win.webContents.setBackgroundThrottling(true)
}
```

### 2.2 Free Parallelism (Worker Threads)

In the legacy codebase, scanning the hard drive for installed applications blocked the main thread.

In the new Empty Shell architecture, the **App Launcher is an extension**. All extension backends are inherently spawned inside dedicated `Worker` threads. Therefore, scanning `/usr/share/applications` is automatically offloaded from the main thread. The Nuxy Kernel remains 100% responsive while extensions perform heavy compute tasks in parallel.

## 3. React Frontend Optimization

### 3.1 Avoiding Wasted Renders

Because extensions use `@nuxy/ui` (Shadcn), components are highly optimized. However, extensions rendering large lists (like Clipboard History) must use virtualization or `React.memo` to prevent lag when the user types in the OmniBar.

### 3.2 Dynamic Import Caching

When Nuxy loads an extension UI via `import('nuxy-ext://...')`, the Chromium V8 engine compiles the JS. Nuxy caches these dynamic imports so that switching between the App Launcher and the Notes module is instantaneous after the first load.

```tsx
// src/App.tsx
// Using a hidden tab system keeps extension UIs mounted in the DOM
// (display: none) when navigating, rather than completely unmounting them.
<div style={{ display: activeExt === 'com.notes' ? 'block' : 'none' }}>
  <ExtensionLoader id="com.notes" />
</div>
```
