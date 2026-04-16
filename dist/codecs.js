/**
 * codecs.ts — Fluent attribute codec library for Lit web components.
 *
 * Ignition codecs — a standalone fluent attribute codec module, with no
 * dependency on any third-party bundles. Use with Lit's
 * `@property()` decorator via the `ignitionCodec()` bridge adapter.
 *
 * Quick-start
 * ──────────────────────────────────────────────────────────────────────────────
 *
 *   import { ignitionCodec, number, string, bool, oneOf, array, object } from './codecs.js'
 *   import { LitElement, html } from 'lit'
 *   import { property } from 'lit/decorators.js'
 *
 *   class DemoProgress extends LitElement {
 *     @property(ignitionCodec(number.clamp(0, 100).step(5)))
 *     accessor value = 0
 *
 *     @property(ignitionCodec(string.trim.lower))
 *     accessor tone = 'neutral'
 *
 *     @property(ignitionCodec(oneOf('light', 'dark', 'system')))
 *     accessor theme = 'system'
 *
 *     @property(ignitionCodec(bool))
 *     accessor striped = false
 *   }
 *
 * Design
 * ──────────────────────────────────────────────────────────────────────────────
 *
 *   - Each codec implements { decode(unknown): T, encode(T): string }.
 *   - Codecs are immutable builders. Every transform method returns a new codec
 *     with the extra step layered on top — identical to the Ignition fluent API.
 *   - Defaults belong in the Lit accessor initializer (accessor value = 0),
 *     not in the codec chain. The codec handles normalisation only.
 *   - ignitionCodec(codec) wraps any codec into a Lit PropertyDeclaration
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
// ── Helpers ───────────────────────────────────────────────────────────────────
function makeCodec(impl) {
    return Object.freeze(Object.assign(Object.create(null), impl));
}
// ── ignitionCodec bridge ──────────────────────────────────────────────────────
/**
 * Wrap a codec into a Lit `PropertyDeclaration` options object.
 *
 * Usage:
 *   @property(ignitionCodec(number.clamp(0, 100)))
 *   accessor value = 0
 */
export function ignitionCodec(codec) {
    return {
        converter: {
            fromAttribute: (value) => codec.decode(value),
            toAttribute: (value) => codec.encode(value),
        },
    };
}
// ── string codec ──────────────────────────────────────────────────────────────
function toStr(value) {
    if (value == null)
        return '';
    if (typeof value === 'string')
        return value;
    return String(value);
}
function makeStringCodec(impl) {
    const base = makeCodec(impl);
    return Object.freeze(Object.assign(Object.create(null), impl, {
        get trim() {
            return makeStringCodec({
                decode: (v) => base.decode(v).trim(),
                encode: base.encode.bind(base),
            });
        },
        get lower() {
            return makeStringCodec({
                decode: (v) => base.decode(v).toLowerCase(),
                encode: base.encode.bind(base),
            });
        },
        get upper() {
            return makeStringCodec({
                decode: (v) => base.decode(v).toUpperCase(),
                encode: base.encode.bind(base),
            });
        },
        get title() {
            return makeStringCodec({
                decode: (v) => base.decode(v).replace(/\b\w/g, (c) => c.toUpperCase()),
                encode: base.encode.bind(base),
            });
        },
        get kebab() {
            return makeStringCodec({
                decode: (v) => base
                    .decode(v)
                    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
                    .replace(/[\s_]+/g, '-')
                    .toLowerCase(),
                encode: base.encode.bind(base),
            });
        },
        maxLength(n) {
            return makeStringCodec({
                decode: (v) => base.decode(v).slice(0, n),
                encode: base.encode.bind(base),
            });
        },
        suffix(s) {
            return makeStringCodec({
                decode: (v) => {
                    const str = base.decode(v);
                    return str.endsWith(s) ? str : str + s;
                },
                encode: base.encode.bind(base),
            });
        },
    }));
}
/**
 * Base string codec. Falsy / null input normalises to ''.
 * Extend with the transform properties below.
 */
