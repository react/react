// =============================================================================
// BuildView data-access module  (the storage seam)
// =============================================================================
//
// This is the ONE place in the app that talks to persistent storage.
// No React component, hook, or other module is allowed to touch localStorage
// directly. Everything goes through the `db` object exported at the bottom.
//
// Why this matters: today persistence is the browser's localStorage. Later we
// swap in a real database (REST/GraphQL/SQL) WITHOUT rewriting any flow. To do
// that swap you only have to replace the small `backend` object below — the
// public `db` API and every component that uses it stay exactly the same.
//
// Data shapes follow section 2 of the spec. Every record has `id` and
// `createdAt`. Helpers stamp those automatically on create.
// =============================================================================

// ---------------------------------------------------------------------------
// Collections (one array per object type from the data model, section 2)
// ---------------------------------------------------------------------------
export const COLLECTIONS = [
  'users',
  'projects',
  'buildings',
  'floors',
  'rooms',
  'tasks',
  'photos',
  'issues',
  'memberships', // ProjectMembership / AccessGrant
];

function emptyState() {
  const state = {};
  for (const name of COLLECTIONS) state[name] = [];
  return state;
}

// ---------------------------------------------------------------------------
// Storage backend  — the ONLY code that touches localStorage.
//
// To move BuildView onto a real database later, replace just these two
// functions (or point them at your API). Nothing else needs to change.
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'buildview:v1';
const SESSION_KEY = 'buildview:session:v1';

const backend = {
  loadSession() {
    try {
      return localStorage.getItem(SESSION_KEY) || null;
    } catch (err) {
      return null;
    }
  },

  saveSession(userId) {
    try {
      if (userId) localStorage.setItem(SESSION_KEY, userId);
      else localStorage.removeItem(SESSION_KEY);
    } catch (err) {
      console.error('BuildView: failed to write session.', err);
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      const parsed = JSON.parse(raw);
      // Make sure every known collection exists even if the stored blob is old.
      return {...emptyState(), ...parsed};
    } catch (err) {
      // Corrupt or unavailable storage: start clean rather than crash.
      console.error('BuildView: failed to read storage, starting empty.', err);
      return emptyState();
    }
  },

  save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.error('BuildView: failed to write storage.', err);
    }
  },
};

// ---------------------------------------------------------------------------
// In-memory cache. Loaded once, kept in sync with the backend on every write.
// Reads come from here so the UI is synchronous; writes persist immediately.
// ---------------------------------------------------------------------------
let state = backend.load();

// Monotonic version, bumped on every successful write. React subscribers read
// this as a stable snapshot (see lib/useDb.js) to know when to re-render,
// instead of diffing freshly-cloned arrays on every render.
let version = 0;

function persist() {
  backend.save(state);
  version += 1;
  notify();
}

// ---------------------------------------------------------------------------
// Tiny pub/sub so React can re-render when data changes. (Still part of the
// data-access seam — components subscribe here instead of polling storage.)
// ---------------------------------------------------------------------------
const listeners = new Set();

function notify() {
  for (const fn of listeners) fn();
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function uid() {
  // Good enough for a local prototype; stable, unique, sortable-ish.
  return (
    Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
  );
}

function now() {
  return new Date().toISOString();
}

// Return shallow copies so callers can never mutate the cache by reference.
function clone(row) {
  return row == null ? row : {...row};
}

function assertCollection(name) {
  if (!COLLECTIONS.includes(name)) {
    throw new Error(`BuildView: unknown collection "${name}"`);
  }
}

// ---------------------------------------------------------------------------
// Generic CRUD. All entity helpers below are thin wrappers over these.
// ---------------------------------------------------------------------------
function list(name, predicate) {
  assertCollection(name);
  const rows = state[name];
  const out = predicate ? rows.filter(predicate) : rows;
  return out.map(clone);
}

function get(name, id) {
  assertCollection(name);
  return clone(state[name].find(r => r.id === id));
}

function create(name, data) {
  assertCollection(name);
  const row = {id: uid(), createdAt: now(), ...data};
  state[name] = [...state[name], row];
  persist();
  return clone(row);
}

function update(name, id, patch) {
  assertCollection(name);
  let updated = null;
  state[name] = state[name].map(r => {
    if (r.id !== id) return r;
    // Never let callers overwrite id/createdAt.
    updated = {...r, ...patch, id: r.id, createdAt: r.createdAt};
    return updated;
  });
  if (updated) persist();
  return clone(updated);
}

function remove(name, id) {
  assertCollection(name);
  const before = state[name].length;
  state[name] = state[name].filter(r => r.id !== id);
  if (state[name].length !== before) persist();
}

// ---------------------------------------------------------------------------
// Public API
//
// Generic access:   db.list('tasks', t => ...) / db.get / db.create / ...
// Per-entity sugar: db.tasks.list() / db.tasks.create({...}) / etc.
//
// Components should prefer the per-entity helpers for readability, but both
// route through the same seam.
// ---------------------------------------------------------------------------
function entity(name) {
  return {
    list: predicate => list(name, predicate),
    get: id => get(name, id),
    create: data => create(name, data),
    update: (id, patch) => update(name, id, patch),
    remove: id => remove(name, id),
  };
}

export const db = {
  // generic
  list,
  get,
  create,
  update,
  remove,
  subscribe,
  getVersion: () => version,

  // session (the fake "logged in" user id for the prototype). Still routed
  // through the seam so no component touches storage directly.
  session: {
    getCurrentUserId() {
      return backend.loadSession();
    },
    setCurrentUserId(userId) {
      backend.saveSession(userId);
      version += 1;
      notify();
    },
    clear() {
      backend.saveSession(null);
      version += 1;
      notify();
    },
  },

  // per-entity (section 2 data model)
  users: entity('users'),
  projects: entity('projects'),
  buildings: entity('buildings'),
  floors: entity('floors'),
  rooms: entity('rooms'),
  tasks: entity('tasks'),
  photos: entity('photos'),
  issues: entity('issues'),
  memberships: entity('memberships'),

  // maintenance / debugging
  exportAll() {
    return JSON.parse(JSON.stringify(state));
  },
  reset() {
    state = emptyState();
    persist();
  },
};

export default db;
