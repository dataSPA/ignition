/**
 * demo-copy-button — Lit translation of the Ignition `demo-copy-button` example.
 *
 * This file is the canonical reference for translating an Ignition component that
 * uses both local ($$) and global ($) Datastar signals into a Lit component.
 *
 * Ignition → Lit translation map
 * ─────────────────────────────────────────────────────────────────────────────
 *  Ignition                                Lit
 * ─────────────────────────────────────────────────────────────────────────────
 *  props.text        (string attr)         @property() accessor text
 *  props.resetMs     (number attr)         @property({ type: Number }) accessor resetMs
 *  $$.copied = false (local signal)        @state() _copied = false
 *  $$.label = () => (computed local)       inline in render(): this._copied ? 'Copied' : 'Copy'
 *  $$.resetMsLabel   (calls global action) #resetMsLabel — plain field, recomputed in willUpdate()
 *  action('copy', fn)                      async #copy() class method
 *  data-on:click="@copy()"                 @click=${this.#copy}
 *  $.analyticsEnabled  (global read)       this.dsRoot.analyticsEnabled
 *  $.lastCopiedText =  (global write)      this.dsRoot.lastCopiedText = value
 *  cleanup(() => …)                        disconnectedCallback cleanup
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Key rules this example demonstrates:
 *
 *   - $$ signals are LOCAL state — use Lit @state() instead. They never touch
 *     the Datastar global store (dsRoot). Lit re-renders automatically when
 *     @state() properties change, so the mixin is not needed for local state.
 *
 *   - $ signals are GLOBAL store access — use this.dsRoot for reads/writes.
 *     Reads inside render() are auto-tracked by DatastarWatcher; writes
 *     propagate reactivity across the whole page (data-* bindings etc.).
 *
 *   - dsActions is the global Datastar action registry — use this.dsActions.
 *     In this example, dsActions.intl() is a built-in Datastar Pro action that
 *     formats a number using Intl.NumberFormat.
 *
 *   - Ignition action() scoping is internal-only; translate to a plain private
 *     class method. No registration or routing needed in Lit.
 *
 * Lifecycle approach (canonical — willUpdate):
 *   willUpdate() runs synchronously before every render(), including the first.
 *   It replaces both connectedCallback (for initial computation) and
 *   attributeChangedCallback (for subsequent changes) that would otherwise be
 *   needed. changedProperties.has('resetMs') guards against unnecessary work on
 *   unrelated updates. Unlike attributeChangedCallback, this also fires when
 *   resetMs is set as a JS property (not just via an HTML attribute).
 *
 *   An earlier approach used connectedCallback + attributeChangedCallback
 *   instead of willUpdate. That pattern is preserved here in comments for
 *   reference, but willUpdate is the recommended Lit idiom.
 */

import { LitElement, html, type PropertyValues } from 'lit'
import { property, state } from 'lit/decorators.js'
import { DatastarWatcher } from './datastar-watcher.js'

export class DemoCopyButton extends DatastarWatcher(LitElement) {
  // ── Props (Ignition: props.text, props.resetMs) ──────────────────────────
  // These are reflected HTML attributes, just like Ignition's typed props.

  @property()
  accessor text: string = 'Copy me'

  @property({ type: Number })
  accessor resetMs: number = 1200

  // ── Local state (Ignition: $$.copied) ────────────────────────────────────
  // Lit @state() replaces Ignition $$. It is instance-local and triggers
  // re-render automatically. No global store involved.

  @state()
  accessor _copied: boolean = false

  // ── Derived from a global action (Ignition: $$.resetMsLabel) ────────────
  // dsActions.intl() is called with the current resetMs value. The result is
  // stored as a plain field and recomputed in willUpdate() whenever resetMs
  // changes. willUpdate() runs before every render(), so #resetMsLabel is
  // always fresh when the template runs — and it fires on first render too,
  // so no separate initialisation in connectedCallback is needed.
  //
  // Earlier approach (connectedCallback + attributeChangedCallback):
  //
  //   connectedCallback() {
  //     super.connectedCallback()
  //     this.#resetMsLabel = this.dsActions['intl']?.(
  //       'number', this.resetMs, { maximumFractionDigits: 0 }, 'en-US',
  //     )
  //   }
  //
  //   attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null) {
  //     super.attributeChangedCallback(name, oldVal, newVal)
  //     if (name === 'resetms' && oldVal !== newVal) {
  //       this.#resetMsLabel = this.dsActions['intl']?.(
  //         'number', this.resetMs, { maximumFractionDigits: 0 }, 'en-US',
  //       )
  //     }
  //   }
  //
  // The willUpdate() approach below is preferred: it also reacts to JS
  // property assignments (not just HTML attribute changes), and avoids the
  // need to know the lowercased attribute name ('resetms').

  #resetMsLabel: unknown = ''

  // ── Timer handle (Ignition: let timerId) ─────────────────────────────────

  #timerId: number = 0

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  override willUpdate(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has('resetMs')) {
      this.#resetMsLabel = this.dsActions['intl']?.(
        'number',
        this.resetMs,
        { maximumFractionDigits: 0 },
        'en-US',
      )
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    // Ignition: cleanup(() => clearTimeout(timerId))
    clearTimeout(this.#timerId)
  }

  // ── Actions (Ignition: action('copy', async () => { … })) ───────────────
  // Plain private async method. Bound arrow syntax so it can be passed
  // directly as an event listener without losing `this`.

  #copy = async (): Promise<void> => {
    await navigator.clipboard.writeText(this.text)

    // Ignition: $$.copied = true  (local state write → Lit @state())
    this._copied = true

    // Ignition: if ($.analyticsEnabled !== false) { $.lastCopiedText = props.text }
    // Global signal read + conditional global signal write via DatastarWatcher.
    if (this.dsRoot['analyticsEnabled'] !== false) {
      this.dsRoot['lastCopiedText'] = this.text
    }

    clearTimeout(this.#timerId)
    this.#timerId = window.setTimeout(() => {
      // Ignition: $$.copied = false  (local state write → Lit @state())
      this._copied = false
    }, this.resetMs)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  // Pure Lit template — no data-* attributes, no Datastar expressions.
  //
  //  Ignition: data-text="$$label"       → ${this._copied ? 'Copied' : 'Copy'}
  //  Ignition: ($$resetMsLabel ms)        → ${this.#resetMsLabel} ms
  //  Ignition: data-on:click="@copy()"   → @click=${this.#copy}

  override render() {
    return html`
      <button @click=${this.#copy}>
        <span>${this._copied ? 'Copied' : 'Copy'}</span>
        <small>${this.text} (${this.#resetMsLabel} ms)</small>
      </button>
    `
  }
}

customElements.define('demo-copy-button', DemoCopyButton)
