/** Lit re-exports for renderer / extension frontends only — not imported by Electron main or workers. */
export type {
  ReactiveController,
  ReactiveControllerHost,
  PropertyValues,
} from '@lit/reactive-element'
export type { TemplateResult } from 'lit-html'

export * from 'lit'
export * from 'lit/decorators.js'
export * from 'lit/directives/ref.js'
export { unsafeHTML } from 'lit/directives/unsafe-html.js'
