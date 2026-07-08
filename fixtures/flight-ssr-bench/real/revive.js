'use strict';

// Revives a captured Flight payload (wire format) back into a renderable
// model, so the bench can re-serialize a real page's tree through the
// local Flight build.
//
// Every "$"-encoding is turned back into the value it encoded: element
// tuples into elements, module references into registered client
// references carrying the captured chunk lists (so import rows keep their
// real weight), row backrefs into shared objects (one instance per render,
// like the original), promises into resolved promises. Rows that only
// existed as aborted/postponed streams in the capture (PPR holes) revive
// as null and are counted.
//
// revive() builds a fresh model each call: a real server renders fresh
// data per request, and reusing one tree would let generational GC and the
// dedupe cache flatter the numbers.

const fs = require('fs');

const LENGTH_PREFIXED = new Set([
  'T',
  'A',
  'O',
  'o',
  'b',
  'U',
  'S',
  's',
  'L',
  'l',
  'G',
  'g',
  'M',
  'm',
  'V',
]);

function extractStream(file) {
  const html = fs.readFileSync(file, 'utf8');
  const re = /self\.__next_f\.push\((\[[\s\S]*?\])\)<\/script>/g;
  let m;
  let out = '';
  while ((m = re.exec(html)) !== null) {
    let entry;
    try {
      entry = JSON.parse(m[1]);
    } catch (e) {
      continue;
    }
    if (entry[0] === 1 && typeof entry[1] === 'string') out += entry[1];
  }
  if (!out) throw new Error('no Flight payload in ' + file);
  return out;
}

function parseRows(streamText) {
  const buf = Buffer.from(streamText, 'utf8');
  const rows = new Map();
  let i = 0;
  while (i < buf.length) {
    let id = 0;
    while (i < buf.length && buf[i] !== 0x3a) {
      const b = buf[i++];
      id = (id << 4) | (b > 96 ? b - 87 : b > 64 ? b - 55 : b - 48);
    }
    i++;
    if (i >= buf.length) break;
    const tagChar = String.fromCharCode(buf[i]);
    if (LENGTH_PREFIXED.has(tagChar)) {
      i++;
      let len = 0;
      while (buf[i] !== 0x2c) {
        const b = buf[i++];
        len = (len << 4) | (b > 96 ? b - 87 : b - 48);
      }
      i++;
      rows.set(id, {
        tag: tagChar,
        body: buf.slice(i, i + len).toString('utf8'),
      });
      i += len;
    } else if (
      (buf[i] > 64 && buf[i] < 91) ||
      tagChar === '#' ||
      tagChar === 'r' ||
      tagChar === 'x'
    ) {
      i++;
      let end = buf.indexOf(0x0a, i);
      if (end === -1) end = buf.length;
      // Later rows for the same id (stream chunks) don't overwrite.
      if (!rows.has(id)) {
        rows.set(id, {tag: tagChar, body: buf.slice(i, end).toString('utf8')});
      }
      i = end + 1;
    } else {
      let end = buf.indexOf(0x0a, i);
      if (end === -1) end = buf.length;
      rows.set(id, {tag: '', body: buf.slice(i, end).toString('utf8')});
      i = end + 1;
    }
  }
  return rows;
}

