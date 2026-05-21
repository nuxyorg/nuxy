# Extension System v2 — Architecture & Refactor Plan

## Motivation

Mevcut extension frontend'leri:
- Keyfi div/span/style kullanıyor; ortak bir yapı yok
- Her extension kendi klavye event listener'ını yönetiyor (`nuxy-shell-omni-bar-keydown`)
- Footer hint'leri JSX olarak manuel ekleniyor
- Büyük veri (emoji listesi vb.) frontend.js içinde inline duruyor
- Extension component'i extensionId'ye erişemiyor, dolayısıyla kendi asset'lerini yükleyemiyor

Bu plan:
1. **Declarative Keyboard API** ile keyboard handling'i shell'e devrediyor
2. **UI Kit genişletmesi** ile extension frontendlerini küçültüyor
3. **Extension Asset Loading** patternini standartlaştırıyor

---

## 1. Declarative Keyboard API

### Hook: `useToolKeyActions`

Exported from `@nuxy/ui` → `window.UI.useToolKeyActions`

```typescript
// packages/ui/src/hooks/useToolKeyActions.ts

export interface KeyAction {
  key: string                                        // 'ArrowUp', 'Enter', 'd', 'f', etc.
  modifiers?: ('ctrl' | 'shift' | 'alt' | 'meta')[] // kombinasyon tuşları
  label: string                                      // 'Previous item' — command palette'te görünür
  hint?: string                                      // 'Up' — ShortcutBar'da otomatik render edilir
  handler: () => void
}

export function useToolKeyActions(actions: KeyAction[]): void
```

**Nasıl çalışır:**
- Extension component'i mount olduğunda `nuxy-register-key-actions` custom event dispatch eder
- Event detail: `{ getActions: () => KeyAction[], hints: KeyAction[] }`
- Handler'lar closure olduğundan her render'da ref üzerinden güncellenir (shell re-render olmaz)
- Unmount'ta null dispatch ederek temizler

**Shell tarafında (`extensions/shell/hooks.js`):**
- `useKeyboard` hook'u `keyActionsGetterRef` parametresi alır
- Bir tuşa basıldığında önce registered actions'a bakar
- Match varsa handler'ı çağırır, `preventDefault` yapar, döner
- Match yoksa eski `nuxy-shell-omni-bar-keydown` event'ini dispatch eder (geriye dönük uyumluluk)

**Shell frontend'inde (`extensions/shell/frontend.js`):**
- `keyActionsGetterRef` ref'i ve `keyActionHints` state'i eklenir
- `nuxy-register-key-actions` event listener eklenir
- `activeTool` değişince hints ve getter sıfırlanır
- Footer ShortcutBar, `keyActionHints`'ten otomatik render yapar:
  - `footerHints` (JSX, eski API) varsa onu kullanır
  - Yoksa `keyActionHints`'ten hint'leri render eder

### Kullanım (extension tarafında):

```javascript
// extensions/clipboard/frontend.js
const { useToolKeyActions } = window.UI;

function ClipboardView({ query, extensionId }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [items, setItems] = useState([]);

  useToolKeyActions([
    {
      key: 'ArrowUp',
      label: 'Previous item',
      hint: '↑↓',
      handler: () => setSelectedIndex(i => Math.max(0, i - 1))
    },
    {
      key: 'ArrowDown',
      label: 'Next item',
      handler: () => setSelectedIndex(i => Math.min(items.length - 1, i + 1))
    },
    {
      key: 'Enter',
      label: 'Copy',
      hint: 'Enter',
      handler: handleCopy
    },
    {
      key: 'd',
      label: 'Delete',
      hint: 'D',
      handler: handleDelete
    },
  ]);
  // ...
}
```

---

## 2. UI Kit Genişletmesi

Tüm yeni component'ler `packages/ui/src/components/` altında oluşturulur ve `index.tsx`'ten export edilir.

### `ItemLeading`

List item'ların soluna ikon/thumbnail/renk ekler.

```typescript
interface ItemLeadingProps {
  children?: React.ReactNode  // SVG, img, text içerik
  color?: string              // Renk swatchi arka planı
  size?: 'sm' | 'md' | 'lg'  // Varsayılan: 'md'
  className?: string
}
```

CSS class'ları: `nuxy-item-leading`, `nuxy-item-leading--sm/md/lg`

### `TabBar`

Yatay tab navigasyonu.

```typescript
interface TabBarProps {
  tabs: Array<{ id: string; label: string; icon?: string }>
  active: string
  onChange: (id: string) => void
  className?: string
}
```

CSS class'ları: `nuxy-tab-bar`, `nuxy-tab`, `nuxy-tab--active`

### `Grid` + `GridItem`

Responsive grid layout.

```typescript
interface GridProps {
  cols?: number          // Varsayılan: 9
  gap?: number           // px cinsinden, varsayılan: 4
  children: React.ReactNode
  className?: string
}

interface GridItemProps {
  children: React.ReactNode
  active?: boolean
  onClick?: () => void
  title?: string
  className?: string
}
```

CSS class'ları: `nuxy-grid`, `nuxy-grid-item`, `nuxy-grid-item--active`

### `TwoPanel`

İki panelli yatay split layout.

```typescript
interface TwoPanelProps {
  left: React.ReactNode
  right: React.ReactNode
  split?: string         // CSS width, varsayılan: '50%'
  className?: string
}
```

CSS class'ları: `nuxy-two-panel`, `nuxy-two-panel__left`, `nuxy-two-panel__right`

### `SectionHeader`

