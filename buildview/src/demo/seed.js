// -----------------------------------------------------------------------------
// Demo Mode / Seed Data (feature 1).
//
// loadDemoData() wipes the store and builds one realistic, ready-to-demo site
// so the full product can be shown without manual setup. It only uses the
// existing domain creators (which go through the storage seam), so it adds no
// new data shapes or storage access.
//
// Returns the demo foreman + a worker id so the caller can auto-log-in.
// -----------------------------------------------------------------------------
import {db} from '../data/db.js';
import {ROLES, TRADES, TASK_STATUS} from '../domain/constants.js';
import {
  createUser,
  createProject,
  createBuilding,
  createFloor,
  createRoom,
  createTask,
  setTaskStatus,
  setTaskAssignees,
  addPhoto,
  raiseIssue,
  requestMembership,
  grantMembership,
} from '../domain/entities.js';

// Real, clearly-licensed demo assets (served from buildview/public/demo-assets,
// credited in ASSETS_CREDITS.md). Stored as image URLs in imageData, which the
// screens render directly as <img src>.
const ASSET = {
  workers: '/demo-assets/site-photos/workers-on-site-mekis.jpg',
  site: '/demo-assets/site-photos/construction-site-ahsmann.jpg',
  defect: '/demo-assets/issue-photos/sample-defect.svg',
};

export function loadDemoData() {
  // Start clean so "load demo" is repeatable and predictable.
  db.reset();

  // People ------------------------------------------------------------------
  const foreman = createUser({
    name: 'Fran Foreman',
    role: ROLES.FOREMAN,
    trade: TRADES.NONE,
  });
  const eli = createUser({name: 'Eli Electrician', role: ROLES.WORKER, trade: TRADES.ELECTRICIAN});
  const pat = createUser({name: 'Pat Plumber', role: ROLES.WORKER, trade: TRADES.PLUMBER});
  const paula = createUser({name: 'Paula Painter', role: ROLES.WORKER, trade: TRADES.PAINTER});
  // A worker who has requested access but is still pending (for the foreman
  // control / pending-requests demo).
  const walt = createUser({name: 'Walt Worker', role: ROLES.WORKER, trade: TRADES.GENERAL});

  // Site structure ----------------------------------------------------------
  const project = createProject({
    name: 'BuildView Demo Site',
    address: '42 Riverside Ave',
    createdByUserId: foreman.id,
  });
  const tower = createBuilding({projectId: project.id, name: 'Tower A'});
  const floor = createFloor({buildingId: tower.id, name: 'Floor 3'});

  const kitchen = createRoom({floorId: floor.id, name: 'Kitchen'});
  const bathroom = createRoom({floorId: floor.id, name: 'Bathroom'});
  const living = createRoom({floorId: floor.id, name: 'Living Room'});
  const bedroom = createRoom({floorId: floor.id, name: 'Bedroom'});

  const mk = (roomId, title, instructions, trade) =>
    createTask({roomId, title, instructions, trade, createdByUserId: foreman.id});

  // Tasks across rooms + trades --------------------------------------------
  // Kitchen -> in progress
  const kWire = mk(kitchen.id, 'Wire kitchen sockets', 'Install 6 double sockets along the counter run.', TRADES.ELECTRICIAN);
  // Bathroom -> done (all tasks complete)
  const bPlumb = mk(bathroom.id, 'Install bathroom plumbing', 'Connect basin, WC and shower; pressure test.', TRADES.PLUMBER);
  const bPaint = mk(bathroom.id, 'Paint bathroom', 'Two coats, moisture-resistant white.', TRADES.PAINTER);
  // Living room -> todo
  const lLight = mk(living.id, 'Install living-room lighting', 'Fit 4 downlights and wall switch.', TRADES.ELECTRICIAN);
  const lPaint = mk(living.id, 'Paint living room', 'Prime then two coats, colour TBC.', TRADES.PAINTER);
  // Bedroom -> blocked (open issue)
  const bedRad = mk(bedroom.id, 'Fit bedroom radiator', 'Mount radiator and connect to feed.', TRADES.PLUMBER);

  // Assignments -------------------------------------------------------------
  setTaskAssignees(kWire.id, [eli.id]);
  setTaskAssignees(bPlumb.id, [pat.id]);
  setTaskAssignees(bPaint.id, [paula.id]);
  setTaskAssignees(lLight.id, [eli.id]);
  setTaskAssignees(lPaint.id, [paula.id]);
  setTaskAssignees(bedRad.id, [pat.id]);

  // Statuses: one in-progress, completed room, plus todos ------------------
  setTaskStatus(kWire.id, TASK_STATUS.IN_PROGRESS);
  setTaskStatus(bPlumb.id, TASK_STATUS.DONE);
  setTaskStatus(bPaint.id, TASK_STATUS.DONE);

  // Completion photos on the done work (for the report's recent photos).
  addPhoto({taskId: bPlumb.id, uploadedByUserId: pat.id, imageData: ASSET.site, caption: 'Basin connected'});
  addPhoto({taskId: bPaint.id, uploadedByUserId: paula.id, imageData: ASSET.workers, caption: 'Second coat done'});
  addPhoto({taskId: kWire.id, uploadedByUserId: eli.id, imageData: ASSET.site, caption: 'First-fix in progress'});

  // At least one open issue -> blocks the bedroom (with evidence photo).
  raiseIssue({
    taskId: bedRad.id,
    raisedByUserId: foreman.id,
    description: 'Radiator feed pipe is 15mm short — needs an extension before fitting.',
    imageData: ASSET.defect,
    responsibleUserId: pat.id,
  });

  // Access grants so the worker demo flow works immediately ----------------
  const grant = (userId, roomIds) => {
    requestMembership({userId, projectId: project.id});
    const m = db.memberships.list(x => x.userId === userId && x.projectId === project.id)[0];
    grantMembership(m.id, roomIds);
  };
  grant(eli.id, [kitchen.id, living.id]);
  grant(pat.id, [bathroom.id, bedroom.id]);
  grant(paula.id, [bathroom.id, living.id]);

  // Walt stays pending (no grant) to populate pending requests.
  requestMembership({userId: walt.id, projectId: project.id});

  return {foremanId: foreman.id, workerId: eli.id, projectId: project.id};
}
