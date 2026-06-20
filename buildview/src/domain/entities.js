// -----------------------------------------------------------------------------
// Entity creators + domain operations.
//
// These build records with the EXACT shape from section 2 (id and createdAt are
// added by the data module). Screens call these instead of db.create directly,
// so every record is well-formed and defaults are consistent.
//
// Everything here goes through the `db` seam — no storage access.
// -----------------------------------------------------------------------------
import {db} from '../data/db.js';
import {TASK_STATUS, ISSUE_STATUS, ACCESS_LEVEL} from './constants.js';

// Short, human-readable invite code (e.g. "BV-3F9K2").
export function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no easily-confused chars
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return 'BV-' + code;
}

// Generate an invite code guaranteed not to collide with an existing project.
function generateUniqueInviteCode() {
  const taken = new Set(
    db.projects.list().map(p => p.inviteCode.toUpperCase())
  );
  let code = generateInviteCode();
  // With ~33M combinations a collision is astronomically unlikely, but the
  // join flow keys on this code, so we make absolutely sure it's unique.
  while (taken.has(code.toUpperCase())) code = generateInviteCode();
  return code;
}

// ---- User --------------------------------------------------------------------
export function createUser({name, role, trade}) {
  return db.users.create({
    name,
    role,
    trade,
    joinedProjectIds: [],
  });
}

// ---- Project -----------------------------------------------------------------
export function createProject({name, address, createdByUserId}) {
  const project = db.projects.create({
    name,
    address: address || '',
    inviteCode: generateUniqueInviteCode(),
    createdByUserId,
  });
  // The foreman belongs to the project they created.
  addProjectToUser(createdByUserId, project.id);
  return project;
}

// ---- Building ----------------------------------------------------------------
export function createBuilding({projectId, name}) {
  return db.buildings.create({projectId, name});
}

// ---- Floor -------------------------------------------------------------------
export function createFloor({buildingId, name}) {
  return db.floors.create({buildingId, name});
}

// ---- Room --------------------------------------------------------------------
export function createRoom({floorId, name}) {
  return db.rooms.create({floorId, name});
}

// ---- Task --------------------------------------------------------------------
export function createTask({roomId, title, instructions, trade, createdByUserId}) {
  return db.tasks.create({
    roomId,
    title,
    instructions: instructions || '',
    trade,
    status: TASK_STATUS.TODO,
    assignedWorkerIds: [],
    createdByUserId,
  });
}

export function setTaskStatus(taskId, status) {
  return db.tasks.update(taskId, {status});
}

export function setTaskAssignees(taskId, assignedWorkerIds) {
  return db.tasks.update(taskId, {assignedWorkerIds: [...assignedWorkerIds]});
}

// ---- Photo -------------------------------------------------------------------
export function addPhoto({taskId, uploadedByUserId, imageData, caption}) {
  return db.photos.create({
    taskId,
    uploadedByUserId,
    imageData,
    caption: caption || '',
  });
}

// ---- Issue -------------------------------------------------------------------
export function raiseIssue({
  taskId,
  raisedByUserId,
  description,
  imageData,
  responsibleUserId,
}) {
  return db.issues.create({
    taskId,
    raisedByUserId,
    description,
    imageData: imageData || null,
    responsibleUserId: responsibleUserId || null,
    status: ISSUE_STATUS.OPEN,
  });
}

export function resolveIssue(issueId) {
  return db.issues.update(issueId, {status: ISSUE_STATUS.RESOLVED});
}

// ---- Membership / AccessGrant ------------------------------------------------
// A worker requesting to join creates a PENDING membership.
export function requestMembership({userId, projectId}) {
  // Avoid duplicate requests for the same project.
  const existing = db.memberships.list(
    m => m.userId === userId && m.projectId === projectId
  )[0];
  if (existing) return existing;

  return db.memberships.create({
    userId,
    projectId,
    accessLevel: ACCESS_LEVEL.PENDING,
    visibleRoomIds: [],
  });
}

// Foreman grants access and picks visible rooms.
export function grantMembership(membershipId, visibleRoomIds = []) {
  const membership = db.memberships.update(membershipId, {
    accessLevel: ACCESS_LEVEL.GRANTED,
    visibleRoomIds: [...visibleRoomIds],
  });
  if (membership) addProjectToUser(membership.userId, membership.projectId);
  return membership;
}

export function setVisibleRooms(membershipId, visibleRoomIds) {
  return db.memberships.update(membershipId, {
    visibleRoomIds: [...visibleRoomIds],
  });
}

// ---- internal ----------------------------------------------------------------
function addProjectToUser(userId, projectId) {
  const user = db.users.get(userId);
  if (!user) return;
  if (user.joinedProjectIds.includes(projectId)) return;
  db.users.update(userId, {
    joinedProjectIds: [...user.joinedProjectIds, projectId],
  });
}
