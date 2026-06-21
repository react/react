// -----------------------------------------------------------------------------
// Derived status + progress (computed from data, never stored).
//
// Room status drives the plan-first floor view; progress + aggregates drive the
// foreman control view and the project report. All reads go through the seam
// via the query helpers — no storage access, no new persisted fields.
// -----------------------------------------------------------------------------
import {db} from '../data/db.js';
import {TASK_STATUS, ISSUE_STATUS, ROOM_STATUS} from './constants.js';
import {
  getTasks,
  getIssues,
  getAllRoomsForProject,
  getAllTasksForProject,
} from './queries.js';

// Room status from its tasks + issues (priority: blocked > done > in progress).
export function getRoomStatus(roomId) {
  const tasks = getTasks(roomId);
  if (tasks.length === 0) return ROOM_STATUS.TODO;

  const hasOpenIssue = tasks.some(t =>
    getIssues(t.id).some(i => i.status === ISSUE_STATUS.OPEN)
  );
  if (hasOpenIssue) return ROOM_STATUS.BLOCKED;

  if (tasks.every(t => t.status === TASK_STATUS.DONE)) return ROOM_STATUS.DONE;
  if (tasks.some(t => t.status === TASK_STATUS.IN_PROGRESS)) {
    return ROOM_STATUS.IN_PROGRESS;
  }
  return ROOM_STATUS.TODO;
}

// All rooms in a project, each with its derived status.
export function getRoomsWithStatus(projectId) {
  return getAllRoomsForProject(projectId).map(room => ({
    room,
    status: getRoomStatus(room.id),
  }));
}

export function getBlockedRooms(projectId) {
  return getRoomsWithStatus(projectId).filter(
    r => r.status === ROOM_STATUS.BLOCKED
  );
}

export function getActiveRooms(projectId) {
  return getRoomsWithStatus(projectId).filter(
    r => r.status === ROOM_STATUS.IN_PROGRESS
  );
}

// Project progress: percent of tasks done (0 when there are no tasks).
export function getProjectProgress(projectId) {
  const tasks = getAllTasksForProject(projectId);
  const total = tasks.length;
  const done = tasks.filter(t => t.status === TASK_STATUS.DONE).length;
  const inProgress = tasks.filter(
    t => t.status === TASK_STATUS.IN_PROGRESS
  ).length;
  const todo = total - done - inProgress;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return {total, done, inProgress, todo, percent};
}

// Open issues across a project (each with its task for context).
export function getOpenIssuesForProject(projectId) {
  const taskIds = new Set(getAllTasksForProject(projectId).map(t => t.id));
  return db.issues.list(i => taskIds.has(i.taskId) && i.status === ISSUE_STATUS.OPEN);
}

// Tasks completed and awaiting foreman review (done; no new state introduced).
export function getTasksForReview(projectId) {
  return getAllTasksForProject(projectId).filter(
    t => t.status === TASK_STATUS.DONE
  );
}

// Most recent photos across a project (for the report's "recent photos").
export function getRecentPhotos(projectId, limit = 6) {
  const taskIds = new Set(getAllTasksForProject(projectId).map(t => t.id));
  return db.photos
    .list(p => taskIds.has(p.taskId))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, limit);
}