export const string = makeStringCodec({
    decode: toStr,
    encode: toStr,
});
// ── number codec ──────────────────────────────────────────────────────────────
function toNum(value) {
    if (value == null || value === '')
        return 0;
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}
function makeNumberCodec(impl) {
    const base = makeCodec(impl);
    return Object.freeze(Object.assign(Object.create(null), impl, {
        min(n) {
            return makeNumberCodec({
                decode: (v) => Math.max(n, base.decode(v)),
                encode: base.encode.bind(base),
            });
        },
        max(n) {
            return makeNumberCodec({
                decode: (v) => Math.min(n, base.decode(v)),
                encode: base.encode.bind(base),
            });
        },
        clamp(lo, hi) {
            return makeNumberCodec({
                decode: (v) => Math.min(hi, Math.max(lo, base.decode(v))),
                encode: base.encode.bind(base),
            });
        },
        step(step, stepBase = 0) {
            return makeNumberCodec({
                decode: (v) => {
                    const n = base.decode(v);
                    return Math.round((n - stepBase) / step) * step + stepBase;
                },
                encode: base.encode.bind(base),
            });
        },
        get round() {
            return makeNumberCodec({
                decode: (v) => Math.round(base.decode(v)),
                encode: base.encode.bind(base),
            });
        },
        ceil(dp = 0) {
            const factor = 10 ** dp;
            return makeNumberCodec({
                decode: (v) => Math.ceil(base.decode(v) * factor) / factor,
                encode: base.encode.bind(base),
            });
        },
        floor(dp = 0) {
            const factor = 10 ** dp;
            return makeNumberCodec({
                decode: (v) => Math.floor(base.decode(v) * factor) / factor,
                encode: base.encode.bind(base),
            });
        },
        fit(inMin, inMax, outMin, outMax, clamped = false, rounded = false) {
            return makeNumberCodec({
                decode: (v) => {
                    let n = base.decode(v);
                    if (clamped)
                        n = Math.min(inMax, Math.max(inMin, n));
                    const mapped = outMin + ((n - inMin) / (inMax - inMin)) * (outMax - outMin);
                    return rounded ? Math.round(mapped) : mapped;
                },
                encode: base.encode.bind(base),
            });
        },
    }));
}
/**
 * Base number codec. Parses to a finite number; NaN / invalid → 0.
 */
export const number = makeNumberCodec({
    decode: toNum,
    encode: (v) => String(v),
});
// ── bool codec ────────────────────────────────────────────────────────────────
const TRUTHY_STRINGS = new Set(['', 'true', '1', 'yes', 'on']);
/**
 * Boolean codec.
 *
 * Decodes '' / 'true' / '1' / 'yes' / 'on' as `true`.
 * Absent attribute (null) and all other strings decode as `false`.
 * Encodes `true` as '' (presence-based, matching HTML boolean attributes).
 */
export const bool = makeCodec({
    decode(value) {
        if (value === null || value === undefined)
            return false;
        if (typeof value === 'boolean')
            return value;
        return TRUTHY_STRINGS.has(String(value).toLowerCase().trim());
    },
    encode(value) {
        return value ? '' : 'false';
    },
});
// ── date codec ────────────────────────────────────────────────────────────────
/**
 * Date codec.
 *
 * Decodes an ISO date string (or anything `new Date()` accepts) into a `Date`.
 * Invalid input falls back to `new Date()` (current time) rather than an
 * unusable Invalid Date.
 * Encodes as a full ISO string (`.toISOString()`).
 */
export const date = makeCodec({
    decode(value) {
        if (value instanceof Date)
            return Number.isNaN(value.getTime()) ? new Date() : value;
        const d = new Date(value == null ? '' : String(value));
        return Number.isNaN(d.getTime()) ? new Date() : d;
    },
    encode(value) {
        return value instanceof Date ? value.toISOString() : String(value);
    },
});
// ── json codec ────────────────────────────────────────────────────────────────
/**
 * JSON codec.
 *
 * Decodes a JSON text attribute. Invalid / missing JSON falls back to `{}`.
 * Encodes to `JSON.stringify`.
 */
export const json = makeCodec({
    decode(value) {
        if (value == null || value === '')
            return {};
        if (typeof value !== 'string')
            return value;
        try {
            return JSON.parse(value);
        }
        catch {
            return {};
        }
    },
    encode(value) {
        return JSON.stringify(value);
    },
});
// ── js codec ──────────────────────────────────────────────────────────────────
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
export const js = makeCodec({
    decode(value) {
        if (value == null || value === '')
            return {};
        if (typeof value !== 'string')
            return value;
        try {
            // eslint-disable-next-line no-new-func
            return new Function('return (' + value + ')')();
        }
        catch {
            return {};
        }
    },
    encode(value) {
        return JSON.stringify(value);
    },
});
// ── bin codec ─────────────────────────────────────────────────────────────────
/**
 * Binary codec.
 *
 * Decodes a base64-encoded string attribute into a `Uint8Array`.
 * Missing / invalid input falls back to an empty `Uint8Array`.
 * Encodes bytes back to base64.
 */
