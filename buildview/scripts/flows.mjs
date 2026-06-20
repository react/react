// Headless end-to-end check of the BuildView flows (sections 4 & 8).
//
// Runs the REAL data-access seam and domain modules in Node by polyfilling
// localStorage, so we can prove each flow works and that data survives a
// "reload" (re-reading from the same persisted store) without a browser.
//
//   node scripts/flows.mjs
//
// This exercises logic only; the screens render the same domain calls.

// --- minimal localStorage polyfill (one backing map, survives "reload") ------
const makeLocalStorage = store => ({
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => {
    store[k] = String(v);
  },
  removeItem: k => {
    delete store[k];
  },
});

const backingStore = {};
globalThis.localStorage = makeLocalStorage(backingStore);

let failures = 0;
function check(label, cond) {
  if (cond) {
    console.log('  ok  -', label);
  } else {
    failures++;
    console.error('  FAIL-', label);
  }
}

// Import the real modules once. The domain modules import db.js internally,
// so they all share the single db instance (the storage seam) — exactly as the
// app does.
let modules;
async function loadModules() {
  const dbmod = await import('../src/data/db.js');
  const entities = await import('../src/domain/entities.js');
  const queries = await import('../src/domain/queries.js');
  const permissions = await import('../src/domain/permissions.js');
  const constants = await import('../src/domain/constants.js');
  modules = {
    db: dbmod.db,
    StorageError: dbmod.StorageError,
    ...entities,
    ...queries,
    ...permissions,
    ...constants,
  };
  return modules;
}

// Simulate a real page reload: drop the in-memory cache and rebuild it from
// the persisted store, then keep using the same module instances.
function reload() {
  modules.db.__reloadFromStorage();
  return modules;
}

