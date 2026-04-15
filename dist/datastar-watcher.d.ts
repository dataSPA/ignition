/**
 * DatastarWatcher — a Lit mixin that bridges a LitElement subclass into the
 * Datastar signal reactivity system.
 *
 * Features:
 *   - Auto-tracks exactly which Datastar signals are read during the host
 *     element's render cycle, and re-renders only when those signals change.
 *   - Exposes `this.dsRoot` — the Datastar global signal store proxy — for
 *     reading and writing signals directly in Lit templates.
 *   - Exposes `this.patch(obj)` and `this.setSignals(entries)` as write helpers.
 *   - Exposes `this.dsActions` — the global Datastar action registry — so the
 *     component can imperatively call actions registered anywhere on the page.
 *
 * Usage:
 *
 *   import { LitElement, html } from 'lit'
 *   import { DatastarWatcher } from './datastar-watcher.js'
 *
 *   class MyCounter extends DatastarWatcher(LitElement) {
 *     render() {
 *       const count = this.dsRoot.count ?? 0
 *       return html`
 *         <button @click=${() => { this.dsRoot.count = count + 1 }}>
 *           Count: ${count}
 *         </button>
 *       `
 *     }
 *   }
 *   customElements.define('my-counter', MyCounter)
 *
 * Auto-tracking mechanism (mirrors @lit-labs/preact-signals exactly):
 *
 *   On each Lit update cycle, `performUpdate` (a protected method on
 *   ReactiveElement) is overridden to wrap `super.performUpdate()` inside a
 *   Datastar `effect()` call. Because Datastar's effect tracks all signal reads
 *   that occur during its synchronous execution, any signal read in `render()`
 *   is automatically subscribed. When any of those signals later change, the
 *   effect re-runs — at which point it calls `this.requestUpdate()` to enter
 *   Lit's own update queue, triggering a fresh render that re-subscribes to
 *   whatever signals the new render reads.
 *
 *   A fresh `effect()` is created on every render (the previous one is disposed
 *   first), so subscriptions always reflect the most recently rendered set of
 *   signals rather than a stale snapshot from a prior render.
 *
 *   On `disconnectedCallback`, the effect is disposed. On `connectedCallback`,
 *   `requestUpdate()` is called to force a fresh render (and therefore a fresh
 *   effect subscription) on reconnection.
 *
 * Why a mixin rather than a controller?
 *
 *   Both @lit-labs/preact-signals and @lit-labs/signals implement this pattern
 *   as a mixin. A mixin overrides `performUpdate` via `super`, which means
 *   multiple mixins can compose correctly through the prototype chain. A
 *   controller that monkey-patches the host's `performUpdate` at the instance
 *   level would clobber any other such patch and cannot compose.
 *
 * Datastar version: 1.0.0-RC.8
 *
 * This file assumes Datastar is already loaded on the page and exposed via the
 * 'datastar' module specifier (e.g. through an import map).
 */
import { ReactiveElement } from 'lit';
import { root, actions } from 'datastar';
import type { JSONPatch, MergePatchArgs, Paths } from 'datastar';
type Constructor<T = object> = new (...args: any[]) => T;
/**
 * Interface describing the members that DatastarWatcher mixes into the class.
 * Declared separately so that TypeScript consumers can reference it when they
 * need to widen a type or declare an interface that includes these members.
 */
export interface DatastarWatcherInterface {
    readonly dsRoot: typeof root;
    patch(obj: JSONPatch, opts?: MergePatchArgs): void;
    setSignals(entries: Paths, opts?: MergePatchArgs): void;
    readonly dsActions: typeof actions;
}
/**
 * DatastarWatcher mixin.
 *
 * @param Base - A class that extends ReactiveElement (e.g. LitElement).
 * @returns    - An abstract subclass of Base with Datastar signal tracking
 *               and the dsRoot / patch / setSignals / dsActions helpers mixed in.
 */
export declare function DatastarWatcher<T extends Constructor<ReactiveElement>>(Base: T): T & Constructor<DatastarWatcherInterface>;
export {};
//# sourceMappingURL=datastar-watcher.d.ts.map