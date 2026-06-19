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

  console.log(
    failures === 0
      ? '\nALL CHECKS PASSED'
      : `\n${failures} CHECK(S) FAILED`
  );
  process.exit(failures === 0 ? 0 : 1);
};

run();
