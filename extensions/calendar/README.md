# Calendar

> A full-featured calendar tool for creating, browsing, and searching events with optional reminders.

**Type:** `tool`
**Version:** 1.0.0
**ID:** `com.nuxy.calendar`
**Permissions:** `storage` `db`

---

## Overview

Calendar gives you a persistent event store inside Nuxy. Open it to browse a month grid, drill into a day to see its events, and create new events by typing a title in the omnibar. Reminder notifications fire automatically in the background at the configured offset before each event. It also acts as a callable target so orchestrators can pre-populate the create form from natural-language input.

---

## Extension Type

### `tool`
Appears in the Nuxy tool list. The user activates it by selecting **Calendar** from the shell, then browses the interactive month grid or searches with the omnibar.

---

## Usage

### Activation

Select **Calendar** from the tool list. The month grid opens immediately. Type in the omnibar at any time to search across upcoming events by title.

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↓` | Enter calendar mode (omnibox, empty query) |
| `↓` / `↑` | Navigate search results (omnibox, non-empty query) |
| `↑` `↓` `←` `→` | Navigate days in the month grid |
| `Enter` | Open the selected day (month view) |
| `↑` `↓` | Navigate events in day view |
| `Enter` | Open event detail |
| `S` | Return to search / omnibar |
| `Esc` | Go back one level (day → month, create/detail → day) |

Actions available via the Nuxy action palette:

| Action | Available when |
|--------|---------------|
| **New Event** | Month or day view |
| **Delete Event** | An event is selected in day view or detail view |
| **Save Event** | Create or detail view, no dropdown open |

### Examples

**Example 1 — Browse and open an event:**
Press `↓` from the omnibar to enter the calendar, navigate to a day with `←` `→` `↑` `↓`, press `Enter` to open the day, then `Enter` again on an event to see its detail.

**Example 2 — Create a new event:**
Navigate to the target day, select **New Event** from the action palette (or press `N` if bound), type the title in the omnibar, choose a time and reminder from the dropdowns, then select **Save Event**.

**Example 3 — Search events:**
Type any part of an event title in the omnibar. Matching events from the next 6 months are shown as a list. Press `Enter` on a result to jump to that day's detail view.

---

## Settings

Settings are accessible from the Nuxy **Settings** tool.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `defaultReminderMin` | select | `0` | Default reminder offset in minutes for new events (`0`, `5`, `10`, `15`, `30`, `60`) |
| `weekStart` | select | `1` (Monday) | First day of the week shown in the grid (`0` = Sunday, `1` = Monday) |

---

## Permissions

| Permission | Used for |
|------------|----------|
| `storage` | Persisting extension configuration |
| `db` | SQLite event store (`calendar` database) |

---

## Localization

| Locale | Language |
|--------|----------|
| `en` | English (default) |
| `tr` | Turkish |

To add a new locale, create `locales/<code>.json` and add the code to `locales.supported` in `manifest.json`.

---

## Platform & Environment

| Platform | Supported | Notes |
|----------|-----------|-------|
| Linux (X11) | Yes | |
| Linux (Wayland) | Yes | |
| macOS | Yes | |

---

## Cross-Extension Integration

### This extension can be called by other extensions

Set `capabilities.callable: true` in your manifest, then call it from another backend:

```ts
const result = await core.extensions.invoke('com.nuxy.calendar', 'calendar:prepare', {
  title: 'Team sync',
  date: '2026-06-15',
  time: '14:00',
})
```

**Exposed IPC channels:**

| Channel | Payload | Returns | Description |
|---------|---------|---------|-------------|
| `calendar:list` | `{ from?: number, to?: number }` | `CalendarEvent[]` | List all events, optionally filtered by Unix ms range |
| `calendar:create` | `{ title, datetime, notes?, remindMin? }` | `CalendarEvent` | Create a new event |
| `calendar:update` | `{ id, title?, datetime?, notes?, remindMin? }` | `CalendarEvent` | Update an existing event |
| `calendar:delete` | `{ id: string }` | `void` | Delete an event by ID |
| `calendar:prepare` | `{ title, date, time? }` | `{ success, data: { title, datetime } }` | Parse a natural-language date/time into a Unix timestamp |
| `calendar:getConfig` | `{}` | `{ defaultReminderMin, weekStart }` | Read current Calendar settings |
| `setLastResult` | `{ title?, datetime? }` | `{ ok: true }` | Pre-populate the create form on next open (used by orchestrators) |
| `getLastResult` | `{}` | `{ title?, datetime? } \| null` | Consume the pending pre-populated form data |

### This extension calls other extensions

Requires `capabilities.caller: true`. Currently calls:

- `kernel` → channel `notification:send` (fires reminder notifications)

---

## Manifest Reference

```json
{
  "id": "com.nuxy.calendar",
  "name": "Calendar",
  "version": "1.0.0",
  "type": "tool",
  "icon": "calendar",
  "permissions": ["storage", "db"],
  "capabilities": {
    "callable": true,
    "caller": true
  },
  "entry": {
    "backend": "backend.ts",
    "frontend": "frontend.tsx",
    "settings": "settings.json"
  },
  "locales": {
    "default": "en",
    "supported": ["en", "tr"]
  }
}
```
