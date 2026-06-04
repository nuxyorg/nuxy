# Static / Hardcoded Color Inventory

Bu dosya, `var(--token)` yerine doğrudan `rgba()` veya `#hex` yazılmış tüm yerleri listeler.

---

## `extensions/ui-default/src/components/`

### `Tag/index.css`

- **:7–8** — `rgba(255,255,255,.07)`, `rgba(255,255,255,.1)` (default tag bg/border)
- **:45–46** — `rgba(42,192,255,.12)`, `rgba(42,192,255,.25)` (cyan variant)
- **:50–51** — `rgba(204,255,45,.1)`, `rgba(204,255,45,.2)` (green variant)
- **:55–56** — `rgba(249,103,43,.1)`, `rgba(249,103,43,.2)` (orange variant)
- **:60–61** — `rgba(255,29,100,.1)`, `rgba(255,29,100,.2)` (red variant)

### `Code/index.css`

- **:7–8** — `rgba(255,255,255,.07)`, `rgba(255,255,255,.1)`
- **:16–17** — `rgba(0,0,0,.3)`, `rgba(255,255,255,.08)`
- **:27–28** — `rgba(255,255,255,.06)`, `rgba(255,255,255,.02)`

### `MarkdownText/index.css`

- **:72** — `rgba(255,255,255,.1)` (hr border)
- **:79** — `rgba(255,255,255,.15)` (blockquote border)
- **:81** — `rgba(255,255,255,.03)` (blockquote bg)
- **:91–92** — `rgba(255,255,255,.07)`, `rgba(255,255,255,.1)` (inline code)
- **:111** — `rgba(122,162,247,.4)` (link underline)

### `Modal/index.css`

- **:4** — `rgba(0,0,0,.7)` (backdrop)
- **:25** — `rgba(255,255,255,.08)` (border)
- **:28–29** — `rgba(0,0,0,.5)`, `rgba(0,0,0,.4)` (box-shadow)
- **:62** — `rgba(255,255,255,.06)` (header border-bottom)
- **:87** — `rgba(255,255,255,.05)` (body bg)
- **:101** — `rgba(255,255,255,.06)` (footer border-top)
- **:105** — `rgba(255,255,255,.01)` (footer bg)

### `Divider/index.css`

- **:3** — `rgba(255,255,255,.08)` (horizontal)
- **:10** — `rgba(255,255,255,.08)` (vertical)
- **:30** — `rgba(255,255,255,.08)` (label variant bg)

### `Tabs/index.css`

- **:9** — `rgba(255,255,255,.08)` (tab list border-bottom)
- **:75** — `rgba(255,255,255,.08)` (border)
- **:89–90** — `rgba(255,255,255,.05)`, `rgba(255,255,255,.15)` (hover)
- **:96, :160** — `#000` (active tab text)

### `IconButton/index.css`

- **:33** — `rgba(255,255,255,.07)` (ghost hover)
- **:37** — `rgba(255,255,255,.12)` (ghost active)
- **:41** — `rgba(255,255,255,.05)` (subtle variant)
- **:46** — `rgba(255,29,100,.1)` (destructive variant)

### `Card/index.css`

- **:5** — `rgba(0,0,0,.25)` (box-shadow)
- **:21** — `rgba(255,255,255,.01)` (header bg)
- **:26** — `rgba(255,255,255,.05)` (header border-bottom)
- **:36–37** — `rgba(255,255,255,.05)`, `rgba(255,255,255,.01)` (footer)

### `ProgressBar/index.css`

- **:18** — `rgba(255,255,255,.08)` (track)
- **:84, :96** — `rgba(255,255,255,.06)` (shimmer gradient)
- **:127** — `rgba(255,255,255,.03)`
- **:134** — `rgba(42,192,255,.05)` (info variant bg)
- **:139** — `rgba(255,170,1,.05)` (warning variant bg)
- **:144** — `rgba(255,29,100,.05)` (error variant bg)
- **:149** — `rgba(204,255,45,.04)` (success variant bg)

### `CircularProgress/index.css`

- **:13** — `rgba(255,255,255,.08)` (track stroke)
- **:51, :53** — `rgba(255,29,100,.2)`, `rgba(255,29,100,.02)` (error state)
- **:86** — `rgba(255,255,255,.08)` (separator border)
- **:90** — `rgba(42,192,255,.15)` (info variant)
- **:94** — `rgba(255,170,1,.12)` (warning variant)
- **:98** — `rgba(255,29,100,.12)` (error variant)
- **:102** — `rgba(204,255,45,.1)` (success variant)

### `SelectBox/index.css`

