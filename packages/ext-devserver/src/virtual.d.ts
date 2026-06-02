// Extension frontend — resolved at runtime via ~ext Vite alias
declare module '~ext/frontend.tsx' {
  import type { ComponentType } from 'react'
  const Frontend: ComponentType<{ query: string }>
  export default Frontend
}

// IPC mock data — provided by virtual:ext-mocks Vite plugin
declare module 'virtual:ext-mocks' {
  const mocks: Record<string, unknown>
  export default mocks
}
