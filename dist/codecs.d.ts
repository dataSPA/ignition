/**
 * codecs.ts — Fluent attribute codec library for Lit web components.
 *
 * Replicates the Rocket `props` codec system as a standalone module, with no
 * dependency on the Rocket or Datastar Pro bundles. Use with Lit's
 * `@property()` decorator via the `rocketCodec()` bridge adapter.
 *
 * Quick-start
 * ──────────────────────────────────────────────────────────────────────────────
 *
 *   import { rocketCodec, number, string, bool, oneOf, array, object } from './codecs.js'
 *   import { LitElement, html } from 'lit'
 *   import { property } from 'lit/decorators.js'
 *
 *   class DemoProgress extends LitElement {
 *     @property(rocketCodec(number.clamp(0, 100).step(5)))
 *     accessor value = 0
 *
 *     @property(rocketCodec(string.trim.lower))
 *     accessor tone = 'neutral'
 *
 *     @property(rocketCodec(oneOf('light', 'dark', 'system')))
 *     accessor theme = 'system'
 *
 *     @property(rocketCodec(bool))
 *     accessor striped = false
 *   }
 *
 * Design
 * ──────────────────────────────────────────────────────────────────────────────
 *
 *   - Each codec implements { decode(unknown): T, encode(T): string }.
 *   - Codecs are immutable builders. Every transform method returns a new codec
 *     with the extra step layered on top — identical to the Rocket fluent API.
 *   - Defaults belong in the Lit accessor initializer (accessor value = 0),
 *     not in the codec chain. The codec handles normalisation only.
 *   - rocketCodec(codec) wraps any codec into a Lit PropertyDeclaration
 *     options object that can be spread into @property().
 *
 * Codec reference
 * ──────────────────────────────────────────────────────────────────────────────
 *
 *   string             Raw string. Falsy/null → ''
 *     .trim            Trim whitespace.
 *     .lower           Lowercase.
 *     .upper           Uppercase.
 *     .title           Title-case (first letter of each word).
 *     .kebab           Convert to kebab-case.
 *     .maxLength(n)    Truncate to at most n characters.
 *     .suffix(s)       Ensure the string ends with suffix s.
 *
 *   number             Parse to number. NaN/invalid → 0.
 *     .min(n)          Floor at n.
 *     .max(n)          Ceiling at n.
 *     .clamp(lo, hi)   Shorthand for .min(lo).max(hi).
 *     .step(s, base?)  Snap to the nearest multiple of s from base.
 *     .round           Round to nearest integer.
 *     .ceil(dp?)       Round up; dp = decimal places (default 0).
 *     .floor(dp?)      Round down; dp = decimal places (default 0).
 *     .fit(iMin, iMax, oMin, oMax, clamp?, round?)
 *                      Linear remap from one range to another.
 *
 *   bool               '' / 'true' / '1' / 'yes' / 'on' → true; else false.
 *
 *   date               ISO string → Date. Invalid input → new Date().
 *
 *   json               JSON.parse. Invalid → {}.
 *
 *   js                 Evaluate valid JS expression. Invalid → {}.
 *                      ⚠ Calls new Function(); only use with trusted attribute values.
 *
 *   bin                base64 string ↔ Uint8Array.
 *
 *   array(codec)       Homogeneous array: JSON-parse then decode each item.
 *   array(c1, c2 …)    Tuple: each position decoded by its own codec.
 *
 *   object(shape)      JSON-parse then decode each field with its codec.
 *
 *   oneOf('a', 'b' …)  Enum: return the matching literal or the first entry.
 *   oneOf(c1, c2 …)    Union: try each codec in order; return first success.
 */
/** The fundamental codec interface: bidirectional string ↔ T conversion. */
export interface Codec<T> {
    decode(value: unknown): T;
    encode(value: T): string;
}
/** A string codec extended with fluent transform builder properties/methods. */
export interface StringCodec extends Codec<string> {
    /** Trim leading and trailing whitespace. */
    readonly trim: StringCodec;
    /** Convert to lower case. */
    readonly lower: StringCodec;
    /** Convert to upper case. */
    readonly upper: StringCodec;
    /** Title-case: capitalise the first letter of every whitespace-separated word. */
    readonly title: StringCodec;
    /**
     * Convert to kebab-case.
     * CamelCase, spaces, and underscores are all converted.
     */
    readonly kebab: StringCodec;
    /** Truncate the string to at most `n` characters. */
    maxLength(n: number): StringCodec;
    /** Ensure the string ends with `s`. If it already does, no change. */
    suffix(s: string): StringCodec;
}
/** A number codec extended with fluent transform builder properties/methods. */
export interface NumberCodec extends Codec<number> {
    /** Enforce a lower bound. Values below `n` become `n`. */
    min(n: number): NumberCodec;
    /** Enforce an upper bound. Values above `n` become `n`. */
    max(n: number): NumberCodec;
    /** Clamp to [lo, hi]. Shorthand for .min(lo).max(hi). */
    clamp(lo: number, hi: number): NumberCodec;
    /**
     * Snap to the nearest multiple of `step` from `stepBase` (default 0).
     * e.g. number.step(5) → 13 becomes 15, 12 becomes 10.
     */
    step(step: number, stepBase?: number): NumberCodec;
    /** Round to the nearest integer. */
    readonly round: NumberCodec;
    /** Round up to `dp` decimal places (default 0). */
    ceil(dp?: number): NumberCodec;
    /** Round down to `dp` decimal places (default 0). */
    floor(dp?: number): NumberCodec;
    /**
     * Linear remap from one numeric range to another.
     * Maps `inMin..inMax` → `outMin..outMax`.
     */
    fit(inMin: number, inMax: number, outMin: number, outMax: number, clamped?: boolean, rounded?: boolean): NumberCodec;
}
/**
 * Wrap a codec into a Lit `PropertyDeclaration` options object.
 *
 * Usage:
 *   @property(rocketCodec(number.clamp(0, 100)))
 *   accessor value = 0
 */
