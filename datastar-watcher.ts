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
 *   - Exposes `this.addEffect(fn)` — creates a managed Datastar effect that is
 *     automatically disposed on disconnect and recreated on reconnect.
 *   - `@signalProperty` decorator — marks a getter as signal-derived, so that
 *     changes to any Datastar signal read inside it trigger a re-render even
 *     when the getter is not called from `render()`.
 *
 * Usage:
 *
 *   import { LitElement, html } from 'lit'
 *   import { DatastarWatcher, signalProperty } from './datastar-watcher.js'
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
 *   On `disconnectedCallback`, the render effect and all managed effects are
 *   disposed. On `connectedCallback`, `requestUpdate()` is called to force a
 *   fresh render (and therefore a fresh render-effect subscription) on
 *   reconnection, and all managed effects registered via `addEffect` are
 *   recreated.
 *
 * addEffect:
 *
 *   `addEffect(fn)` creates a Datastar effect that runs immediately and is
 *   tracked independently of the render cycle. This is useful for side-effects
 *   that should respond to signal changes outside of `render()` — for example
 *   imperatively updating a third-party chart, syncing to localStorage, or
 *   logging. The effect function is stored so it can be recreated automatically
 *   on reconnection. `addEffect` returns the dispose function, which can be
 *   called early to unsubscribe before the element disconnects.
 *
 * @signalProperty:
 *
 *   A TC39 stage 3 getter decorator that wraps the getter in a managed effect.
 *   Any Datastar signals read by the getter are tracked; when they change, the
 *   element's `requestUpdate()` is called to schedule a re-render. This ensures
 *   the getter always reflects the latest signal state even when it is called
 *   from lifecycle hooks, event handlers, or computed expressions rather than
 *   directly from `render()`.
 *
 *   Example:
 *
 *     class MyProfile extends DatastarWatcher(LitElement) {
 *       @signalProperty
 *       get username() {
 *         return this.dsRoot.user?.name ?? 'Guest'
 *       }
 *
 *       render() {
 *         return html`<p>Hello, ${this.username}</p>`
 *       }
 *     }
 *
 *   Because `username` is already tracked through the managed effect, it does
 *   not need to be read directly inside `render()` for changes to be noticed —
 *   though doing so is harmless (Datastar deduplicates subscriptions).
 *
 * Datastar version: 1.0.0-RC.8
 *
 * This file assumes Datastar is already loaded on the page and exposed via the
 * 'datastar' module specifier (e.g. through an import map).
 */

import type { Effect, JSONPatch, MergePatchArgs, Paths } from "datastar";
import { actions, effect, mergePatch, mergePaths, root } from "datastar";
import type { ReactiveElement } from "lit";

// Generic constructor type used to constrain the mixin Base parameter.
type Constructor<T = object> = new (...args: any[]) => T;

export interface DatastarWatcherInterface {
  readonly dsRoot: typeof root;
  patch(obj: JSONPatch, opts?: MergePatchArgs): void;
  setSignals(entries: Paths, opts?: MergePatchArgs): void;
  readonly dsActions: typeof actions;
  addEffect(fn: () => void): Effect;
}

export function DatastarWatcher<T extends Constructor<ReactiveElement>>(
  Base: T,
): T & Constructor<DatastarWatcherInterface> {
  abstract class DatastarWatcher extends Base {
    #renderDispose: Effect | undefined;

    #effectFns: Set<() => void> = new Set();

    #effectDisposers: Set<Effect> = new Set();

    // ── Lit lifecycle hooks ────────────────────────────────────────────────

    override connectedCallback(): void {
      super.connectedCallback();

      // Recreate all managed effects that were disposed on disconnection.
      for (const fn of this.#effectFns) {
        this.#effectDisposers.add(effect(fn));
      }

      // Force a fresh render on reconnection so the render effect picks up the
      // current set of signals (in case the DOM was moved or re-inserted).
      this.requestUpdate();
    }

    override performUpdate(): void {
      if (!this.isUpdatePending) return;

      this.#renderDispose?.();

      let updateFromLit = true;

      this.#renderDispose = effect(() => {
        if (updateFromLit) {
          updateFromLit = false;
          super.performUpdate();
        } else {
          this.requestUpdate();
        }
      });
    }

    override disconnectedCallback(): void {
      for (const dispose of this.#effectDisposers) dispose();
      this.#effectDisposers.clear();

      this.#renderDispose?.();
      this.#renderDispose = undefined;

      super.disconnectedCallback();
    }

    // ── Public API ─────────────────────────────────────────────────────────

    get dsRoot(): typeof root {
      return root;
    }

    patch(obj: JSONPatch, opts?: MergePatchArgs): void {
      mergePatch(obj, opts);
    }

    setSignals(entries: Paths, opts?: MergePatchArgs): void {
      mergePaths(entries, opts);
    }

    get dsActions(): typeof actions {
      return actions;
    }

    addEffect(fn: () => void): Effect {
      const dispose: Effect = effect(fn);

      this.#effectFns.add(fn);
      this.#effectDisposers.add(dispose);

      const wrappedDispose: Effect = () => {
        dispose();
        this.#effectFns.delete(fn);
        this.#effectDisposers.delete(dispose);
      };

      return wrappedDispose;
    }
  }

  return DatastarWatcher as unknown as T &
    Constructor<DatastarWatcherInterface>;
}

export function signalProperty<
  This extends ReactiveElement & DatastarWatcherInterface,
  V,
>(
  getter: (this: This) => V,
  context: ClassGetterDecoratorContext<This, V>,
): void {
  context.addInitializer(function (this: This) {
    this.addEffect(() => {
      getter.call(this); // reads signals — Datastar auto-tracks them
      this.requestUpdate();
    });
  });
}
