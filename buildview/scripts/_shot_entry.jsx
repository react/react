// Per-screen SSR for screenshots: exposes globalThis.__SCREENS as an array of
// {slug, label, html}. Each entry is a full screen rendered with the real
// components, wrapped in the real app shell where appropriate.
// Bundled and screenshotted by shots.mjs. No product logic here.
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
import {Button, Card, Avatar} from '../src/components/ui.jsx';

db.reset();

const swatch =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

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

const pendingWorker = createUser({name: 'Pat Plumber', role: ROLES.WORKER, trade: TRADES.PLUMBER});
requestMembership({userId: pendingWorker.id, projectId: project.id});

const navFor = u => ({user: u, go() {}, back() {}, reset() {}, logout() {}});
const fNav = navFor(foreman);
const wNav = navFor(worker);

// Real app-shell chrome (mirrors App.jsx) so screens show in context.
const Shell = ({who, children}) => (
  <div className="min-h-screen bg-zinc-100">
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
            <span className="font-semibold">{who.name}</span>
            <br />
            <span className="text-zinc-300">
              {who.role}
              {who.role === ROLES.WORKER ? ` · ${who.trade}` : ''}
            </span>
          </span>
          <Avatar name={who.name} />
          <Button variant="ghost" className="text-white hover:bg-steel-light">
            Log out
          </Button>
        </div>
      </div>
    </header>
    <main className="mx-auto max-w-3xl px-4 py-5">{children}</main>
  </div>
);

// The real unknown-screen fallback markup (mirrors App.jsx Screen default).
const Fallback = (
  <Card className="p-6 text-center">
    <p className="text-zinc-600">Unknown screen: mystery</p>
    <div className="mt-3">
      <Button variant="secondary">Back to home</Button>
    </div>
  </Card>
);

const defs = [
  ['01-login', 'Login / user picker', <Login onLogin={() => {}} />, null],
  ['02-foreman-project-list', 'Foreman — Project list', <ForemanProjectList nav={fNav} />, foreman],
  ['03-foreman-project-view', 'Foreman — Project view', <ForemanProjectView nav={fNav} params={{projectId: project.id}} />, foreman],
  ['04-foreman-room-view', 'Foreman — Room view', <ForemanRoomView nav={fNav} params={{roomId: room.id}} />, foreman],
  ['05-pending-requests', 'Foreman — Pending requests', <ForemanPendingRequests nav={fNav} params={{projectId: project.id}} />, foreman],
  ['06-foreman-dashboard', 'Foreman — Dashboard', <ForemanDashboard nav={fNav} params={{projectId: project.id}} />, foreman],
  ['07-worker-home', 'Worker — Home / my tasks', <WorkerHome nav={wNav} />, worker],
  ['08-task-detail-worker', 'Task detail (worker)', <TaskDetail nav={wNav} params={{taskId: task.id}} />, worker],
  ['09-task-detail-foreman', 'Task detail (foreman)', <TaskDetail nav={fNav} params={{taskId: task.id}} />, foreman],
  ['10-unknown-fallback', 'Unknown-screen fallback', Fallback, foreman],
];

globalThis.__SCREENS = defs.map(([slug, label, el, who]) => ({
  slug,
  label,
  // Login renders its own full-page chrome; everything else uses the shell.
  html: renderToString(who ? <Shell who={who}>{el}</Shell> : el),
}));