Settings/grup bölüm başlığı.

```typescript
interface SectionHeaderProps {
  label: string
  description?: string
  className?: string
}
```

CSS class'ları: `nuxy-section-header`, `nuxy-section-header__label`, `nuxy-section-header__desc`

---

## 3. Extension Asset Loading

### Shell Değişikliği

Tool component'e `extensionId` prop'u iletilir:

```javascript
// extensions/shell/frontend.js — tool render satırı
<ToolComponent query={query} extensionId={activeTool} />
```

### Kullanım Paterni (Extension Frontend)

```javascript
// extensions/emoji-picker/frontend.js
export default function EmojiPickerView({ query, extensionId }) {
  const [emojiData, setEmojiData] = useState(null);

  useEffect(() => {
    fetch(`nuxy-ext://${extensionId}/emojis.json`)
      .then(r => r.json())
      .then(setEmojiData);
  }, [extensionId]);
  
  if (!emojiData) return <div>Loading...</div>;
  // ...
}
```

### Emoji Picker JSON Dosyası

`extensions/emoji-picker/emojis.json` — EMOJI_DATA array'i JSON formatında.
Format: `[{ id, label, icon, emojis: [{ e, n, k }] }]`

---

## 4. Extension Klasör Yapısı

```
extensions/
  clipboard/
    frontend.js       ← React component (sadece UI + useToolKeyActions)
    manifest.json
    backend.js
  emoji-picker/
    frontend.js       ← React component
    emojis.json       ← Emoji verisi (JSON)
    manifest.json
    backend.js
  shell/
    frontend.js       ← Ana shell component
    hooks.js          ← useShellInit, useProviders, useKeyboard
    utils.js
    CommandPalette.js
    ResultCard.js
    shell.css
```

---

## 5. Uygulama Planı

### Wave 1 — Bağımsız, Paralel

#### 1A: Keyboard System
**Dosyalar:**
- Yeni: `packages/ui/src/hooks/useToolKeyActions.ts`
- Değişiklik: `packages/ui/src/index.tsx` (export ekle)
- Değişiklik: `extensions/shell/hooks.js` (`useKeyboard` güncelle)
- Değişiklik: `extensions/shell/frontend.js` (keyActionHints, getter ref ekle)

#### 1B: UI Kit Genişletmesi
**Dosyalar:**
- Yeni: `packages/ui/src/components/ItemLeading/index.tsx` + `.css`
- Yeni: `packages/ui/src/components/TabBar/index.tsx` + `.css`
- Yeni: `packages/ui/src/components/Grid/index.tsx` + `.css`
- Yeni: `packages/ui/src/components/TwoPanel/index.tsx` + `.css`
- Yeni: `packages/ui/src/components/SectionHeader/index.tsx` + `.css`
- Değişiklik: `packages/ui/src/index.tsx` (export'lar ekle)

### Wave 2 — Paralel (Wave 1 tamamlanınca)

#### 2A: Clipboard Refactor
- `useToolKeyActions` ile keyboard handling
- `TwoPanel` ile iki panel layout
- `ItemLeading` ile dosya/renk/URL ikon'ları
- Tüm custom event listener'ları kaldır

#### 2B: Emoji Picker Refactor
- EMOJI_DATA'yı `emojis.json`'a taşı
- `fetch()` ile yükle
- `TabBar` ile kategori sekmeleri
- `Grid` + `GridItem` ile emoji grid
- `useToolKeyActions` ile keyboard handling
- Inline style'ları kaldır

#### 2C: Angrysearch + Settings Refactor
- Her ikisinde `useToolKeyActions`
- Settings'de `SectionHeader`
- Inline style'ları mümkün olduğunca azalt

---

## 6. Geriye Dönük Uyumluluk

- `nuxy-shell-omni-bar-keydown` custom event **korunur** (extension yeni API'ye geçmediği sürece fallback olarak çalışır)
- `nuxy-shell-footer-hints` custom event **korunur** (JSX hints hâlâ çalışır)
- `nuxy-register-actions` (command palette actions) **değişmez**

---

## 7. Extension Geliştirme Rehberi (Özet)

Yeni bir extension frontend'i:

```javascript
// Tüm UI araçları window.UI'dan
const { List, ListItem, ListItemBody, ListItemText,
        ItemLeading, useToolKeyActions, EmptyState } = window.UI;

export default function MyTool({ query, extensionId }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(0);

  // Klavye aksiyonlarını bildir — shell otomatik yönetir
  useToolKeyActions([
    { key: 'ArrowUp',   label: 'Previous', hint: '↑↓', handler: () => setSelected(i => Math.max(0, i-1)) },
    { key: 'ArrowDown', label: 'Next',                  handler: () => setSelected(i => Math.min(items.length-1, i+1)) },
    { key: 'Enter',     label: 'Select',   hint: 'Enter', handler: () => handleSelect(items[selected]) },
  ]);

  // Gerekirse extension asset'i yükle
  useEffect(() => {
    fetch(`nuxy-ext://${extensionId}/data.json`).then(r => r.json()).then(setItems);
  }, [extensionId]);

  if (!items.length) return <EmptyState title="No items" />;

  return (
    <List>
      {items.map((item, i) => (
        <ListItem key={item.id} active={i === selected} onClick={() => handleSelect(item)}>
          <ItemLeading>{item.icon}</ItemLeading>
          <ListItemBody>
            <ListItemText>{item.label}</ListItemText>
          </ListItemBody>
        </ListItem>
      ))}
    </List>
  );
}
```
