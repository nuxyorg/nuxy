# Shell Extension Analizi

## Dosyalar

```
extensions/shell/
  nuxy-shell-view.ts        285 satır
  shell-controller.ts       992 satır
  shell-dom.ts              341 satır
  nuxy-shell-omni-bar.ts    143 satır
  nuxy-command-palette.ts   253 satır
  nuxy-shell.ts              87 satır
  nuxy-portal-host.ts        42 satır
  nuxy-shell-resize-handles.ts 61 satır
  nuxy-result-card.ts        53 satır
  nuxy-compare-card.ts       82 satır
  nuxy-shell-skeleton-list.ts 35 satır
  types.ts                   86 satır
  utils.ts                   47 satır
  utils/listResults.ts      127 satır
  utils/zoom.ts               7 satır
  shell.css                 ~650 satır
  nuxy-shell.css            ~120 satır
  backend.ts                 30 satır
  e2e.spec.ts               723 satır
```

---

## nuxy-shell-view.ts

### Ne yapıyor

Tüm shell UI'ını orkestre eden root custom element. Backdrop, omnibar, sonuç listesi, tool host, command palette ve shortcut bar'ı yönetiyor. `ShellController`'dan gelen state değişikliğine göre render ediyor.

### Sorunlar

**Vanilla HTMLElement, Lit değil**
Shell'in root elementi `HTMLElement` extend ediyor, `LitElement` değil. İçinde Lit elementleri (`nuxy-shell-omni-bar`, `nuxy-list-item`) yönetiyor ama Lit'in reaktif sisteminden yararlanamıyor. Bu yüzden Lit'in async render cycle'ıyla sürekli çatışıyor.

**`render()` metodu 154 satır**  
Tek metod: omnibar oluşturma, sonuç listesi, tool host, shortcut bar, command palette, toaster — hepsi içinde. Her şey `if/else` dallanmasıyla iç içe.

**Manuel render optimizasyonu**  
`listItemEls` Map'i ve `prevSectionsKey` string'i manuel tutuluyor (satır 42-44). Bu controller'ın sorumluluğu, view'ın değil. Lit'in reaktif sistem tasarımı bu tür optimizasyonları zaten çözüyor.

**`updateComplete` ile Lit senkronizasyonu** (satır 180-192)  
Dinamik olarak oluşturulan Lit elementinin render etmesini beklemek için `updateComplete` promise'i kullanmak zorunda kalıyor. Bu mimari çatışmanın semptomudur — shell bir Lit element olsaydı bu sorun olmazdı.

**Input senkronizasyonu** (satır 159-161)  
`input.value = s.query` ile input değerini doğrudan DOM'a yazıyor. Lit'in `.value=${...}` binding mekanizması bu işi reaktif yapardı.

**Tool loading state machine** (satır 219-257)  
`MutationObserver` + timer ile CSS class tespitine dayanan yükleme göstergesi. Implicit state — controller'da `isToolLoading: boolean` olarak explicit tutulmalı.

---

## shell-controller.ts

### Ne yapıyor

Tüm shell logic'ini tek sınıfta tutan merkezi state machine. Query, selectedIndex, tool aktivasyonu, provider'lar, klavye, drag/resize, ayarlar, locale, portal bridge, orchestrator routing.

### Sorunlar

**992 satır, god class**  
5 ayrı private timer referansı, 19 field'lı store objesi. Tek sorumluluk ilkesinin tam tersi.

**19 field'lı god state**  
`ShellControllerState` tek objeye UI state (query, position, size), data (tools, providers), async state (copiedId, activeTool), tema/ayarlar, bridge snapshot ve computed results (omnibarSections, listResults) koyuyor. Bölünmeli: `QueryState`, `UIState`, `DataState`, `AsyncState`.

**`itemClass()` CSS bilgisi controller'da** (satır 173-178)  
Seçim durumuna göre CSS class adı döndürüyor. CSS class adlarının view katmanında olması gerekir.

**`bindGlobalKeyboard()` 167 satır** (satır 824-990)  
Ctrl+K, Escape, tool key action'ları, hold action'ları tek metodda. `matchesAction()` helper, `startHold()` overlay DOM oluşturuyor, key routing 5+ iç içe `if` bloğu. Ayrı bir `KeyManager` sınıfı olmalı.

