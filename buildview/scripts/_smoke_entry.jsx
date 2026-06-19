// Render smoke test entry: mount every screen with seeded data to confirm no
// component crashes at render. Bundled + run by scripts/render-smoke.mjs.
import React from 'react';
import {renderToString} from 'react-dom/server';

import {db} from '../src/data/db.js';
import {ROLES, TRADES} from '../src/domain/constants.js';
import {
  createUser,
  createProject,
  createBuilding,
  createFloor,
  createRoom,
  createTask,
  requestMembership,
  grantMembership,
  setTaskAssignees,
  raiseIssue,
} from '../src/domain/entities.js';
import {getMembershipsForProject} from '../src/domain/queries.js';

import Login from '../src/screens/Login.jsx';
import ForemanProjectList from '../src/screens/ForemanProjectList.jsx';
import ForemanProjectView from '../src/screens/ForemanProjectView.jsx';
import ForemanRoomView from '../src/screens/ForemanRoomView.jsx';
import ForemanPendingRequests from '../src/screens/ForemanPendingRequests.jsx';
import ForemanDashboard from '../src/screens/ForemanDashboard.jsx';
import WorkerHome from '../src/screens/WorkerHome.jsx';
import TaskDetail from '../src/screens/TaskDetail.jsx';

db.reset();

// Seed a realistic graph.
const foreman = createUser({name: 'Fran', role: ROLES.FOREMAN, trade: TRADES.NONE});
const project = createProject({name: 'Riverside', address: 'x', createdByUserId: foreman.id});
const b = createBuilding({projectId: project.id, name: 'A'});
const fl = createFloor({buildingId: b.id, name: 'F1'});
const room = createRoom({floorId: fl.id, name: 'Kitchen'});
const task = createTask({roomId: room.id, title: 'Wire', instructions: 'do it', trade: TRADES.ELECTRICIAN, createdByUserId: foreman.id});
const worker = createUser({name: 'Eli', role: ROLES.WORKER, trade: TRADES.ELECTRICIAN});
requestMembership({userId: worker.id, projectId: project.id});
const mem = getMembershipsForProject(project.id).find(x => x.userId === worker.id);
grantMembership(mem.id, [room.id]);
setTaskAssignees(task.id, [worker.id]);
raiseIssue({taskId: task.id, raisedByUserId: foreman.id, description: 'oops', responsibleUserId: worker.id});

const navFor = user => ({
  user,
  go() {},
  back() {},
  reset() {},
  logout() {},
});
const fNav = navFor(foreman);
const wNav = navFor(worker);

const cases = [
  ['Login', <Login onLogin={() => {}} />],
  ['ForemanProjectList', <ForemanProjectList nav={fNav} />],
  ['ForemanProjectView', <ForemanProjectView nav={fNav} params={{projectId: project.id}} />],
  ['ForemanRoomView', <ForemanRoomView nav={fNav} params={{roomId: room.id}} />],
  ['ForemanPendingRequests', <ForemanPendingRequests nav={fNav} params={{projectId: project.id}} />],
  ['ForemanDashboard', <ForemanDashboard nav={fNav} params={{projectId: project.id}} />],
  ['WorkerHome', <WorkerHome nav={wNav} />],
  ['TaskDetail(worker)', <TaskDetail nav={wNav} params={{taskId: task.id}} />],
  ['TaskDetail(foreman)', <TaskDetail nav={fNav} params={{taskId: task.id}} />],
];

let failures = 0;
for (const [name, el] of cases) {
  try {
    const html = renderToString(el);
    if (typeof html === 'string' && html.length > 0) {
      console.log('  ok  - renders', name);
    } else {
      failures++;
      console.error('  FAIL- empty render', name);
    }
  } catch (err) {
    failures++;
    console.error('  FAIL- render threw', name, '-', err.message);
  }
}

// Permission render check: worker viewing a task they can't access.
try {
  const otherTask = createTask({roomId: room.id, title: 'Plumb', instructions: '', trade: TRADES.PLUMBER, createdByUserId: foreman.id});
  const html = renderToString(<TaskDetail nav={wNav} params={{taskId: otherTask.id}} />);
  if (html.includes('do not have access')) {
    console.log('  ok  - worker blocked from inaccessible task in UI');
  } else {
    failures++;
    console.error('  FAIL- worker not blocked from inaccessible task');
  }
} catch (err) {
  failures++;
  console.error('  FAIL- access-guard render threw -', err.message);
}

console.log(failures === 0 ? '\nRENDER SMOKE PASSED' : `\n${failures} RENDER FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
