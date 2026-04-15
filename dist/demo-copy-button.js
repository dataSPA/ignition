/**
 * demo-copy-button — Lit translation of the Rocket `demo-copy-button` example.
 *
 * This file is the canonical reference for translating a Rocket component that
 * uses both local ($$) and global ($) Datastar signals into a Lit component.
 *
 * Rocket → Lit translation map
 * ─────────────────────────────────────────────────────────────────────────────
 *  Rocket                                  Lit
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
 *   - Rocket action() scoping is internal-only; translate to a plain private
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
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
import { LitElement, html } from 'lit';
import { property, state } from 'lit/decorators.js';
import { DatastarWatcher } from './datastar-watcher.js';
let DemoCopyButton = (() => {
    let _classSuper = DatastarWatcher(LitElement);
    let _text_decorators;
    let _text_initializers = [];
    let _text_extraInitializers = [];
    let _resetMs_decorators;
    let _resetMs_initializers = [];
    let _resetMs_extraInitializers = [];
    let __copied_decorators;
    let __copied_initializers = [];
    let __copied_extraInitializers = [];
    return class DemoCopyButton extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _text_decorators = [property()];
            _resetMs_decorators = [property({ type: Number })];
            __copied_decorators = [state()];
            __esDecorate(this, null, _text_decorators, { kind: "accessor", name: "text", static: false, private: false, access: { has: obj => "text" in obj, get: obj => obj.text, set: (obj, value) => { obj.text = value; } }, metadata: _metadata }, _text_initializers, _text_extraInitializers);
            __esDecorate(this, null, _resetMs_decorators, { kind: "accessor", name: "resetMs", static: false, private: false, access: { has: obj => "resetMs" in obj, get: obj => obj.resetMs, set: (obj, value) => { obj.resetMs = value; } }, metadata: _metadata }, _resetMs_initializers, _resetMs_extraInitializers);
            __esDecorate(this, null, __copied_decorators, { kind: "accessor", name: "_copied", static: false, private: false, access: { has: obj => "_copied" in obj, get: obj => obj._copied, set: (obj, value) => { obj._copied = value; } }, metadata: _metadata }, __copied_initializers, __copied_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        #text_accessor_storage = __runInitializers(this, _text_initializers, 'Copy me');
        // ── Props (Rocket: props.text, props.resetMs) ─────────────────────────────
        // These are reflected HTML attributes, just like Rocket's typed props.
        get text() { return this.#text_accessor_storage; }
        set text(value) { this.#text_accessor_storage = value; }
        #resetMs_accessor_storage = (__runInitializers(this, _text_extraInitializers), __runInitializers(this, _resetMs_initializers, 1200
        // ── Local state (Rocket: $$.copied) ───────────────────────────────────────
        // Lit @state() replaces Rocket $$. It is instance-local and triggers
        // re-render automatically. No global store involved.
        ));
        get resetMs() { return this.#resetMs_accessor_storage; }
        set resetMs(value) { this.#resetMs_accessor_storage = value; }
        #_copied_accessor_storage = (__runInitializers(this, _resetMs_extraInitializers), __runInitializers(this, __copied_initializers, false
        // ── Derived from a global action (Rocket: $$.resetMsLabel) ───────────────
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
        ));
        // ── Local state (Rocket: $$.copied) ───────────────────────────────────────
        // Lit @state() replaces Rocket $$. It is instance-local and triggers
        // re-render automatically. No global store involved.
        get _copied() { return this.#_copied_accessor_storage; }
        set _copied(value) { this.#_copied_accessor_storage = value; }
        // ── Derived from a global action (Rocket: $$.resetMsLabel) ───────────────
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
        #resetMsLabel = (__runInitializers(this, __copied_extraInitializers), '');
        // ── Timer handle (Rocket: let timerId) ───────────────────────────────────
        #timerId = 0;
        // ── Lifecycle ─────────────────────────────────────────────────────────────
        willUpdate(changedProperties) {
            if (changedProperties.has('resetMs')) {
                this.#resetMsLabel = this.dsActions['intl']?.('number', this.resetMs, { maximumFractionDigits: 0 }, 'en-US');
            }
        }
        disconnectedCallback() {
            super.disconnectedCallback();
            // Rocket: cleanup(() => clearTimeout(timerId))
            clearTimeout(this.#timerId);
        }
        // ── Actions (Rocket: action('copy', async () => { … })) ──────────────────
        // Plain private async method. Bound arrow syntax so it can be passed
        // directly as an event listener without losing `this`.
        #copy = async () => {
            await navigator.clipboard.writeText(this.text);
            // Rocket: $$.copied = true  (local state write → Lit @state())
            this._copied = true;
            // Rocket: if ($.analyticsEnabled !== false) { $.lastCopiedText = props.text }
            // Global signal read + conditional global signal write via DatastarWatcher.
            if (this.dsRoot['analyticsEnabled'] !== false) {
                this.dsRoot['lastCopiedText'] = this.text;
            }
            clearTimeout(this.#timerId);
            this.#timerId = window.setTimeout(() => {
                // Rocket: $$.copied = false  (local state write → Lit @state())
                this._copied = false;
            }, this.resetMs);
        };
        // ── Render ────────────────────────────────────────────────────────────────
        // Pure Lit template — no data-* attributes, no Datastar expressions.
        //
        //  Rocket: data-text="$$label"       → ${this._copied ? 'Copied' : 'Copy'}
        //  Rocket: ($$resetMsLabel ms)        → ${this.#resetMsLabel} ms
        //  Rocket: data-on:click="@copy()"   → @click=${this.#copy}
        render() {
            return html `
      <button @click=${this.#copy}>
        <span>${this._copied ? 'Copied' : 'Copy'}</span>
        <small>${this.text} (${this.#resetMsLabel} ms)</small>
      </button>
    `;
        }
    };
})();
export { DemoCopyButton };
customElements.define('demo-copy-button', DemoCopyButton);
//# sourceMappingURL=demo-copy-button.js.map