function loadPayload(
  file,
  ReactServer,
  registerClientReference,
  registerServerReference
) {
  const rows = parseRows(extractStream(file));

  // One registered client reference per captured module reference; the
  // manifest entry carries the captured metadata so the re-serialized
  // import rows have the captured chunk lists.
  const clientManifest = {};
  const clientRefs = new Map();
  for (const [id, row] of rows) {
    if (row.tag !== 'I') continue;
    let meta;
    try {
      meta = JSON.parse(row.body);
    } catch (e) {
      continue;
    }
    const moduleId = Array.isArray(meta) ? meta[0] : meta.id;
    const chunks = Array.isArray(meta) ? meta[1] : meta.chunks;
    const name = (Array.isArray(meta) ? meta[2] : meta.name) || 'default';
    const syntheticId = 'captured-module-' + id;
    const ref = registerClientReference({}, syntheticId, name);
    clientManifest[syntheticId] = {
      id: moduleId,
      chunks: Array.isArray(chunks) ? chunks : [],
      name: name,
      async: false,
    };
    clientRefs.set(id, ref);
  }

  // Server function references revive as registered no-op functions with
  // the captured ids, like module-level actions in a real app. Stable
  // across renders, keyed by the metadata row.
  const serverRefs = new Map();
  function reviveServerRef(id) {
    if (serverRefs.has(id)) return serverRefs.get(id);
    let refId = 'captured-action-' + id;
    const row = rows.get(id);
    if (row && row.tag === '') {
      try {
        const meta = JSON.parse(row.body);
        if (meta && typeof meta.id === 'string') refId = meta.id;
      } catch (e) {}
    }
    const ref = registerServerReference(async function () {}, refId, null);
    serverRefs.set(id, ref);
    return ref;
  }

  const stats = {
    renders: 0,
    holes: 0, // refs to rows the capture never delivered (PPR/aborted)
    streams: 0, // stream/iterator refs replaced with null
    serverRefs: 0, // "$F"/"$h" server function refs, revived as no-op actions
    unknown: 0, // any other unrevivable encoding
  };

  function revive() {
    stats.renders++;
    const cache = new Map(); // rowId -> revived, for shared identity

    function reviveRowRef(id) {
      if (cache.has(id)) return cache.get(id);
      const row = rows.get(id);
      let value = null;
      if (row === undefined) {
        stats.holes++;
      } else if (row.tag === 'I') {
        value = clientRefs.get(id);
      } else if (row.tag === 'T') {
        value = row.body;
      } else if (row.tag === '') {
        // Reserve the slot first so a self-referencing row can't recurse
        // forever; wire rows are acyclic in practice.
        cache.set(id, null);
        value = reviveValue(JSON.parse(row.body));
      } else {
        stats.holes++;
      }
      cache.set(id, value);
      return value;
    }

    function reviveString(v) {
      if (v.charCodeAt(0) !== 0x24) return v;
      if (v.charCodeAt(1) === 0x24) return v.slice(1); // "$$..." escaped
      if (v === '$undefined') return undefined;
      if (v === '$NaN') return NaN;
      if (v === '$Infinity') return Infinity;
      if (v === '$-Infinity') return -Infinity;
      if (v === '$-0') return -0;
      const tag = v[1];
      switch (tag) {
        case 'L':
          return reviveRowRef(parseInt(v.slice(2), 16));
        case '@':
          return Promise.resolve(reviveRowRef(parseInt(v.slice(2), 16)));
        case 'D':
          return new Date(v.slice(2));
        case 'n':
          return BigInt(v.slice(2));
        case 'S':
          return Symbol.for(v.slice(2));
        case 'Q': {
          const entries = reviveRowRef(parseInt(v.slice(2), 16));
          return new Map(entries || []);
        }
        case 'W': {
          const entries = reviveRowRef(parseInt(v.slice(2), 16));
          return new Set(entries || []);
        }
        case 'F':
        case 'h':
          stats.serverRefs++;
          return reviveServerRef(parseInt(v.slice(2), 16));
        case 'R':
        case 'r':
        case 'X':
        case 'x':
        case 'B':
        case 'K':
        case 'T':
        case 'A':
        case 'O':
        case 'o':
        case 'U':
        case 'C':
        case 'Y':
        case 'P':
        case 'E':
        case 'I':
          stats.streams++;
          return null;
        default: {
          // "$<hex>": reference to another row.
          const id = parseInt(v.slice(1), 16);
          if (Number.isNaN(id)) {
            stats.unknown++;
            return null;
          }
          return reviveRowRef(id);
        }
      }
    }

    function reviveValue(v) {
      if (typeof v === 'string') return reviveString(v);
      if (v === null || typeof v !== 'object') return v;
      if (Array.isArray(v)) {
        if (v.length >= 3 && v[0] === '$') {
          // Element tuple: ["$", type, key, props].
          const type = reviveValue(v[1]);
          const props = reviveValue(v[3]) || {};
          if (v[2] !== null) props.key = v[2];
          return ReactServer.createElement(type, props);
        }
        const out = [];
        for (let i = 0; i < v.length; i++) out.push(reviveValue(v[i]));
        return out;
      }
      const out = {};
      for (const k in v) out[k] = reviveValue(v[k]);
      return out;
    }

    return reviveRowRef(0);
  }

  return {revive, clientManifest, stats, rowCount: rows.size};
}

module.exports = {loadPayload};
