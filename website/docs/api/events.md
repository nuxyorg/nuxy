---
title: Events API
---

# Events API

The Events API provides a global event broadcasting bridge between extensions and the shell frontend. It is exposed via `window.core.events`.

## Broadcasting Events

Extensions can emit custom events that other extensions or the shell can listen to.

```ts
// Emit an event with an optional payload
window.core.events.emit('custom-event', { someData: true })
```

## Listening to Events

Extensions can listen to global events emitted by the shell or other extensions.

```ts
const handleMyEvent = (payload) => {
  console.log('Received event data:', payload)
}

// Subscribe to the event
window.core.events.on('custom-event', handleMyEvent)

// Later, unsubscribe to prevent memory leaks
window.core.events.off('custom-event', handleMyEvent)
```

## Shell Events

The Nuxy shell emits specific standard events that frontend tools can hook into:

| Event Name        | Payload              | Description                                                                                                         |
| :---------------- | :------------------- | :------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `omniBar-keydown` | `KeyboardEvent` data | Fired when keyboard input happens while the omnibar is hidden. Useful for global keyboard shortcuts within the app. |
| `omniBar-control` | `{ action: 'show'    | 'hide' }`                                                                                                           | Fired when a tool requests to programmatically show or hide the omnibar. |

For IPC communication between the backend and frontend, see the [IPC API](/api/ipc). The Events API is intended for frontend-to-frontend broadcasting.
