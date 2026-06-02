# n8n

> Browse, filter, and trigger n8n automation workflows directly from the Nuxy launcher.

**Type:** `tool`  
**Version:** 1.0.0  
**ID:** `com.nuxy.n8n`  
**Permissions:** `storage` `network`

---

## Overview

The n8n extension connects to a self-hosted [n8n](https://n8n.io) instance and lets you list all workflows, filter them by name, view recent executions, and fire webhook-triggered workflows without leaving Nuxy. Connection settings (base URL and API key) are saved to extension storage and survive restarts.

---

## Extension Type

### `tool`
Appears in the Nuxy tool list. The user activates it by selecting it from the shell, then interacts through the omnibar query and keyboard shortcuts.

---

## Usage

### Activation

Select **n8n** from the tool list. On first launch the configuration panel opens automatically. Enter the base URL of your n8n instance and an API key, then press `⌃ Enter` to save. The workflow list loads immediately if the connection succeeds.

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↑` `↓` | Navigate the workflow list |
| `Enter` | Select workflow and show recent executions |
| `⌃ ,` | Toggle the connection configuration panel |
| `⌃ Enter` | Save configuration |
| `Esc` | Cancel / close configuration panel |

### Examples

**Example 1 — Browse all workflows:**
Open the n8n tool. All active and inactive workflows from your n8n instance are listed. Active workflows display a green badge; inactive ones display a grey badge.

**Example 2 — Filter by name:**
Type `backup` in the omnibar to narrow the list to workflows whose names contain "backup".

**Example 3 — View executions:**
Press `Enter` on a workflow to load its five most recent execution records with status and start time.

**Example 4 — Trigger a webhook:**
With a workflow highlighted, the **Run Webhook** action in the command palette fires a POST request to `<base-url>/webhook/<workflow-id>`.

---

## Settings

Settings are accessible from the Nuxy **Settings** tool.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `baseUrl` | text | `http://localhost:5678` | URL where the n8n server is running |
| `apiKey` | text | `` | API key used to authenticate with the n8n REST API (`X-N8N-API-KEY` header) |

---

## Permissions

| Permission | Used for |
|------------|----------|
| `storage` | Persisting `baseUrl` and `apiKey` across restarts |
| `network` | Calling the n8n REST API (`/api/v1/workflows`, `/api/v1/executions`) and webhook endpoints |

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

All platforms supported by Nuxy. Requires network access to your n8n instance.

---

## Requirements

| Requirement | Minimum version | Install |
|-------------|-----------------|---------|
| n8n | 1.0 | [n8n.io/docs](https://docs.n8n.io/hosting/) |

A valid n8n API key must be generated in your n8n instance under **Settings → API**.

---

## IPC Channels

| Channel | Payload | Returns | Description |
|---------|---------|---------|-------------|
| `n8n:configure` | `{ baseUrl: string, apiKey: string }` | `void` | Save connection settings |
| `n8n:getConfig` | — | `{ baseUrl: string, apiKey: string }` | Read current connection settings |
| `n8n:status` | — | `{ ok: boolean, version?: string }` | Check if n8n is reachable |
| `n8n:listWorkflows` | — | `N8nWorkflow[]` | List all workflows |
| `n8n:triggerWebhook` | `{ webhookPath: string, payload?: object }` | `{ status: number, body: unknown }` | POST to a webhook URL |
| `n8n:executions` | `{ workflowId: string, limit?: number }` | `N8nExecution[]` | List recent executions for a workflow |

---

## Manifest Reference

```json
{
  "id": "com.nuxy.n8n",
  "name": "n8n",
  "version": "1.0.0",
  "type": "tool",
  "icon": "workflow",
  "permissions": ["storage", "network"],
  "capabilities": {
    "callable": false,
    "caller": false
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