**`bindInit()` 93 satır** (satır 560-652)  
Tools, providers, orchestrators, config, theme, settings, recent tools — tümünü sıralı async chain'lerle çekiyor. Hiçbir koordinasyon yok. Ayrı bir `InitializationService` olmalı.

**`bindSync()` 100 satır** (satır 722-822)  
MutationObserver (zoom değişimi), position clamping, event listener kayıt, settings update — hepsi tek metodda. Her concern ayrı `bind*` metodunda olmalı.

**`bindQuerySelectionSync()` circular sync** (satır 666-703)  
4 önceki değeri takip ediyor (selectedIndex, savedQuery, listResults.length, activeTool). Subscribe callback'i içinden `setState` çağırıyor — döngüye girme riski. Computed dependency kullanılmalı.

**Drag ve resize mantığı tekrarlı** (satır 311-414)  
`handleDragMouseDown()` ve `handleResizeMouseDown()` benzer mouse tracking logic içeriyor. Ortak `trackMouseDrag()` utility'e çıkarılmalı.

**Provider sync karmaşık** (satır 480-534)  
Her provider ayrı `invoke` çağrısıyla tetikleniyor, state manuel birleştiriliyor, generation counter implicit race condition koruması sağlıyor. Ayrı bir `ProviderOrchestrator` katmanı olmalı.

**`containerStyle()` stil üretimi controller'da** (satır 425-446)  
Bezier eğrisi ve geçiş hesabı controller içinde. CSS'te olmalı.

---

## shell-dom.ts

### Ne yapıyor

Shell componentleri için DOM elementleri oluşturan factory fonksiyonları. Controller ile custom element'ler arasında köprü.

### Sorunlar

**Lit olmayan, imperatif DOM fabrikası**  
Bu dosyanın tamamı Lit template olması gereken şeyleri `document.createElement()` + `setAttribute()` ile elle yapıyor. `nuxy-shell-view.ts` bir Lit element olsaydı bu dosya var olmazdı.

**`renderProviderResults()` tekrarlı section building** (satır 55-104)  
Result ve compare tipler için neredeyse aynı kod iki kez yazılmış. Loading state (satır 68-72, 87-92) ve empty state (satır 75, 94) ikişer kez.

**`renderOmnibarSections()` 53 satır** (satır 130-182)  
`flatIndex` imperatively takip ediliyor. İki farklı loading skeleton gösterme koşulu karmaşık (section loading vs provider loading). Ayrı skeleton stratejisi olmalı.

**`createOmniBar()` factory side effect'lerle dolu** (satır 258-303)  
Element oluşturuyor, 3 event listener ekliyor, `searchIconHtml` property'si set ediyor, koşullu olarak portal host child ekliyor. Factory'nin sadece element döndürmesi gerekir, listener setup controller'da olmalı.

**`ResultItem` tipi lokal** (satır 6-14)  
`ListItem` ile temelde aynı kavramı temsil ediyor ama ayrı tanımlanmış. types.ts'e taşınmalı.

**`createPortalHost()` gereksiz soyutlama** (satır 184-194)  
11 satırlık wrapper fonksiyon. Inline veya nuxy-portal-host'un kendi metoduna taşınmalı.

---

## nuxy-shell-omni-bar.ts

### Ne yapıyor

Arama inputunu, ikonu, ayırıcıyı, tool adını ve portal mount noktasını render eden Lit elementi.

### Sorunlar

**MutationObserver döngüsü** (satır 49-50)  
Kendi çocuklarını izlemek için MutationObserver kullanıyor. Observer tetikleniyor → çocuklar reparent ediliyor → observer tekrar tetikleniyor. Slot element veya comment node marker kullanılmalı.

**`_reparentPortalChildren()` lifecycle side effect** (satır 87-101)  
`firstUpdated` ve `updated()` içinde DOM manipülasyonu yapıyor. Lit'in render cycle'ını bozuyor.

**`_isRenderedChild()` CSS class isimleriyle predicate** (satır 73-85)  
5 farklı className değeri kontrol ediyor. CSS yeniden düzenlenirse kırılır. `data-portal-managed="true"` attribute kullanılmalı.