export declare function rocketCodec<T>(codec: Codec<T>): {
    converter: {
        fromAttribute: (v: string | null) => T;
        toAttribute: (v: T) => string;
    };
};
/**
 * Base string codec. Falsy / null input normalises to ''.
 * Extend with the transform properties below.
 */
export declare const string: StringCodec;
/**
 * Base number codec. Parses to a finite number; NaN / invalid → 0.
 */
export declare const number: NumberCodec;
/**
 * Boolean codec.
 *
 * Decodes '' / 'true' / '1' / 'yes' / 'on' as `true`.
 * Absent attribute (null) and all other strings decode as `false`.
 * Encodes `true` as '' (presence-based, matching HTML boolean attributes).
 */
export declare const bool: Codec<boolean>;
/**
 * Date codec.
 *
 * Decodes an ISO date string (or anything `new Date()` accepts) into a `Date`.
 * Invalid input falls back to `new Date()` (current time) rather than an
 * unusable Invalid Date.
 * Encodes as a full ISO string (`.toISOString()`).
 */
export declare const date: Codec<Date>;
/**
 * JSON codec.
 *
 * Decodes a JSON text attribute. Invalid / missing JSON falls back to `{}`.
 * Encodes to `JSON.stringify`.
 */
export declare const json: Codec<unknown>;
/**
 * JS expression codec.
 *
 * Accepts any valid JavaScript expression in the attribute value — including
 * unquoted object keys, trailing commas, etc. Falls back to `{}` on error.
 * Encodes to `JSON.stringify`.
 *
 * ⚠ Uses `new Function()` internally. Only use this codec when the attribute
 *   value is authored by a trusted source (e.g. your own server-rendered HTML),
 *   not from untrusted user input.
 */
export declare const js: Codec<unknown>;
/**
 * Binary codec.
 *
 * Decodes a base64-encoded string attribute into a `Uint8Array`.
 * Missing / invalid input falls back to an empty `Uint8Array`.
 * Encodes bytes back to base64.
 */
export declare const bin: Codec<Uint8Array>;
/** Infer a tuple of decoded types from a tuple of codecs. */
type DecodedTuple<Codecs extends Codec<unknown>[]> = {
    [K in keyof Codecs]: Codecs[K] extends Codec<infer T> ? T : never;
};
/**
 * Array codec factory — homogeneous form.
 *
 * `array(codec)` — every item decoded with the same codec.
 *
 * Attribute text is parsed as strict JSON. Invalid JSON falls back to [].
 */
export declare function array<T>(codec: Codec<T>): Codec<T[]>;
/**
 * Array codec factory — tuple form.
 *
 * `array(c1, c2, c3, …)` — each position decoded by its own codec.
 *
 * Attribute text is parsed as strict JSON. Invalid JSON falls back to [].
 */
export declare function array<Codecs extends [Codec<unknown>, ...Codec<unknown>[]]>(...codecs: Codecs): Codec<DecodedTuple<Codecs>>;
/** Infer the decoded object type from a shape of codecs. */
type DecodedObject<Shape extends Record<string, Codec<unknown>>> = {
    [K in keyof Shape]: Shape[K] extends Codec<infer T> ? T : never;
};
/**
 * Object codec factory.
 *
 * Builds a typed nested object where each key has its own codec.
 *
 * Attribute text is parsed as strict JSON. Invalid JSON falls back to an object
 * where every field takes its codec's zero/default value.
 */
export declare function object<Shape extends Record<string, Codec<unknown>>>(shape: Shape): Codec<DecodedObject<Shape>>;
/** Primitive literal types that can appear as enum entries in `oneOf`. */
type Literal = string | number | boolean;
/**
 * Constrain a prop to a known set of string/number/boolean literals.
 *
 * `oneOf('a', 'b', 'c')` — decode as string and return the matching literal,
 * or fall back to the first.
 */
export declare function oneOf<T extends Literal>(...entries: T[]): Codec<T>;
/**
 * Constrain a prop to a union of codec-typed values.
 *
 * `oneOf(codecA, codecB, …)` — try each codec in order and return the first
 * result that is not null/undefined.
 */
export declare function oneOf<Codecs extends [Codec<unknown>, ...Codec<unknown>[]]>(...entries: Codecs): Codec<DecodedTuple<Codecs>[number]>;
/**
 * Mix literals and codecs.
 *
 * `oneOf('auto', number.clamp(0, 100))` — match the literal 'auto' first,
 * then try the number codec.
 */
export declare function oneOf(...entries: (Literal | Codec<unknown>)[]): Codec<unknown>;
export {};
//# sourceMappingURL=codecs.d.ts.map