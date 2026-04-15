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
import { root, effect, mergePatch, mergePaths, actions } from 'datastar';
/**
 * DatastarWatcher mixin.
 *
 * @param Base - A class that extends ReactiveElement (e.g. LitElement).
 * @returns    - An abstract subclass of Base with Datastar signal tracking
 *               and the dsRoot / patch / setSignals / dsActions helpers mixed in.
 */
export function DatastarWatcher(Base) {
    class DatastarWatcher extends Base {
        /** Datastar effect dispose function, or undefined when not connected. */
        #dispose;
        // ── Lit lifecycle hooks ────────────────────────────────────────────────
        connectedCallback() {
            super.connectedCallback();
            // Force a fresh render on reconnection so the new effect() picks up the
            // current set of signals (in case the DOM was moved or re-inserted).
            this.requestUpdate();
        }
        performUpdate() {
            // Bail out early if there's nothing to do (same guard as the official
            // @lit-labs/preact-signals package).
            if (!this.isUpdatePending)
                return;
            // Dispose the previous effect before creating a new one so we don't
            // accumulate stale subscriptions across renders.
            this.#dispose?.();
            // updateFromLit distinguishes the initial synchronous effect run (which
            // should call super.performUpdate) from subsequent signal-driven re-runs
            // (which should call requestUpdate to re-enter Lit's update queue).
            let updateFromLit = true;
            this.#dispose = effect(() => {
                if (updateFromLit) {
                    // First run: execute the actual Lit update synchronously inside the
                    // effect so that all signal reads during render() are tracked.
                    updateFromLit = false;
                    super.performUpdate();
                }
                else {
                    // Subsequent runs: a tracked signal changed. Let Lit schedule the
                    // next update normally rather than calling performUpdate directly.
                    this.requestUpdate();
                }
            });
        }
        disconnectedCallback() {
            // Unsubscribe from all signals when the element leaves the DOM.
            this.#dispose?.();
            this.#dispose = undefined;
            super.disconnectedCallback();
        }
        // ── Public API ─────────────────────────────────────────────────────────
        /**
         * The Datastar global signal store proxy.
         *
         * Read signals:  `this.dsRoot.mySignal`
         * Write signals: `this.dsRoot.mySignal = newValue`
         *
         * Reads performed inside `render()` are automatically tracked; subsequent
         * changes to those signals will trigger a re-render. Writes propagate
         * reactivity across the entire page (all effects and data-* attribute
         * bindings that depend on the changed signal).
         */
        get dsRoot() {
            return root;
        }
        /**
         * Deep-merge a plain object into the Datastar signal store.
         *
         * `this.patch({ user: { name: 'Alice', age: 30 } })`
         *
         * Setting a key to `null` deletes it from the store.
         */
        patch(obj, opts) {
            mergePatch(obj, opts);
        }
        /**
         * Write one or more signals by dot-notation path.
         *
         * `this.setSignals([['user.name', 'Alice'], ['user.age', 30]])`
         */
        setSignals(entries, opts) {
            mergePaths(entries, opts);
        }
        /**
         * The global Datastar action registry (read-only proxy).
         *
         * Call an action registered anywhere on the page:
         *   `this.dsActions.submitForm(event)`
         *
         * Check existence before calling:
         *   `if ('submitForm' in this.dsActions) { ... }`
         */
        get dsActions() {
            return actions;
        }
    }
    // Cast needed because the inner class is abstract (it extends an abstract
    // Base), but the return type promises a concrete constructor. This is the
    // same pattern used by @lit-labs/preact-signals and @lit-labs/signals.
    return DatastarWatcher;
}
//# sourceMappingURL=datastar-watcher.js.map