**`searchIconHtml` setter reaktiviteyi tetiklemiyor** (satır 30-32)  
`_searchIconHtml` direkt atanıyor, `requestUpdate()` çağrılmıyor. Caller manuel tetiklemek zorunda.

**`render()` içinde `innerHTML` binding** (satır 105)  
`.innerHTML=${this._searchIconHtml}` — SVG içeriği için XSS açığı. SVG Lit template olarak render edilmeli.

**`autofocus` attribute** (satır 122)  
Element her full render'da yeniden oluşturuluyor. `autofocus` tekrar mount'ta güvenilir çalışmıyor; `firstUpdated`'da `focus()` çağrılmalı.

---

## nuxy-command-palette.ts

### Ne yapıyor

Breadcrumb navigasyonlu, filtrelenebilir, alt menü destekli command palette modal'ı.

### Sorunlar

**`getZoom()` fonksiyonu kopyalanmış** (satır 14-19)  
`utils/zoom.ts`'de aynı fonksiyon var. Import edilmeli.

**4 bağımlı state ayrı field'lar** (satır 22-36)  
`_menuStack`, `_query`, `_selectedIndex`, `_pathLabels` birbirine bağlı ama ayrı tutuluyorlar. Tek `CommandPaletteState` interface'i olmalı.

**4 ayrı property setter** (satır 55-80)  
`containerEl`, `position`, `translateFn`, `onClose` için ayrı setter'lar, hepsi `if (this.isConnected)` kontrolü içeriyor. Tek `initialize()` metodu olmalı.

**`_updatePosition()` imperatif stil** (satır 140-159)  
5 style property'si `style.top/left/width/margin/position` şeklinde doğrudan atanıyor. CSS class veya CSS custom property olmalı.

**Mapped items'da `key` yok** (satır 206-207)  
Lit template'de liste render'ında `.key` directive kullanılmıyor. Filter değişince DOM thrashing oluyor.

**Modal için `role="dialog"` ve focus trap yok**  
Tab tuşuyla modal dışına çıkılabiliyor. `aria-modal="true"` ve focus trap eksik.

**Back button sadece ← karakteri** (satır 233-234)  
Accessibility adı yok. Icon veya label olmalı.

---

## nuxy-shell.ts

### Ne yapıyor

Shadow DOM ile shell frame layout'u ve arka plan katmanını oluşturan custom element.

### Sorunlar

**Shadow DOM setup `connectedCallback()`'de** (satır 38-59)  
DOM structure manuel olarak imperatif şekilde inşa ediliyor. Lit declarative template olmalı.

**CSS URL hard-coded string** (satır 42-43)  
`nuxy-ext://${SHELL_EXT_ID}/nuxy-shell.css` string birleştirme. Test edilemez.

**`window.core.composition` global bağımlılığı** (satır 34-78)  
Doğrudan `window.core` çağırıyor. DI gerekiyor.

**`gradientModeFromState()` tip güvenliği yok** (satır 25-32)  
`Record<string, unknown>` alıp nested değer çıkarıyor. Validation yok.

---

## nuxy-portal-host.ts

### Ne yapıyor

Harici bir DOM node referansını child olarak mount eden custom element.

### Sorunlar

**`mountPortal()` / `unmountPortal()` side effect setter'da** (satır 9-13)  
Setter önceki değeri unmount edip yenisini mount ediyor. Bu `@watch` decorator veya `updated()` lifecycle'ında olmalı.

**`connectedCallback()` gereksiz kodu** (satır 4-5)  
`_portalElement` ilk connect'te her zaman null, bu code path asla çalışmaz.

---

## nuxy-shell-resize-handles.ts

### Ne yapıyor

8 yönlü (n,s,e,w,ne,nw,se,sw) resize handle'larını oluşturan Lit element.

### Sorunlar

**LitElement extend ediyor ama `render()` nothing döndürüyor** (satır 49-51)  
Rendering yoksa `HTMLElement` olmalı.

**Handle'lar `connectedCallback()`'de imperatif oluşturuluyor** (satır 28-42)  
Lit'in `render()` şablonunda loop ile oluşturulmalı.

**`style.cssText` tehlikeli** (satır 31)  
CSS parser'ı bypass ediyor, hatalı string sessizce başarısız olur.

