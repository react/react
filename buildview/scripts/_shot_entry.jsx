// Per-screen SSR for screenshots: exposes globalThis.__SCREENS as an array of
// {slug, label, html}, each rendered with the real components on the real demo
// data, wrapped in the real app shell where appropriate. No product logic here.
import React from 'react';
import {renderToString} from 'react-dom/server';

import {db} from '../src/data/db.js';
import {ROLES} from '../src/domain/constants.js';
import {loadDemoData} from '../src/demo/seed.js';
import {
  getProject,
  getBuildings,
  getFloors,
  getAllRoomsForProject,
  getTasks,
} from '../src/domain/queries.js';

import Login from '../src/screens/Login.jsx';
import ForemanProjectList from '../src/screens/ForemanProjectList.jsx';
import ForemanProjectView from '../src/screens/ForemanProjectView.jsx';
import FloorPlan from '../src/screens/FloorPlan.jsx';
import ForemanRoomView from '../src/screens/ForemanRoomView.jsx';
import ForemanPendingRequests from '../src/screens/ForemanPendingRequests.jsx';
import ForemanControl from '../src/screens/ForemanControl.jsx';
import ForemanDashboard from '../src/screens/ForemanDashboard.jsx';
import ProjectReport from '../src/screens/ProjectReport.jsx';
import WorkerHome from '../src/screens/WorkerHome.jsx';
import TaskDetail from '../src/screens/TaskDetail.jsx';
import {Button, Avatar} from '../src/components/ui.jsx';

const {foremanId, projectId} = loadDemoData();
const foreman = db.users.get(foremanId);
const eli = db.users.list(u => u.name === 'Eli Electrician')[0];
const project = getProject(projectId);
const floor = getFloors(getBuildings(projectId)[0].id)[0];
const kitchen = getAllRoomsForProject(projectId).find(r => r.name === 'Kitchen');
const kitchenTask = getTasks(kitchen.id)[0];

const navFor = u => ({user: u, go() {}, back() {}, reset() {}, logout() {}});
const fNav = navFor(foreman);
const wNav = navFor(eli);

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

const defs = [
  ['01-login', 'Login + demo loader', <Login onLogin={() => {}} />, null],
  ['02-foreman-project-list', 'Foreman — Project list', <ForemanProjectList nav={fNav} />, foreman],
  ['03-foreman-control', 'Foreman — Site control', <ForemanControl nav={fNav} params={{projectId}} />, foreman],
  ['04-floor-plan', 'Plan-first floor view', <FloorPlan nav={fNav} params={{floorId: floor.id}} />, foreman],
  ['05-project-view', 'Foreman — Structure', <ForemanProjectView nav={fNav} params={{projectId}} />, foreman],
  ['06-room-view', 'Foreman — Room view', <ForemanRoomView nav={fNav} params={{roomId: kitchen.id}} />, foreman],
  ['07-pending-requests', 'Foreman — Requests', <ForemanPendingRequests nav={fNav} params={{projectId}} />, foreman],
  ['08-dashboard', 'Foreman — Dashboard', <ForemanDashboard nav={fNav} params={{projectId}} />, foreman],
  ['09-report', 'Project report / investor view', <ProjectReport nav={fNav} params={{projectId}} />, foreman],
  ['10-worker-jobcard', 'Worker — Job card', <WorkerHome nav={wNav} />, eli],
  ['11-task-detail-worker', 'Task detail (worker)', <TaskDetail nav={wNav} params={{taskId: kitchenTask.id}} />, eli],
  ['12-task-detail-foreman', 'Task detail (foreman)', <TaskDetail nav={fNav} params={{taskId: kitchenTask.id}} />, foreman],
];

globalThis.__SCREENS = defs.map(([slug, label, el, who]) => ({
  slug,
  label,
  html: renderToString(who ? <Shell who={who}>{el}</Shell> : el),
}));
