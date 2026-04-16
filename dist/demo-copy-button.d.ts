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
import { LitElement, type PropertyValues } from 'lit';
declare const DemoCopyButton_base: typeof LitElement & (new (...args: any[]) => import("./datastar-watcher.js").DatastarWatcherInterface);
export declare class DemoCopyButton extends DemoCopyButton_base {
    #private;
    accessor text: string;
    accessor resetMs: number;
    accessor _copied: boolean;
    willUpdate(changedProperties: PropertyValues<this>): void;
    disconnectedCallback(): void;
    render(): import("lit-html").TemplateResult<1>;
}
export {};
//# sourceMappingURL=demo-copy-button.d.ts.map