**`HANDLE_STYLES` global sabit** (satır 6-15)  
Her yön için inline CSS string. CSS class'ları veya CSS custom property olmalı.

---

## types.ts

### Sorunlar

**`ListItem` discriminated union değil** (satır 38-48)  
Optional `isTool`, `execute`, `value` field'larıyla farklı türleri temsil ediyor ama ayırt edici discriminator yok. `type ListItem = ToolItem | ProviderItem | ExecuteItem` olmalı.

**`KeyAction` 10 optional field** (satır 57-68)  
`onExecute` ve `handler` birlikte var ama biri hangisi durumda kullanılıyor belli değil. `trigger: 'hold' | 'press'` ayrımı yapıyor ama `holdMs` sadece hold için geçerli.

**`hint: string | string[]`** (satır 61)  
Bazen tek, bazen array. Her zaman array olmalı.

**`Size` type null değer alıyor** (satır 82-85)  
`width: number | null` — optional property ile ifade edilmeli.

---

## utils/listResults.ts

### Sorunlar

**`filterTools()` iki farklı davranış** (satır 19-46)  
Query varsa filtrele, yoksa recents'ı öne al — tamamen farklı iki davranış tek fonksiyonda. `filterTools()` ve `orderToolsWithRecents()` olarak ayrılmalı.

**`buildOmnibarSections()` 54 satır** (satır 64-117)  
Tools section + provider gruplama + section birleştirme tek fonksiyonda. Üçe bölünmeli.

**Section mutation loop içinde** (satır 111)  
`section.loading = true` loop içinde objeyi mutate ediyor. Complete section objesi build edilip sonra push edilmeli.

**Provider label için 4 seviye fallback** (satır 88-92)  
Hangi label'ın kullanılacağını trace etmek zor. Named değişkenler ve explicit öncelik sırası olmalı.

---

## shell.css & nuxy-shell.css

### Sorunlar

**`overflow-y: overlay` deprecated** (satır 186)  
`overlay` veya `auto` kullanılmalı.

**`max-height: 350px` hard-coded** (satır 185)  
CSS variable olmalı.

**`rgba(255, 255, 255, 0.02)` gibi renkler hard-coded** (satır 484-515)  
CSS variable olmalı: `--card-bg-hover`, `--card-border`.

**`@keyframes` tanımları dağınık**  
Dosya boyunca dağılmış. En üstte gruplanmalı.

**`::webkit-scrollbar` boş rule** (satır 188-189)  
`display: none` ya da kaldırılmalı.

**`nuxy-shell.css`'de `@property --nuxy-rainbow-angle`** (satır 49-64)  
CSS `@property` tüm browser'larda desteklenmiyor. Fallback gerekiyor.

---

## backend.ts

### Sorunlar

**Module-level mutable state** (satır 4)  
`let recentTools: string[] = []` — global state. Test etmek için her seferinde modülü yeniden import etmek gerekiyor. DI kullanılmalı.

**`init()` fire-and-forget** (satır 28)  
`await` olmadan çağrılıyor. Storage okuma başarısız olursa `recentTools` boş kalıyor, sessiz hata.

**`slice(0, 10)` hard-coded** (satır 19)  
`MAX_HISTORY_SIZE` sabiti olmalı.

---

## e2e.spec.ts

### Sorunlar

**`pressOmnibarKey` bilinen bug'ı workaround'layıp belgeliyordu** (satır 35)  
Gerçek kullanıcı sorun yaşıyordu, test geçiyordu. Bu tip workaround'lar testin gerçek güveni vermediğinin işareti.

**DOM element sayısı testi kırılgan** (satır 559-612)  
`document.querySelectorAll('.nuxy-main-wrapper *').length` sayısını kontrol ediyor. Implementation değişince test kırılır.

**i18n testi hard-coded Japonca string** (satır 681-721)  
`'何を考えていますか？'` — çeviri değişirse test kırılır. Translation key kontrolü daha sağlam olur.

**Test izolasyonu eksik** (satır 671-721)  
Settings dosyasını yazıp `finally`'de geri alıyor ama test crash olursa kirli state kalıyor. Temp dizin veya fixture sistemi olmalı.
