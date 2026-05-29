# Extension Scan Report

Generated on: 2026-05-29T22:50:34.523Z

## Extension: `bitwarden` (Type: tool)
- **Backend**: ✅ Yes
- **Frontend**: ✅ Yes
- **Backend Test**: ✅ Yes

| File | Rule | Message | Severity |
| --- | --- | --- | --- |
| `frontend.tsx:183` | **No Hardcoded Styles** | Found hardcoded style/color: "<div style={{ padding: '24px', fontSize: '13px', opacity: 0.85 }}>". Use CSS variables/theme tokens instead. | `medium` |
| `frontend.tsx:226` | **No HTML Button Elements** | Frontend contains raw <button> element: "<Button onClick={() => setActiveTab('arch')} variant={activeTab === 'arch' ? 'primary' : 'ghost'}>". Use window.UI.Button instead. | `high` |
| `frontend.tsx:232` | **No HTML Button Elements** | Frontend contains raw <button> element: "<Button onClick={() => setActiveTab('debian')} variant={activeTab === 'debian' ? 'primary' : 'ghost'}>". Use window.UI.Button instead. | `high` |
| `frontend.tsx:238` | **No HTML Button Elements** | Frontend contains raw <button> element: "<Button onClick={() => setActiveTab('macos')} variant={activeTab === 'macos' ? 'primary' : 'ghost'}>". Use window.UI.Button instead. | `high` |
| `frontend.tsx:247` | **No Hardcoded Styles** | Found hardcoded style/color: "<Card style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>". Use CSS variables/theme tokens instead. | `medium` |
| `frontend.tsx:268` | **No HTML Button Elements** | Frontend contains raw <button> element: "<Button". Use window.UI.Button instead. | `high` |
| `frontend.tsx:296` | **No HTML Button Elements** | Frontend contains raw <button> element: "<Button onClick={() => ipc('bw:copyText', { text: 'sudo apt install rbw' }).catch(() => {})}>". Use window.UI.Button instead. | `high` |
| `frontend.tsx:322` | **No HTML Button Elements** | Frontend contains raw <button> element: "<Button onClick={() => ipc('bw:copyText', { text: 'brew install rbw' }).catch(() => {})}>". Use window.UI.Button instead. | `high` |
| `frontend.tsx:332` | **No HTML Button Elements** | Frontend contains raw <button> element: "<Button onClick={refreshStatus}>Kurulumu Tamamladım, Yeniden Denetle</Button>". Use window.UI.Button instead. | `high` |
| `frontend.tsx:363` | **No Hardcoded Styles** | Found hardcoded style/color: "<Card style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>". Use CSS variables/theme tokens instead. | `medium` |
| `frontend.tsx:367` | **No HTML Input Elements** | Frontend contains raw <input> element: "<Input". All text input must come through the shell's omnibar query. | `high` |
| `frontend.tsx:383` | **No HTML Button Elements** | Frontend contains raw <button> element: "<Button onClick={handleSaveEmail} disabled={isConfiguring}>". Use window.UI.Button instead. | `high` |
| `frontend.tsx:387` | **No HTML Button Elements** | Frontend contains raw <button> element: "<Button onClick={() => setEditingEmail(false)} disabled={isConfiguring}>". Use window.UI.Button instead. | `high` |
| `frontend.tsx:423` | **No Hardcoded Styles** | Found hardcoded style/color: "<Card style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>". Use CSS variables/theme tokens instead. | `medium` |
| `frontend.tsx:440` | **No HTML Button Elements** | Frontend contains raw <button> element: "<Button onClick={handleUnlock} disabled={isUnlocking \|\| isSyncing}>". Use window.UI.Button instead. | `high` |
| `frontend.tsx:443` | **No HTML Button Elements** | Frontend contains raw <button> element: "<Button onClick={handleSync} disabled={isUnlocking \|\| isSyncing}>". Use window.UI.Button instead. | `high` |
| `frontend.tsx:446` | **No HTML Button Elements** | Frontend contains raw <button> element: "<Button onClick={refreshStatus} disabled={isUnlocking \|\| isSyncing}>". Use window.UI.Button instead. | `high` |
| `frontend.tsx:449` | **No HTML Button Elements** | Frontend contains raw <button> element: "<Button". Use window.UI.Button instead. | `high` |
| `frontend.tsx:479` | **No HTML Button Elements** | Frontend contains raw <button> element: "<Button onClick={() => ipc('bw:copyText', { text: 'rbw unlock' }).catch(() => {})}>Kopyala</Button>". Use window.UI.Button instead. | `high` |
| `frontend.tsx:504` | **No HTML Button Elements** | Frontend contains raw <button> element: "<Button onClick={() => copyPassword(item)}>". Use window.UI.Button instead. | `high` |
| `frontend.tsx:507` | **No HTML Button Elements** | Frontend contains raw <button> element: "<Button onClick={() => copyUsername(item)}>". Use window.UI.Button instead. | `high` |
| `frontend.tsx:510` | **No HTML Button Elements** | Frontend contains raw <button> element: "<Button onClick={() => copyTotp(item)}>". Use window.UI.Button instead. | `high` |

---

## Extension: `emoji-picker` (Type: tool)
- **Backend**: ✅ Yes
- **Frontend**: ✅ Yes
- **Backend Test**: ✅ Yes

