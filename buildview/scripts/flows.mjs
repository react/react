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

// Re-import the modules with a fresh module registry but the SAME backing
// store, simulating a page reload (in-memory cache is rebuilt from storage).
async function loadModules() {
  const bust = '?t=' + Math.random();
  const db = (await import('../src/data/db.js' + bust)).db;
  const entities = await import('../src/domain/entities.js' + bust);
  const queries = await import('../src/domain/queries.js' + bust);
  const permissions = await import('../src/domain/permissions.js' + bust);
  const constants = await import('../src/domain/constants.js' + bust);
  return {db, ...entities, ...queries, ...permissions, ...constants};
}

function reload() {
  return loadModules();
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

  console.log(
    failures === 0
      ? '\nALL CHECKS PASSED'
      : `\n${failures} CHECK(S) FAILED`
  );
  process.exit(failures === 0 ? 0 : 1);
};

run();