export const bin = makeCodec({
    decode(value) {
        if (value == null || value === '')
            return new Uint8Array(0);
        if (value instanceof Uint8Array)
            return value;
        try {
            const binary = atob(String(value));
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            return bytes;
        }
        catch {
            return new Uint8Array(0);
        }
    },
    encode(value) {
        if (!(value instanceof Uint8Array))
            return '';
        let binary = '';
        for (let i = 0; i < value.length; i++) {
            binary += String.fromCharCode(value[i]);
        }
        return btoa(binary);
    },
});
export function array(...codecs) {
    if (codecs.length === 0) {
        throw new TypeError('array() requires at least one codec argument');
    }
    const isTuple = codecs.length > 1;
    return makeCodec({
        decode(value) {
            let parsed;
            if (Array.isArray(value)) {
                parsed = value;
            }
            else {
                const text = value == null ? '' : String(value);
                if (text === '')
                    return [];
                try {
                    parsed = JSON.parse(text);
                }
                catch {
                    return [];
                }
                if (!Array.isArray(parsed))
                    return [];
            }
            if (isTuple) {
                return codecs.map((codec, i) => i < parsed.length
                    ? codec.decode(parsed[i])
                    : codec.decode(undefined));
            }
            else {
                return parsed.map((item) => codecs[0].decode(item));
            }
        },
        encode(value) {
            if (!Array.isArray(value))
                return '[]';
            return JSON.stringify(isTuple
                ? value.map((item, i) => i < codecs.length
                    ? JSON.parse(codecs[i].encode(item))
                    : item)
                : value.map((item) => JSON.parse(codecs[0].encode(item))));
        },
    });
}
/**
 * Object codec factory.
 *
 * Builds a typed nested object where each key has its own codec.
 *
 * Attribute text is parsed as strict JSON. Invalid JSON falls back to an object
 * where every field takes its codec's zero/default value.
 */
export function object(shape) {
    const keys = Object.keys(shape);
    return makeCodec({
        decode(value) {
            let parsed;
            if (value !== null &&
                typeof value === 'object' &&
                !Array.isArray(value)) {
                parsed = value;
            }
            else {
                const text = value == null ? '' : String(value);
                if (text === '') {
                    parsed = {};
                }
                else {
                    try {
                        parsed = JSON.parse(text);
                    }
                    catch {
                        parsed = {};
                    }
                    if (typeof parsed !== 'object' ||
                        parsed === null ||
                        Array.isArray(parsed)) {
                        parsed = {};
                    }
                }
            }
            const result = {};
            for (const key of keys) {
                result[key] = shape[key].decode(key in parsed ? parsed[key] : undefined);
            }
            return result;
        },
        encode(value) {
            if (value == null || typeof value !== 'object')
                return '{}';
            const result = {};
            for (const key of keys) {
                if (key in value) {
                    result[key] = JSON.parse(shape[key].encode(value[key]));
                }
            }
            return JSON.stringify(result);
        },
    });
}
export function oneOf(...entries) {
    if (entries.length === 0) {
        throw new TypeError('oneOf() requires at least one argument');
    }
    const first = entries[0];
    return makeCodec({
        decode(value) {
            for (const entry of entries) {
                if (typeof entry === 'object' &&
                    entry !== null &&
                    typeof entry.decode === 'function') {
                    try {
                        const result = entry.decode(value);
                        if (result !== undefined)
                            return result;
                    }
                    catch {
                        // try next
                    }
                }
                else {
                    const raw = value == null ? '' : String(value);
                    if (raw === String(entry))
                        return entry;
                }
            }
            // Fall back to first entry
            if (typeof first === 'object' &&
                first !== null &&
                typeof first.decode === 'function') {
                return first.decode(value);
            }
            return first;
        },
        encode(value) {
            for (const entry of entries) {
                if (typeof entry === 'object' &&
                    entry !== null &&
                    typeof entry.encode === 'function') {
                    return entry.encode(value);
                }
                else {
                    if (value === entry)
                        return String(entry);
                }
            }
            return String(value);
        },
    });
}
//# sourceMappingURL=codecs.js.map