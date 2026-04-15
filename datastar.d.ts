/**
 * Ambient module declaration for the Datastar 'datastar' import specifier.
 *
 * This file tells TypeScript how to type the `import ... from 'datastar'`
 * used by datastar-watcher.ts. Datastar is expected to be loaded on the page
 * and exposed via an import map under the 'datastar' specifier.
 *
 * If you are vendoring datastar-watcher.ts into your own project, add this
 * file alongside it and include it in your tsconfig.json.
 *
 * Types are derived from the upstream source at:
 * https://github.com/starfederation/datastar/tree/develop/library/src/engine
 */
declare module 'datastar' {
  /** A callable signal: read with `s()`, write with `s(newValue)`. */
  export type Signal<T> = {
    (): T
    (value: T): boolean
  }

  /** A read-only computed value. */
  export type Computed<T> = () => T

  /** The dispose function returned by `effect()`. Call it to unsubscribe. */
  export type Effect = () => void

  /** An RFC 7396 JSON Merge Patch object. */
  export type JSONPatch = Record<string, unknown> & { length?: never }

  /** Array of [dot-notation-path, value] pairs used by `mergePaths`. */
  export type Paths = [string, unknown][]

  export type MergePatchArgs = {
    ifMissing?: boolean
  }

  /**
   * The global Datastar signal store proxy.
   *
   * Reads are automatically tracked inside an `effect()` call; writes
   * propagate reactivity to all subscribers and `data-*` bindings on the page.
   */
  export const root: Record<string, unknown>

  /**
   * Register a reactive effect. The callback runs immediately and re-runs
   * whenever any signal read during its execution changes.
   *
   * Returns a dispose function; call it to stop the effect and release
   * all signal subscriptions.
   */
  export function effect(fn: () => void): Effect

  /**
   * Deep-merge a plain object into the signal store (RFC 7396 semantics).
   * Setting a key to `null` deletes it from the store.
   */
  export function mergePatch(patch: JSONPatch, opts?: MergePatchArgs): void

  /**
   * Write signals by dot-notation path.
   * Equivalent to calling `mergePatch` with the paths converted to a nested object.
   */
  export function mergePaths(paths: Paths, opts?: MergePatchArgs): void

  /**
   * The global Datastar action registry (read-only proxy).
   *
   * Actions registered with `action()` anywhere on the page are accessible here.
   * Check existence before calling: `if ('myAction' in actions) { ... }`
   */
  export const actions: Record<string, (...args: unknown[]) => unknown>
}
