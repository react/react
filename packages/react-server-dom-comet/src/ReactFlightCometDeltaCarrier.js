/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

/**
 * Relay-store delta carrier for CometJS differential piggyback (roadmap C.3 / C.5 / C.18).
 *
 * On a page transition, the client sends a compact **store digest** (a Bloom
 * filter of the record data-IDs it holds and considers fresh). The server, after
 * running the route's Relay preloads into normalized records, uses this module to
 * drop records the digest reports as present, serializing only the delta into the
 * Flight stream. The client then merges the delta into the normalized Relay store
 * by data ID (via `environment.hydrate(...)`). A Bloom false positive (a
 * wrongly-omitted record) is corrected by the client's `store-or-network`
 * fallback, so correctness is preserved and only wire efficiency is affected.
 *
 * The digest wire format is identical to CometJS `relay/store-digest.ts`:
 * `"<m>,<k>,<base64 bits>"`. This module is pure, dependency-free, and has no
 * React internals so it can run in either environment.
 */

export type ParsedDigest = {
  +m: number,
  +k: number,
  +bits: Uint8Array,
};

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

function fnv1a(str: string, seed: number): number {
  let hash = (FNV_OFFSET ^ seed) >>> 0;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash >>> 0;
}

function positions(id: string, m: number, k: number): Array<number> {
  const h1 = fnv1a(id, 0);
  const h2 = (fnv1a(id, 0x9e3779b9) | 1) >>> 0;
  const out = [];
  for (let i = 0; i < k; i++) {
    const combined = (h1 + Math.imul(i, h2)) >>> 0;
    out.push(combined % m);
  }
  return out;
}

function getBit(bits: Uint8Array, pos: number): boolean {
  return (bits[pos >>> 3] & (1 << (pos & 7))) !== 0;
}

function base64ToBytes(b64: string): Uint8Array {
  // eslint-disable-next-line no-undef
  if (typeof atob === 'function') {
    // eslint-disable-next-line no-undef
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  // eslint-disable-next-line no-undef
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

/** Parse the `"m,k,base64"` wire form. Returns null on malformed input. */
export function parseDigest(wire: string | null | void): ParsedDigest | null {
  if (wire == null) {
    return null;
  }
  const comma1 = wire.indexOf(',');
  const comma2 = wire.indexOf(',', comma1 + 1);
  if (comma1 < 0 || comma2 < 0) {
    return null;
  }
  const m = Number(wire.slice(0, comma1));
  const k = Number(wire.slice(comma1 + 1, comma2));
  const b64 = wire.slice(comma2 + 1);
  if (!Number.isFinite(m) || !Number.isFinite(k) || m <= 0 || k <= 0) {
    return null;
  }
  try {
    const bytes = base64ToBytes(b64);
    if (bytes.length !== m >>> 3) {
      return null;
    }
    return {m, k, bits: bytes};
  } catch (e) {
    return null;
  }
}

/** Membership test: `false` ⇒ definitely absent; `true` ⇒ probably present. */
export function digestHas(digest: ParsedDigest, id: string): boolean {
  const ps = positions(id, digest.m, digest.k);
  for (let i = 0; i < ps.length; i++) {
    if (!getBit(digest.bits, ps[i])) {
      return false;
    }
  }
  return true;
}

/**
 * Partition normalized records into `{send, omit}` given the client's digest.
 * Records the digest reports as present are omitted (the client already has
 * them); everything else is sent. With a null digest (cold store / initial load)
 * everything is sent — the same code path (C.18: initial load = empty digest).
 */
export function omitPresentRecords<T>(
  records: $ReadOnlyArray<[string, T]>,
  digest: ParsedDigest | null,
): {send: Array<[string, T]>, omit: Array<[string, T]>} {
  const send: Array<[string, T]> = [];
  const omit: Array<[string, T]> = [];
  for (let i = 0; i < records.length; i++) {
    const entry = records[i];
    if (digest !== null && digestHas(digest, entry[0])) {
      omit.push(entry);
    } else {
      send.push(entry);
    }
  }
  return {send, omit};
}

/**
 * Convenience: parse a raw header value and omit present records in one call.
 * `digestHeader` is the `x-comet-store-digest` request header (or null).
 */
export function selectDeltaRecords<T>(
  records: $ReadOnlyArray<[string, T]>,
  digestHeader: string | null | void,
): {send: Array<[string, T]>, omit: Array<[string, T]>} {
  return omitPresentRecords(records, parseDigest(digestHeader));
}