| File | Rule | Message | Severity |
| --- | --- | --- | --- |
| `frontend.tsx:450` | **No Emojis in UI** | Found emoji character: "★". Use icon components from window.UI instead. | `medium` |
| `frontend.tsx:461` | **No Hardcoded Styles** | Found hardcoded style/color: "style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 8px' }}". Use CSS variables/theme tokens instead. | `medium` |
| `frontend.tsx:518` | **No Hardcoded Styles** | Found hardcoded style/color: "style={{ padding: '4px 12px', fontSize: 12, opacity: 0.5, fontWeight: 500 }}". Use CSS variables/theme tokens instead. | `medium` |
| `frontend.tsx` | **Undeclared Permission (network)** | Uses fetch() but "network" permission is not declared in manifest.json | `high` |

---

## Extension: `n8n` (Type: tool)
- **Backend**: ✅ Yes
- **Frontend**: ✅ Yes
- **Backend Test**: ✅ Yes

| File | Rule | Message | Severity |
| --- | --- | --- | --- |
| `frontend.tsx:135` | **No HTML Input Elements** | Frontend contains raw <input> element: "<Input". All text input must come through the shell's omnibar query. | `high` |
| `frontend.tsx:143` | **No HTML Input Elements** | Frontend contains raw <input> element: "<Input". All text input must come through the shell's omnibar query. | `high` |
| `frontend.tsx:152` | **No HTML Button Elements** | Frontend contains raw <button> element: "<Button onClick={() => { void handleSaveConfig() }}>Save</Button>". Use window.UI.Button instead. | `high` |
| `frontend.tsx:155` | **No HTML Button Elements** | Frontend contains raw <button> element: "<Button onClick={() => setShowConfig(false)}>Cancel</Button>". Use window.UI.Button instead. | `high` |
| `frontend.tsx:169` | **No HTML Button Elements** | Frontend contains raw <button> element: "<SectionHeader title="Workflows" action={Button ? <Button onClick={() => { void handleRefresh() }} disabled={loading}>{loading ? '…' : 'Refresh'}</Button> : undefined} />". Use window.UI.Button instead. | `high` |
| `frontend.tsx:188` | **No HTML Button Elements** | Frontend contains raw <button> element: "<Button onClick={() => { void handleRunWebhook(wf) }}>Run</Button>". Use window.UI.Button instead. | `high` |

---

## Extension: `notes` (Type: tool)
- **Backend**: ✅ Yes
- **Frontend**: ✅ Yes
- **Backend Test**: ✅ Yes

| File | Rule | Message | Severity |
| --- | --- | --- | --- |
| `frontend.tsx:170` | **No HTML Button Elements** | Frontend contains raw <button> element: "action={Button ? <Button onClick={() => { void handleNew() }}>+</Button> : undefined}". Use window.UI.Button instead. | `high` |
| `frontend.tsx:197` | **No HTML Input Elements** | Frontend contains raw <input> element: "<Input". All text input must come through the shell's omnibar query. | `high` |
| `frontend.tsx:203` | **No HTML Textarea Elements** | Frontend contains raw <textarea> element: "<textarea". | `high` |
| `frontend.tsx:222` | **No HTML Button Elements** | Frontend contains raw <button> element: "{Button && <Button onClick={() => { void handleSave() }}>Save</Button>}". Use window.UI.Button instead. | `high` |
| `frontend.tsx:223` | **No HTML Button Elements** | Frontend contains raw <button> element: "{Button && <Button onClick={() => { void handleDelete() }}>Delete</Button>}". Use window.UI.Button instead. | `high` |
| `frontend.tsx:226` | **No HTML Button Elements** | Frontend contains raw <button> element: "<Button". Use window.UI.Button instead. | `high` |

---

## Extension: `ollama` (Type: orchestrator)
- **Backend**: ✅ Yes
- **Frontend**: ✅ Yes
- **Backend Test**: ✅ Yes

| File | Rule | Message | Severity |
| --- | --- | --- | --- |
| `frontend.tsx:136` | **No HTML Textarea Elements** | Frontend contains raw <textarea> element: "<textarea". | `high` |
| `frontend.tsx:160` | **No HTML Button Elements** | Frontend contains raw <button> element: "<Button onClick={() => { void handleSend() }} disabled={loading \|\| !input.trim()}>". Use window.UI.Button instead. | `high` |

---

## Extension: `shell` (Type: tool)
- **Backend**: ✅ Yes
- **Frontend**: ✅ Yes
- **Backend Test**: ✅ Yes

| File | Rule | Message | Severity |
| --- | --- | --- | --- |
| `frontend.tsx:622` | **No Emojis in UI** | Found emoji character: "'🔍'". Use icon components from window.UI instead. | `medium` |
| `frontend.tsx:632` | **No HTML Input Elements** | Frontend contains raw <input> element: "<input". All text input must come through the shell's omnibar query. | `high` |

---

## Extension: `ui-default` (Type: uikit)
- **Backend**: ❌ No
- **Frontend**: ❌ No
- **Backend Test**: ❌ No

| File | Rule | Message | Severity |
| --- | --- | --- | --- |
| `frontend.js` | **TypeScript only (No .js)** | JavaScript source files are banned. All source files must be TypeScript. | `high` |

---

## Extension: `video-downloader` (Type: tool)
- **Backend**: ✅ Yes
- **Frontend**: ✅ Yes
- **Backend Test**: ✅ Yes

| File | Rule | Message | Severity |
| --- | --- | --- | --- |
| `frontend.tsx:240` | **No HTML Button Elements** | Frontend contains raw <button> element: "<Button onClick={() => { void cancelJob(job.jobId) }}>Cancel</Button>". Use window.UI.Button instead. | `high` |

---