const run = async () => {
  let m = await loadModules();
  m.db.reset();

  // ===========================================================================
  // FLOW A — foreman sets up a project
  // ===========================================================================
  console.log('\nFlow A: foreman setup');
  const foreman = m.createUser({
    name: 'Fran Foreman',
    role: m.ROLES.FOREMAN,
    trade: m.TRADES.NONE,
  });
  const project = m.createProject({
    name: 'Riverside',
    address: '1 River Rd',
    createdByUserId: foreman.id,
  });
  check('project has invite code', !!project.inviteCode);
  check(
    'foreman joined own project',
    m.getUser(foreman.id).joinedProjectIds.includes(project.id)
  );

  const building = m.createBuilding({projectId: project.id, name: 'Building A'});
  const floor = m.createFloor({buildingId: building.id, name: 'Floor 3'});
  const kitchen = m.createRoom({floorId: floor.id, name: 'Apt 12, kitchen'});
  const bath = m.createRoom({floorId: floor.id, name: 'Apt 12, bathroom'});

  const elecTask = m.createTask({
    roomId: kitchen.id,
    title: 'Wire kitchen sockets',
    instructions: 'Install 6 sockets',
    trade: m.TRADES.ELECTRICIAN,
    createdByUserId: foreman.id,
  });
  const plumbTask = m.createTask({
    roomId: bath.id,
    title: 'Install bath plumbing',
    instructions: 'Connect supply + drain',
    trade: m.TRADES.PLUMBER,
    createdByUserId: foreman.id,
  });
  check('task defaults to todo', elecTask.status === m.TASK_STATUS.TODO);
  check('task starts unassigned', elecTask.assignedWorkerIds.length === 0);

  // Reload and confirm the hierarchy survived.
  m = await reload();
  check(
    'project survives reload',
    !!m.getProject(project.id) &&
      m.getProject(project.id).name === 'Riverside'
  );
  check('buildings survive reload', m.getBuildings(project.id).length === 1);
  check(
    'rooms survive reload',
    m.getAllRoomsForProject(project.id).length === 2
  );
  check(
    'tasks survive reload',
    m.getAllTasksForProject(project.id).length === 2
  );

  // ===========================================================================
  // FLOW B — worker joins + access
  // ===========================================================================
  console.log('\nFlow B: worker join + access');
  const worker = m.createUser({
    name: 'Eli Electrician',
    role: m.ROLES.WORKER,
    trade: m.TRADES.ELECTRICIAN,
  });

  // An extra kitchen task of a DIFFERENT trade, to test the OR-assigned rule.
  const painterTask = m.createTask({
    roomId: kitchen.id,
    title: 'Paint kitchen ceiling',
    instructions: 'Two coats',
    trade: m.TRADES.PAINTER,
    createdByUserId: foreman.id,
  });

  m.requestMembership({userId: worker.id, projectId: project.id});

  // Before approval: pending => sees nothing.
  m = await reload();
  check(
    'pending worker sees no tasks',
    m.getVisibleTasksForWorker(m.getUser(worker.id), project.id).length === 0
  );

  // Foreman grants access to the kitchen room only.
  const membership = m
    .getMembershipsForProject(project.id)
    .find(x => x.userId === worker.id);
  m.grantMembership(membership.id, [kitchen.id]);

  // Assign the painter task to the electrician worker (trade mismatch but
  // assigned => must be visible).
  m.setTaskAssignees(painterTask.id, [worker.id]);

  m = await reload();
  const visible = m.getVisibleTasksForWorker(m.getUser(worker.id), project.id);
  const visibleIds = new Set(visible.map(t => t.id));
  check('granted worker sees trade-matched task', visibleIds.has(elecTask.id));
  check('granted worker sees assigned task', visibleIds.has(painterTask.id));
  check(
    'worker does NOT see task in non-granted room',
    !visibleIds.has(plumbTask.id)
  );
  check('worker visible count is exactly 2', visible.length === 2);

  // A second worker (painter) granted the same room sees only trade matches.
  const painter = m.createUser({
    name: 'Pat Painter',
    role: m.ROLES.WORKER,
    trade: m.TRADES.PAINTER,
  });
  m.requestMembership({userId: painter.id, projectId: project.id});
  const pMembership = m
    .getMembershipsForProject(project.id)
    .find(x => x.userId === painter.id);
  m.grantMembership(pMembership.id, [kitchen.id]);
  m = await reload();
  const painterVisible = m.getVisibleTasksForWorker(
    m.getUser(painter.id),
    project.id
  );
  check(
    'painter sees only their trade task (not electrician task)',
    painterVisible.length === 1 &&
      painterVisible[0].id === painterTask.id
  );

  // ===========================================================================
  // FLOW C — worker does a task
  // ===========================================================================
  console.log('\nFlow C: worker does a task');
  // Worker may edit status of an assigned task...
  const w = m.getUser(worker.id);
  check(
    'worker may edit status of assigned task',
    m.canEditTaskStatus(w, m.getTask(painterTask.id))
  );
  // ...but NOT a task they are only trade-matched to without assignment.
  check(
    'worker may NOT edit status of non-assigned task',
    !m.canEditTaskStatus(w, m.getTask(elecTask.id))
  );

  m.setTaskStatus(painterTask.id, m.TASK_STATUS.IN_PROGRESS);
  m.addPhoto({
    taskId: painterTask.id,
    uploadedByUserId: worker.id,
    imageData: 'data:image/png;base64,FAKE',
    caption: 'Ceiling done',
  });
  m.setTaskStatus(painterTask.id, m.TASK_STATUS.DONE);

  m = await reload();
  check(
    'status change persisted to done',
    m.getTask(painterTask.id).status === m.TASK_STATUS.DONE
  );
  check('photo persisted on task', m.getPhotos(painterTask.id).length === 1);
  check(
    'foreman can view the task + photo',
    m.canViewTask(m.getUser(foreman.id), m.getTask(painterTask.id)) &&
      m.getPhotos(painterTask.id)[0].caption === 'Ceiling done'
  );

  // ===========================================================================
  // FLOW D — issue handling
  // ===========================================================================
  console.log('\nFlow D: issues');
  // Permission shape: foreman any task; worker only assigned tasks.
  check(
    'foreman may raise issue on any task',
    m.canRaiseIssue(m.getUser(foreman.id), m.getTask(elecTask.id))
  );
  check(
    'worker may raise issue on assigned task',
    m.canRaiseIssue(m.getUser(worker.id), m.getTask(painterTask.id))
  );
  check(
    'worker may NOT raise issue on non-assigned task',
    !m.canRaiseIssue(m.getUser(worker.id), m.getTask(elecTask.id))
  );
  check('worker may NOT resolve issues', !m.canResolveIssue(m.getUser(worker.id)));
  check('foreman may resolve issues', m.canResolveIssue(m.getUser(foreman.id)));

  // Worker raises an issue on the task they completed.
  const issue = m.raiseIssue({
    taskId: painterTask.id,
    raisedByUserId: worker.id,
    description: 'Paint smudge near window',
    responsibleUserId: worker.id,
  });

  m = await reload();
  let dash = m.getDashboard(project.id);
  check('open issue shows in dashboard', dash.openIssueCount === 1);
  check(
    'task with open issue is flagged',
    dash.flaggedTasks.some(t => t.id === painterTask.id)
  );

  // Foreman resolves it.
  m.resolveIssue(issue.id);
  m = await reload();
  dash = m.getDashboard(project.id);
  check('resolved issue leaves open count', dash.openIssueCount === 0);
  check('no flagged tasks after resolve', dash.flaggedTasks.length === 0);
  check('resolved issue counted as resolved', dash.resolvedIssueCount === 1);

  // ===========================================================================
  // FLOW E — foreman dashboard numbers match the data
  // ===========================================================================
  console.log('\nFlow E: dashboard');
  dash = m.getDashboard(project.id);
  const allTasks = m.getAllTasksForProject(project.id);
  check('dashboard total matches task count', dash.totalTasks === allTasks.length);
  const sumByStatus =
    dash.byStatus[m.TASK_STATUS.TODO] +
    dash.byStatus[m.TASK_STATUS.IN_PROGRESS] +
    dash.byStatus[m.TASK_STATUS.DONE];
  check('status buckets sum to total', sumByStatus === dash.totalTasks);
  check(
    'done count matches data',
    dash.byStatus[m.TASK_STATUS.DONE] ===
      allTasks.filter(t => t.status === m.TASK_STATUS.DONE).length
  );
  check(
    'todo count matches data',
    dash.byStatus[m.TASK_STATUS.TODO] ===
      allTasks.filter(t => t.status === m.TASK_STATUS.TODO).length
  );

  // ===========================================================================
  // EDGE CASES — hardening
  // ===========================================================================
  console.log('\nEdge cases');

  // Wrong / unknown invite code finds nothing.
  check(
    'unknown invite code returns null',
    m.findProjectByInviteCode('BV-NOPE9') === null
  );
  // Invite code lookup is case/space-insensitive.
  check(
    'invite code lookup is case-insensitive',
    !!m.findProjectByInviteCode('  ' + project.inviteCode.toLowerCase() + '  ')
  );

  // A second project gets a different invite code.
  const project2 = m.createProject({
    name: 'Second',
    address: '',
    createdByUserId: foreman.id,
  });
  check(
    'invite codes are unique across projects',
    project2.inviteCode !== project.inviteCode
  );

  // Duplicate join request does not create a second membership.
  const before = m.getMembershipsForProject(project.id).length;
  m.requestMembership({userId: worker.id, projectId: project.id});
  check(
    'duplicate join request is a no-op',
    m.getMembershipsForProject(project.id).length === before
  );

  // Granting with NO rooms => worker sees nothing even though "granted".
  const lonelyWorker = m.createUser({
    name: 'No Rooms',
    role: m.ROLES.WORKER,
    trade: m.TRADES.ELECTRICIAN,
  });
  m.requestMembership({userId: lonelyWorker.id, projectId: project.id});
  const lonelyM = m
    .getMembershipsForProject(project.id)
    .find(x => x.userId === lonelyWorker.id);
  m.grantMembership(lonelyM.id, []); // granted, but no visible rooms
  m = await reload();
  check(
    'granted-but-no-rooms worker sees nothing',
    m.getVisibleTasksForWorker(m.getUser(lonelyWorker.id), project.id).length === 0
  );

  // Editing visible rooms to remove a room hides its tasks again.
  const wMembership = m
    .getMembershipsForProject(project.id)
    .find(x => x.userId === worker.id);
  m.setVisibleRooms(wMembership.id, []); // revoke kitchen
  m = await reload();
  check(
    'removing visible room hides its tasks',
    m.getVisibleTasksForWorker(m.getUser(worker.id), project.id).length === 0
  );
  // And a worker can no longer edit a task that left their visible rooms.
  check(
    'worker cannot edit task after room revoked',
    !m.canEditTaskStatus(m.getUser(worker.id), m.getTask(painterTask.id))
  );

  // Cross-project isolation: foreman of project2 cannot view a task in project.
  const foreman2 = m.createUser({
    name: 'Other Foreman',
    role: m.ROLES.FOREMAN,
    trade: m.TRADES.NONE,
  });
  check(
    'foreman cannot view task in a project they do not own',
    !m.canViewTask(m.getUser(foreman2.id), m.getTask(elecTask.id))
  );

  // Storage write failure rolls back the cache and throws StorageError.
  const taskCountBefore = m.getAllTasksForProject(project.id).length;
  const originalSetItem = globalThis.localStorage.setItem;
  globalThis.localStorage.setItem = () => {
    throw new Error('QuotaExceededError (simulated)');
  };
  let threw = false;
  try {
    m.createTask({
      roomId: kitchen.id,
      title: 'Should fail',
      instructions: '',
      trade: m.TRADES.GENERAL,
      createdByUserId: foreman.id,
    });
  } catch (err) {
    threw = err instanceof m.StorageError;
  }
  globalThis.localStorage.setItem = originalSetItem;
  check('failed write throws StorageError', threw);
  check(
    'failed write does not leave a phantom record in cache',
    m.getAllTasksForProject(project.id).length === taskCountBefore
  );
  m = await reload();
  check(
    'failed write persisted nothing',
    m.getAllTasksForProject(project.id).length === taskCountBefore
  );

  console.log(
    failures === 0
      ? '\nALL CHECKS PASSED'
      : `\n${failures} CHECK(S) FAILED`
  );
  process.exit(failures === 0 ? 0 : 1);
};

run();
