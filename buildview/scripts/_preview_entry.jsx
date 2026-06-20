// Render a gallery of the styled screens into one HTML doc, so we can preview
// the whole design rollout. Bundled by preview.mjs.
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
  setTaskStatus,
  addPhoto,
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
import {Button} from '../src/components/ui.jsx';

db.reset();

const swatch =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

// Seed a realistic project.
const foreman = createUser({name: 'Fran Foreman', role: ROLES.FOREMAN, trade: TRADES.NONE});
const project = createProject({name: 'Riverside Tower', address: '1 River Rd', createdByUserId: foreman.id});
const b = createBuilding({projectId: project.id, name: 'Building A'});
const fl = createFloor({buildingId: b.id, name: 'Floor 3'});
const room = createRoom({floorId: fl.id, name: 'Apartment 12, kitchen'});
createRoom({floorId: fl.id, name: 'Apartment 12, bathroom'});
const task = createTask({
  roomId: room.id,
  title: 'Install gypsum partition',
  instructions: 'Install 12.5mm gypsum board partition along marked line. Tape and finish joints to level 4.',
  trade: TRADES.DRYWALL,
  createdByUserId: foreman.id,
});
createTask({roomId: room.id, title: 'Wire kitchen sockets', instructions: 'Six double sockets', trade: TRADES.ELECTRICIAN, createdByUserId: foreman.id});

const worker = createUser({name: 'Dan Drywall', role: ROLES.WORKER, trade: TRADES.DRYWALL});
requestMembership({userId: worker.id, projectId: project.id});
const mem = getMembershipsForProject(project.id).find(x => x.userId === worker.id);
grantMembership(mem.id, [room.id]);
setTaskAssignees(task.id, [worker.id]);
setTaskStatus(task.id, 'in_progress');
addPhoto({taskId: task.id, uploadedByUserId: worker.id, imageData: swatch, caption: 'Framing complete'});
raiseIssue({taskId: task.id, raisedByUserId: foreman.id, description: 'Gap at ceiling track exceeds 10mm — needs shimming.', responsibleUserId: worker.id});

// A second worker awaiting approval, to populate the requests screen.
const pendingWorker = createUser({name: 'Pat Plumber', role: ROLES.WORKER, trade: TRADES.PLUMBER});
requestMembership({userId: pendingWorker.id, projectId: project.id});

const fNav = {user: foreman, go() {}, back() {}, reset() {}, logout() {}};
const wNav = {user: worker, go() {}, back() {}, reset() {}, logout() {}};

const Shell = ({children}) => (
  <div className="bg-zinc-100">
    <header className="border-b-4 border-brand bg-steel text-white">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="text-white hover:bg-steel-light">
            ← Back
          </Button>
          <span className="text-lg font-black tracking-tight">
            BUILD<span className="text-brand">VIEW</span>
          </span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-right text-sm leading-tight sm:block">
            <span className="font-semibold">Fran Foreman</span>
            <br />
            <span className="text-zinc-300">foreman</span>
          </span>
          <Button variant="ghost" className="text-white hover:bg-steel-light">
            Log out
          </Button>
        </div>
      </div>
    </header>
    <main className="mx-auto max-w-3xl px-4 py-5">{children}</main>
  </div>
);

const screens = [
  ['1 · Login', <Login onLogin={() => {}} />, true],
  ['2 · Foreman — Project list', <ForemanProjectList nav={fNav} />],
  ['3 · Foreman — Project view', <ForemanProjectView nav={fNav} params={{projectId: project.id}} />],
  ['4 · Foreman — Room view', <ForemanRoomView nav={fNav} params={{roomId: room.id}} />],
  ['5 · Foreman — Pending requests', <ForemanPendingRequests nav={fNav} params={{projectId: project.id}} />],
  ['6 · Foreman — Dashboard', <ForemanDashboard nav={fNav} params={{projectId: project.id}} />],
  ['7+8 · Worker — Home / My work', <WorkerHome nav={wNav} />],
  ['9+10 · Task detail (shared)', <TaskDetail nav={fNav} params={{taskId: task.id}} />],
];

globalThis.__PREVIEW_HTML = screens
  .map(([label, el, fullPage]) => {
    const inner = fullPage ? el : <Shell>{el}</Shell>;
    return (
      `<div style="margin:0 0 32px"><div style="background:#0f172a;color:#fff;font:600 13px system-ui;padding:8px 14px">${label}</div>` +
      renderToString(inner) +
      `</div>`
    );
  })
  .join('');
