![dataSPA-ignition](./dataSPA-ignition.png)

# dataspa-ignition

A Lit mixin and codec library for building [Lit](https://lit.dev) web components that integrate with [Datastar](https://data-star.dev) signals.

## What's included

| File | Description |
|---|---|
| `datastar-watcher.ts` / `dist/datastar-watcher.js` | Lit class mixin that auto-tracks Datastar signals during render and re-renders on changes. Also exports the `@signalProperty` getter decorator for tracking signals outside of `render()` |
| `datastar.d.ts` | TypeScript ambient declarations for the Datastar CDN import (required when vendoring `.ts` source) |

---

## Installation

No npm package. Vendor the files directly or import from jsDelivr.

### Option A — Vendor the TypeScript source (recommended)

Copy `datastar-watcher.ts` and `datastar.d.ts` into your project:

```
your-project/
  src/
    vendor/
      datastar-watcher.ts
      datastar.d.ts   ← needed for TypeScript type resolution
```

Import as a local file:

```ts
import { DatastarWatcher } from './vendor/datastar-watcher.js'
```

Your bundler (Vite, Rollup, esbuild) resolves `lit` from your own `node_modules`. The Datastar import is a full CDN URL so it is automatically treated as external — no bundler configuration needed.

### Option B — Import the compiled JS from jsDelivr

```ts
import { DatastarWatcher } from 'https://cdn.jsdelivr.net/gh/dataSPA/ignition@0.1.0/dist/datastar-watcher.js'
```

Again, no bundler config needed — URL imports are always treated as external.

For TypeScript users importing via URL, add the ambient types to your project by either vendoring `datastar.d.ts` or adding a reference in your source:

```ts
/// <reference path="./vendor/datastar.d.ts" />
```

---

## Requirements

- **Lit** `^3.0.0` — must already be a dependency in your project
- **Datastar** `1.0.0-RC.8` — must be loaded on the page. The mixin imports directly from:
  ```
  https://cdn.jsdelivr.net/gh/starfederation/datastar@1.0.0-RC.8/bundles/datastar.js
  ```

---

## Usage

### DatastarWatcher mixin

Wrap your `LitElement` class with `DatastarWatcher`. Any Datastar signal read inside `render()` is automatically tracked — the component re-renders when those signals change.

```ts
import { LitElement, html } from 'lit'
import { DatastarWatcher, signalProperty } from './vendor/datastar-watcher.js'

class MyCounter extends DatastarWatcher(LitElement) {
  render() {
    // Reading dsRoot.count inside render() auto-subscribes to it.
    const count = this.dsRoot.count ?? 0
    return html`
      <button @click=${() => { this.dsRoot.count = count + 1 }}>
        Count: ${count}
      </button>
    `
  }
}
customElements.define('my-counter', MyCounter)
```

### Mixed with local state

Use Lit `@state()` for component-local state (no global store involved) and `this.dsRoot` only for signals shared across the page:

```ts
import { LitElement, html } from 'lit'
import { state } from 'lit/decorators.js'
import { DatastarWatcher } from './vendor/datastar-watcher.js'

class CopyButton extends DatastarWatcher(LitElement) {
  @state() accessor _copied = false

  #copy = async () => {
    await navigator.clipboard.writeText(this.dsRoot.textToCopy as string)
    this._copied = true
    setTimeout(() => { this._copied = false }, 1500)
  }

  render() {
    return html`
      <button @click=${this.#copy}>
        ${this._copied ? 'Copied!' : 'Copy'}
      </button>
    `
  }
}
customElements.define('copy-button', CopyButton)
```

### API

| Member | Description |
|---|---|
| `this.dsRoot` | The Datastar global signal store proxy. Read and write signals directly: `this.dsRoot.mySignal = value` |
| `this.patch(obj)` | Deep-merge a plain object into the signal store (RFC 7396): `this.patch({ user: { name: 'Alice' } })` |
| `this.setSignals(entries)` | Write signals by dot-notation path: `this.setSignals([['user.name', 'Alice']])` |
| `this.dsActions` | The global Datastar action registry (read-only): `this.dsActions.myAction(event)` |
| `this.addEffect(fn)` | Register a persistent side-effect that tracks signals independently of the render cycle. Re-runs automatically when tracked signals change; disposed on disconnect and recreated on reconnect. Returns the dispose function |

### `@signalProperty` decorator

`@signalProperty` is a TC39 stage 3 getter decorator that wraps a getter in a managed Datastar effect. Any signals read inside the getter are tracked; when they change, `requestUpdate()` is called to schedule a re-render.

Use it when a signal-derived value is consumed outside of `render()` — in lifecycle hooks, event handlers, or computed expressions — and you want changes to be noticed without reading the signal directly inside `render()`.

```ts
import { LitElement, html } from 'lit'
import { DatastarWatcher, signalProperty } from './vendor/datastar-watcher.js'

class MyProfile extends DatastarWatcher(LitElement) {
  @signalProperty
  get username() {
    return this.dsRoot.user?.name ?? 'Guest'
  }

  render() {
    // this.username is already tracked via @signalProperty — no need to read
    // dsRoot.user directly here, though doing so is harmless.
    return html`<p>Hello, ${this.username}</p>`
  }
}
customElements.define('my-profile', MyProfile)
```

**Notes:**

- Requires TC39 stage 3 decorator syntax — the default in TypeScript 5+. No `experimentalDecorators` compiler option is needed.
- Can only be applied to getters on a class that extends `DatastarWatcher(...)`, since it relies on `this.addEffect` and `this.requestUpdate`.
- Datastar deduplicates subscriptions, so reading the same signal inside `render()` as well is safe and has no performance cost.

---

### codecs — typed attribute parsing

Use with Lit's `@property()` decorator for typed, bidirectional HTML attribute handling:

```ts
import { LitElement, html } from 'lit'
import { property } from 'lit/decorators.js'
import { ignitionCodec, number, string, bool, oneOf } from './vendor/codecs.js'

class ProgressBar extends LitElement {
  @property(ignitionCodec(number.clamp(0, 100).step(5)))
  accessor value = 0

  @property(ignitionCodec(string.trim.lower))
  accessor tone = 'neutral'

  @property(ignitionCodec(oneOf('light', 'dark', 'system')))
  accessor theme = 'system'

  @property(ignitionCodec(bool))
  accessor striped = false

  render() {
    return html`<div class="progress ${this.tone} ${this.theme}"
      style="width: ${this.value}%"></div>`
  }
}
customElements.define('progress-bar', ProgressBar)
```

#### Primitive codecs

| Codec | Type | Behavior |
|---|---|---|
| `string` | `StringCodec` | Raw string; falsy/null → `''` |
| `number` | `NumberCodec` | Parsed to finite number; NaN/invalid → `0` |
| `bool` | `Codec<boolean>` | `'' / 'true' / '1' / 'yes' / 'on'` → `true`; absent/other → `false`. Encodes `true` as `''` |
| `date` | `Codec<Date>` | ISO string → `Date`; invalid → `new Date()`. Encodes via `.toISOString()` |
| `json` | `Codec<unknown>` | `JSON.parse`; invalid/missing → `{}`. Encodes via `JSON.stringify` |
| `js` | `Codec<unknown>` | Evaluates a JS expression via `new Function()`; invalid → `{}`. **Trusted input only.** |
| `bin` | `Codec<Uint8Array>` | base64 string ↔ `Uint8Array`; invalid/missing → empty `Uint8Array` |

#### `string` modifiers

Chainable — e.g. `string.trim.lower`.

| Modifier | Description |
|---|---|
| `.trim` | Strips leading and trailing whitespace |
| `.lower` | Lowercases |
| `.upper` | Uppercases |
| `.title` | Title-cases every word |
| `.kebab` | Converts CamelCase/spaces/underscores to kebab-case |
| `.maxLength(n)` | Truncates to at most `n` characters |
| `.suffix(s)` | Ensures the string ends with `s` |

#### `number` modifiers

Chainable — e.g. `number.clamp(0, 100).step(5)`.

| Modifier | Description |
|---|---|
| `.min(n)` | Floors at `n` |
| `.max(n)` | Ceilings at `n` |
| `.clamp(lo, hi)` | Shorthand for `.min(lo).max(hi)` |
| `.step(step, stepBase?)` | Snaps to nearest multiple of `step` from `stepBase` (default `0`) |
| `.round` | Rounds to nearest integer |
| `.ceil(dp?)` | Rounds up to `dp` decimal places (default `0`) |
| `.floor(dp?)` | Rounds down to `dp` decimal places (default `0`) |
| `.fit(inMin, inMax, outMin, outMax, clamped?, rounded?)` | Linearly remaps a value from one range to another |

#### Factory functions

| Function | Description |
|---|---|
| `array(codec)` | Parses a JSON array attribute, decoding every element with `codec` |
| `array(...codecs)` | Tuple form — decodes each position with its own codec |
| `object(shape)` | Parses a JSON object attribute with per-key codecs |
| `oneOf(...literals)` | Accepts one of a fixed set of string/number/boolean literals; falls back to the first entry |
| `oneOf(...codecs)` | Tries each codec in order, returning the first non-undefined result |

---

## jsDelivr URLs

Once a git tag is pushed, files are available at:

```
https://cdn.jsdelivr.net/gh/dataSPA/ignition@<version>/dist/datastar-watcher.js
https://cdn.jsdelivr.net/gh/dataSPA/ignition@<version>/dist/datastar-watcher.d.ts
https://cdn.jsdelivr.net/gh/dataSPA/ignition@<version>/dist/codecs.js
https://cdn.jsdelivr.net/gh/dataSPA/ignition@<version>/dist/codecs.d.ts
```
