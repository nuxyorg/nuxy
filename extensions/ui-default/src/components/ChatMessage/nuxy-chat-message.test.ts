// @vitest-environment happy-dom

import { describe, it, expect, beforeEach } from 'vitest'
import { render, html } from '@nuxyorg/core'
import './nuxy-chat-message.ts'
import type { NuxyChatMessageElement } from './nuxy-chat-message.ts'

describe('nuxy-chat-message', () => {
  let parent: HTMLDivElement

  beforeEach(() => {
    parent = document.createElement('div')
    document.body.replaceChildren(parent)
  })

  it('renders markdown content for an assistant message', async () => {
    render(html`<nuxy-chat-message role="assistant" content="hi"></nuxy-chat-message>`, parent)
    const msg = parent.querySelector('nuxy-chat-message') as NuxyChatMessageElement
    await msg.updateComplete
    expect(msg.shadowRoot?.querySelector('nuxy-markdown-text')).not.toBeNull()
  })

  it('shows an inline spinner instead of an empty bubble while loading with no content yet', async () => {
    render(
      html`<nuxy-chat-message role="assistant" content="" ?loading=${true}></nuxy-chat-message>`,
      parent
    )
    const msg = parent.querySelector('nuxy-chat-message') as NuxyChatMessageElement
    await msg.updateComplete
    expect(msg.shadowRoot?.querySelector('nuxy-spinner')).not.toBeNull()
    expect(msg.shadowRoot?.querySelector('nuxy-markdown-text')).toBeNull()
  })

  it('does not show the spinner once content has started streaming in', async () => {
    render(
      html`<nuxy-chat-message role="assistant" content="Hel" ?loading=${true}></nuxy-chat-message>`,
      parent
    )
    const msg = parent.querySelector('nuxy-chat-message') as NuxyChatMessageElement
    await msg.updateComplete
    expect(msg.shadowRoot?.querySelector('nuxy-spinner')).toBeNull()
    expect(msg.shadowRoot?.querySelector('nuxy-markdown-text')).not.toBeNull()
  })

  it('does not show the spinner for a user message even if empty and loading', async () => {
    render(
      html`<nuxy-chat-message role="user" content="" ?loading=${true}></nuxy-chat-message>`,
      parent
    )
    const msg = parent.querySelector('nuxy-chat-message') as NuxyChatMessageElement
    await msg.updateComplete
    expect(msg.shadowRoot?.querySelector('nuxy-spinner')).toBeNull()
  })

  it('shows the model name next to the role label when set', async () => {
    render(
      html`<nuxy-chat-message role="assistant" content="hi" model="llama3"></nuxy-chat-message>`,
      parent
    )
    const msg = parent.querySelector('nuxy-chat-message') as NuxyChatMessageElement
    await msg.updateComplete
    expect(msg.shadowRoot?.querySelector('.nuxy-chat-message__role')?.textContent).toContain(
      'llama3'
    )
  })

  it('omits the model suffix when no model is set', async () => {
    render(html`<nuxy-chat-message role="assistant" content="hi"></nuxy-chat-message>`, parent)
    const msg = parent.querySelector('nuxy-chat-message') as NuxyChatMessageElement
    await msg.updateComplete
    expect(msg.shadowRoot?.querySelector('.nuxy-chat-message__role')?.textContent?.trim()).toBe(
      'Assistant'
    )
  })
})
