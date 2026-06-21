// -----------------------------------------------------------------------------
// Fixed enumerations from the spec (sections 0 and 2).
// Kept in one place so screens and validation share the same source of truth.
// -----------------------------------------------------------------------------

export const ROLES = {
  FOREMAN: 'foreman',
  WORKER: 'worker',
};

export const ROLE_LIST = [ROLES.FOREMAN, ROLES.WORKER];

// Trades: fixed list from section 2. Foremen may have trade "none".
export const TRADES = {
  ELECTRICIAN: 'electrician',
  PLUMBER: 'plumber',
  DRYWALL: 'drywall',
  PAINTER: 'painter',
  TILER: 'tiler',
  GENERAL: 'general',
  OTHER: 'other',
  NONE: 'none', // foreman only
};

// Trades a worker can choose (excludes "none").
export const WORKER_TRADES = [
  TRADES.ELECTRICIAN,
  TRADES.PLUMBER,
  TRADES.DRYWALL,
  TRADES.PAINTER,
  TRADES.TILER,
  TRADES.GENERAL,
  TRADES.OTHER,
];

export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
};

export const TASK_STATUS_LIST = [
  TASK_STATUS.TODO,
  TASK_STATUS.IN_PROGRESS,
  TASK_STATUS.DONE,
];

export const TASK_STATUS_LABEL = {
  [TASK_STATUS.TODO]: 'To do',
  [TASK_STATUS.IN_PROGRESS]: 'In progress',
  [TASK_STATUS.DONE]: 'Done',
};

export const ISSUE_STATUS = {
  OPEN: 'open',
  RESOLVED: 'resolved',
};

// Derived room status (computed from a room's tasks + issues, never stored).
export const ROOM_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  BLOCKED: 'blocked',
  DONE: 'done',
};

export const ROOM_STATUS_LABEL = {
  [ROOM_STATUS.TODO]: 'To do',
  [ROOM_STATUS.IN_PROGRESS]: 'In progress',
  [ROOM_STATUS.BLOCKED]: 'Blocked',
  [ROOM_STATUS.DONE]: 'Done',
};

export const ACCESS_LEVEL = {
  PENDING: 'pending',
  GRANTED: 'granted',
};
