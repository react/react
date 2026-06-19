// -----------------------------------------------------------------------------
// Permissions (section 3). This is the ONE place the visibility/edit rules live.
// Every screen asks these functions instead of re-deriving the rule, so the
// permission rule is enforced consistently everywhere.
//
// Core rule (worker):
//   visible tasks = tasks in the worker's GRANTED rooms where
//     (task.trade == worker.trade) OR (worker.id in task.assignedWorkerIds)
//   Filter by membership first. Pending membership => sees nothing.
// -----------------------------------------------------------------------------
import {db} from '../data/db.js';
import {ROLES, ACCESS_LEVEL} from './constants.js';
import {getProjectIdForTask} from './queries.js';

export function isForeman(user) {
  return !!user && user.role === ROLES.FOREMAN;
}

export function isWorker(user) {
  return !!user && user.role === ROLES.WORKER;
}

export function getMembership(userId, projectId) {
  return (
    db.memberships.list(
      m => m.userId === userId && m.projectId === projectId
    )[0] || null
  );
}

export function isGranted(membership) {
  return !!membership && membership.accessLevel === ACCESS_LEVEL.GRANTED;
}

// Granted room ids for a worker in a project (empty if not granted).
function grantedRoomIds(userId, projectId) {
  const m = getMembership(userId, projectId);
  if (!isGranted(m)) return new Set();
  return new Set(m.visibleRoomIds);
}

// The worker visibility rule, applied to a single task.
function workerCanSeeTask(user, task) {
  const projectId = getProjectIdForTask(task.id);
  if (!projectId) return false;
  const roomIds = grantedRoomIds(user.id, projectId);
  if (!roomIds.has(task.roomId)) return false; // membership/room filter first
  return (
    task.trade === user.trade || task.assignedWorkerIds.includes(user.id)
  );
}

// -----------------------------------------------------------------------------
// Public checks
// -----------------------------------------------------------------------------

// The worker's visible task list within one project (the section-3 rule).
// Foreman gets every task in the project (handled by callers via queries).
export function getVisibleTasksForWorker(user, projectId) {
  if (!isWorker(user)) return [];
  const roomIds = grantedRoomIds(user.id, projectId);
  if (roomIds.size === 0) return []; // pending or no access => nothing
  return db.tasks.list(
    t =>
      roomIds.has(t.roomId) &&
      (t.trade === user.trade || t.assignedWorkerIds.includes(user.id))
  );
}

// Across every project the worker has access to.
export function getAllVisibleTasksForWorker(user) {
  if (!isWorker(user)) return [];
  const granted = db.memberships.list(
    m => m.userId === user.id && m.accessLevel === ACCESS_LEVEL.GRANTED
  );
  const out = [];
  const seen = new Set();
  for (const m of granted) {
    for (const t of getVisibleTasksForWorker(user, m.projectId)) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        out.push(t);
      }
    }
  }
  return out;
}

// Can this user even view this task's detail screen?
export function canViewTask(user, task) {
  if (!user || !task) return false;
  if (isForeman(user)) {
    // Foreman sees the whole project they own.
    const projectId = getProjectIdForTask(task.id);
    const project = projectId ? db.projects.get(projectId) : null;
    return !!project && project.createdByUserId === user.id;
  }
  return workerCanSeeTask(user, task);
}

// Is the worker personally assigned to this task?
export function isAssigned(user, task) {
  return !!user && !!task && task.assignedWorkerIds.includes(user.id);
}

// Worker may change status / upload photo / raise issue ONLY on tasks they are
// assigned to. Foreman may act on any task in their project.
export function canEditTaskStatus(user, task) {
  if (isForeman(user)) return canViewTask(user, task);
  return isWorker(user) && isAssigned(user, task) && workerCanSeeTask(user, task);
}

export function canUploadPhoto(user, task) {
  return canEditTaskStatus(user, task);
}

export function canRaiseIssue(user, task) {
  // Foreman: any task in their project. Worker: tasks they are assigned to.
  return canEditTaskStatus(user, task);
}

export function canResolveIssue(user) {
  // Only the foreman resolves issues.
  return isForeman(user);
}
