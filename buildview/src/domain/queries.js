// -----------------------------------------------------------------------------
// Read selectors: hierarchy navigation + dashboard aggregates.
// All reads go through the `db` seam.
// -----------------------------------------------------------------------------
import {db} from '../data/db.js';
import {TASK_STATUS, ISSUE_STATUS} from './constants.js';

// ---- hierarchy: project > building > floor > room > task ----------------------
export function getProject(projectId) {
  return db.projects.get(projectId);
}

export function getBuildings(projectId) {
  return db.buildings.list(b => b.projectId === projectId);
}

export function getFloors(buildingId) {
  return db.floors.list(f => f.buildingId === buildingId);
}

export function getRooms(floorId) {
  return db.rooms.list(r => r.floorId === floorId);
}

export function getTasks(roomId) {
  return db.tasks.list(t => t.roomId === roomId);
}

export function getRoom(roomId) {
  return db.rooms.get(roomId);
}

export function getTask(taskId) {
  return db.tasks.get(taskId);
}

// ---- task children -----------------------------------------------------------
export function getPhotos(taskId) {
  return db.photos.list(p => p.taskId === taskId);
}

export function getIssues(taskId) {
  return db.issues.list(i => i.taskId === taskId);
}

// ---- upward resolution: which project does a task/room belong to? -------------
// Walks the strict hierarchy room -> floor -> building -> project.
export function getProjectIdForRoom(roomId) {
  const room = db.rooms.get(roomId);
  if (!room) return null;
  const floor = db.floors.get(room.floorId);
  if (!floor) return null;
  const building = db.buildings.get(floor.buildingId);
  if (!building) return null;
  return building.projectId;
}

export function getProjectIdForTask(taskId) {
  const task = db.tasks.get(taskId);
  if (!task) return null;
  return getProjectIdForRoom(task.roomId);
}

// All rooms that belong to a project (flattened across its hierarchy).
export function getAllRoomsForProject(projectId) {
  const buildingIds = new Set(getBuildings(projectId).map(b => b.id));
  const floorIds = new Set(
    db.floors.list(f => buildingIds.has(f.buildingId)).map(f => f.id)
  );
  return db.rooms.list(r => floorIds.has(r.floorId));
}

// All tasks that belong to a project (flattened).
export function getAllTasksForProject(projectId) {
  const roomIds = new Set(getAllRoomsForProject(projectId).map(r => r.id));
  return db.tasks.list(t => roomIds.has(t.roomId));
}

// ---- lookups -----------------------------------------------------------------
export function getProjectsForForeman(userId) {
  return db.projects.list(p => p.createdByUserId === userId);
}

export function findProjectByInviteCode(code) {
  const norm = (code || '').trim().toUpperCase();
  return db.projects.list(p => p.inviteCode.toUpperCase() === norm)[0] || null;
}

export function getUser(userId) {
  return db.users.get(userId);
}

export function getUserName(userId) {
  const u = db.users.get(userId);
  return u ? u.name : '(unknown)';
}

// Readable path label for a room: "Building A / Floor 3 / Apt 12, kitchen".
export function getRoomLabel(roomId) {
  const room = db.rooms.get(roomId);
  if (!room) return '(unknown room)';
  const floor = db.floors.get(room.floorId);
  const building = floor ? db.buildings.get(floor.buildingId) : null;
  return [building && building.name, floor && floor.name, room.name]
    .filter(Boolean)
    .join(' / ');
}

// All memberships for a project (any access level).
export function getMembershipsForProject(projectId) {
  return db.memberships.list(m => m.projectId === projectId);
}

// ---- dashboard aggregates (Flow E) -------------------------------------------
// Numbers are derived straight from the data so they always match.
export function getDashboard(projectId) {
  const tasks = getAllTasksForProject(projectId);
  const taskIds = new Set(tasks.map(t => t.id));

  const byStatus = {
    [TASK_STATUS.TODO]: 0,
    [TASK_STATUS.IN_PROGRESS]: 0,
    [TASK_STATUS.DONE]: 0,
  };
  for (const t of tasks) {
    if (byStatus[t.status] !== undefined) byStatus[t.status] += 1;
  }

  const projectIssues = db.issues.list(i => taskIds.has(i.taskId));
  const openIssues = projectIssues.filter(i => i.status === ISSUE_STATUS.OPEN);

  // "Flagged" tasks = tasks that currently have at least one open issue.
  const flaggedTaskIds = new Set(openIssues.map(i => i.taskId));
  const flaggedTasks = tasks.filter(t => flaggedTaskIds.has(t.id));

  return {
    totalTasks: tasks.length,
    byStatus,
    openIssueCount: openIssues.length,
    resolvedIssueCount: projectIssues.length - openIssues.length,
    flaggedTasks,
  };
}