- **:55** — `rgba(255,255,255,.08)` (dropdown border)
- **:58–59** — `rgba(0,0,0,.25)`, `rgba(0,0,0,.55)` (dropdown shadow)
- **:69** — `rgba(255,255,255,.06)` (search border-bottom)
- **:117** — `rgba(255,255,255,.07)` (item hover)

### `Table/index.css`

- **:4** — `rgba(255,255,255,.08)` (table border)
- **:21–22** — `rgba(255,255,255,.08)`, `rgba(255,255,255,.01)` (header)
- **:29** — `rgba(255,255,255,.06)` (row border)
- **:42** — `rgba(255,255,255,.03)` (row hover)
- **:88, :90** — `rgba(255,255,255,.06)`, `rgba(255,255,255,.02)` (expanded row)

### `DropdownMenu/index.css`

- **:13** — `rgba(255,255,255,.08)` (border)
- **:15** — `rgba(0,0,0,.3)` (shadow)
- **:65** — `rgba(255,255,255,.06)` (item hover)
- **:75** — `rgba(255,29,100,.08)` (destructive hover)
- **:86** — `rgba(255,255,255,.06)` (group label bg)

### `Collapsible/index.css`

- **:53** — `rgba(255,255,255,.06)` (content border-top)

### `Tooltip/index.css`

- **:22** — `rgba(255,255,255,.08)` (border)

### `Alert/index.css`

- **:9–10** — `rgba(220,50,50,.08)`, `rgba(220,50,50,.2)` (error)
- **:15–16** — `rgba(234,179,8,.08)`, `rgba(234,179,8,.2)` (warning)
- **:21–22** — `rgba(59,130,246,.08)`, `rgba(59,130,246,.2)` (info)
- **:27–28** — `rgba(34,197,94,.08)`, `rgba(34,197,94,.2)` (success)

### `Avatar/index.css`

- **:90** — `rgba(255,255,255,.1)` (overlay)

### `FileInput/index.css`

- **:27** — `rgba(42,192,255,.04)` (drag-over bg)
- **:32** — `rgba(255,255,255,.1)` (drag-over border)
- **:70** — `rgba(255,255,255,.04)` (file item bg)

### `NumberInput/index.css`

- **:36** — `rgba(255,255,255,.05)` (button hover)

### `PinInput/index.css`

- **:28** — `rgba(255,255,255,.2)` (focused border)

### `Checkbox/index.css`

- **:40** — `stroke: #000` (checkmark)

### `Toaster/index.css`

- **:19** — `rgba(0,0,0,.2)` (shadow)

### `Icon/index.tsx`

- **:80** — `color: '#e55'` (error icon fallback, inline TS)

---

## `extensions/shell/shell.css`

- **:68** — `box-shadow: 0 25px 50px -12px rgba(0,0,0,.5)`
- **:79** — `box-shadow` içinde `rgba(0,0,0,.6)`
- **:117–118** — `rgba(0,0,0,.6)`, `rgba(180,100,255,.4)` (glow)
- **:137–141** — conic-gradient: `rgba(255,255,255,0/1/0)`, shadow `rgba(255,255,255,.15)`
- **:343** — `box-shadow: 0 20px 40px -10px rgba(0,0,0,.5)`
- **:471–473** — shimmer gradient: `rgba(255,255,255,.015/.05/.015)`
- **:510–511** — `rgba(255,255,255,.02)`, `rgba(255,255,255,.06)`
- **:525–526** — `rgba(255,255,255,.04)`, `rgba(255,255,255,.12)`
- **:563–564** — `rgba(255,255,255,.02)`, `rgba(255,255,255,.06)`
- **:576–577** — `rgba(255,255,255,.12)`, `rgba(255,255,255,.04)`
- **:589–590** — `rgba(255,255,255,.01)`, `rgba(255,255,255,.06)` (dashed border)

---

## `extensions/shortcut-overlay/hooks/useShortcutOverlay.ts`

- **:26** — `box-shadow: 0 8px 32px rgba(0,0,0,0.5)` — `var()`'a sarılmamış

---

## `packages/ui/src/components/EmptyState/index.tsx`

`var(--token, #fallback)` formatında yazılmış — teknik olarak kasıtlı fallback'ler, fakat tema dışı kalabilir:

- **:26** — `var(--text-muted, #a1a1aa)`
- **:28** — `var(--surface-1, #09090b)`
- **:40** — `var(--text-primary, #f4f4f5)`
- **:52** — `var(--text-muted, #a1a1aa)`
- **:63** — `var(--text-subtle, #71717a)`
- **:74** — `var(--surface-2, #27272a)`
- **:76** — `var(--error, #ef4444)`
