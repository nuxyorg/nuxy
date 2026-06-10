# Packages / Core Analizi

`packages/core`, `packages/ui`, `packages/extension-host`, `packages/extension-sdk`, `extensions/ce-utils.ts`, `extensions/two-panel-nav.ts` tarandı.

---

## packages/core

### IPC mesaj tiplerinde discriminator yok

`packages/core/src/ipc.ts` (veya eşdeğeri) worker mesajları için `type` field'ı yok. `host:call` ve `host:reply` arasında runtime'da ayırt etmek için mesaj shape'ine bakılmak zorunda kalınıyor. Standart pattern:

```ts
type WorkerMessage =
  | { kind: 'call'; id: string; method: string; args: unknown[] }
  | { kind: 'reply'; id: string; result: unknown; error?: string }
```

Şu an her ikisi de aynı yapıda, `parentPort.on('message', ...)` içindeki switch statement kırılganlığa yol açıyor.

### Timeout yok — bellek sızıntısı

`packages/extension-host/src/broker.ts` veya eşdeğeri, her `host:call` için bir Promise kaydediyor. Extension backend cevap vermezse Promise asla resolve olmaz. Pending promise map büyür. 30 saniyelik timeout ile temizlenmeli.

### Temp dosyalar silinmiyor

Extension scanner veya host, temp dosyalar yaratıyor ama `disconnectedCallback` / worker termination sırasında silmiyor. `tmp` dizininde artık dosyalar birikir.

### Lit core'dan re-export ediliyor

`packages/core/src/index.ts` muhtemelen `lit` veya `lit-html`'i re-export ediyor. Core paket bunu yapmamalı — her extension kendi Lit versiyonunu bağımlılık olarak almalı. Version çakışması riski var.

---

## packages/ui

### Tamamen ölü kod

`packages/ui/src/components/` altındaki stub'lar — `Button`, `Card`, `Stack`, `Box` vb. — şu pattern'i kullanıyor:

```ts
export function Button(...args: any[]): unknown {
  return (window.UI as any)?.Button?.(...args) ?? null
}
```

`window.UI` hiçbir yerde bu şekilde çağrılmıyor. `extensions/ui-default/frontend.js` `window.UI = { ... }` set ediyor ama asıl tüketim yeri yok. Stub'lar import ediliyor ama return değerleri DOM'a eklenmiyor — `null` dönüp sessizce kayboluyor.

Bu katman teoride framework-agnostic bir bridge — React migration döneminde tasarlanmış, ama migration tamamlanmadı. Şu an ne React var ne gerçek kullanım. Kaldırılabilir.

### Tip eksiklikleri

Stub'lar `...args: any[]` alıyor. Gerçek prop tipleri yok. TypeScript faydası sıfır.

---

## packages/extension-sdk

### `CoreContext` proxy'si yanlış hata mesajları

`packages/extension-sdk/src/context.ts` içinde `CoreContext` proxy, erişilen her property için generic `"method not available"` hatası fırlatıyor. Hangi method'un eksik olduğunu söylemiyor. `proxy[prop]` değeri mesaja eklenmeli.

### Permission kontrolü sadece backend'de

Frontend'deki `window.core.*` çağrıları permission kontrolü yapmıyor. Extension A'nın `core.clipboard`'a erişimi olmasa bile frontend üzerinden `ext:invoke` ile çağrı yapabilir (eğer channel doğrudan expose edilmişse). İdeal durumda renderer'da da permission tablosuna göre bir guard olmalı.

### `core.extensions.invoke` döngüsel çağrı riski

Extension A → Extension B → Extension A zinciri mümkün. Call stack değil ama Worker message queue döngüsüne girer. Timeout olmadığı için deadlock olası.

---

## packages/extension-host

### Worker başlatma hatası sessiz geçiliyor

`spawn/spawn.ts`: Worker başlatma başarısız olursa (örn. syntax error) hata `console.error` ile loglanıyor ama extension registry'e `failed` state olarak kaydedilmiyor. Shell hâlâ extension'ı yüklü sanıyor.

### Extension activate/deactivate hook'u yok

Worker başladığında `activate()` çağrılmıyor, durduğunda `deactivate()` yok. Extension'lar başlangıçta bir kez kurulum yapıp temizlik yapamıyor.

---

## extensions/ce-utils.ts

### `h()` fonksiyonu — elle yazılmış JSX

```ts
export function h(
  tag: string,
  attrs?: Record<string, unknown> | null,
  ...children: (string | Node | null | undefined)[]
): HTMLElement
```

Makul bir utility ama Lit'te buna gerek yok. Lit template literal'ları daha güvenli (tip-checked, XSS-safe). Rewrite'ta kaldırılacak.

### `onClick` convention tutarsız

`h('div', { onClick: handler })` ile `addEventListener('click', handler)` karışık kullanılıyor. `h()` implementation'ı `onClick` → `addEventListener('click', ...)` transform ediyor. Bu convention Lit template'lerde `@click` ile çatışıyor.

---

## extensions/two-panel-nav.ts

### Doğrudan `document.querySelectorAll` ile global DOM taraması

```ts
const items = document.querySelectorAll('.nuxy-list-item')
```

Component sınırını aşan global query. Shadow DOM varsa çalışmaz. Event-driven ya da component'in kendi içinde query olmalı.

### `CustomEvent` dispatch etmek için element reference gerekiyor ama geçirilmiyor

Bazı helper'lar dispatch yapacakları element'i closure'dan yakalıyor. Element unmount edilirse stale reference kalır.

---

## Özet

| Bileşen             | Kritik Sorun                                          |
| ------------------- | ----------------------------------------------------- |
| `packages/core` IPC | Discriminator yok, timeout yok                        |
| `packages/ui`       | Ölü kod, kaldırılmalı                                 |
| `extension-sdk`     | Hata mesajları belirsiz, permission sadece backend'de |
| `extension-host`    | Worker hataları sessiz, hook yok                      |
| `ce-utils`          | Rewrite'ta kaldırılacak                               |
| `two-panel-nav`     | Global DOM query, shadow DOM uyumsuz                  |
