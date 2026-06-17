// Extension frontend — resolved at runtime via ~ext Vite alias
// The file registers a custom element; no default export expected.
declare module '~ext/frontend.ts' {}

// IPC mock data — provided by virtual:ext-mocks Vite plugin
declare module 'virtual:ext-mocks' {
  const mocks: Record<string, unknown>
  export default mocks
}

// Registers ui-default's custom elements as a side effect — provided by
// the virtual:ui-register Vite plugin.
declare module 'virtual:ui-register' {}

declare module 'virtual:shell-frontend' {}
