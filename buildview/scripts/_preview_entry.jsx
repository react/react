// Render the styled Task Detail inside a static replica of the app shell, so
// we can produce an openable HTML preview of the design. Bundled by preview.mjs.
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
import TaskDetail from '../src/screens/TaskDetail.jsx';
import {Button} from '../src/components/ui.jsx';

db.reset();

// A tiny 1x1 amber PNG so the photo grid shows a real image in the preview.
const swatch =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const foreman = createUser({name: 'Fran Foreman', role: ROLES.FOREMAN, trade: TRADES.NONE});
const project = createProject({name: 'Riverside', address: '1 River Rd', createdByUserId: foreman.id});
const b = createBuilding({projectId: project.id, name: 'Building A'});
const fl = createFloor({buildingId: b.id, name: 'Floor 3'});
const room = createRoom({floorId: fl.id, name: 'Apartment 12, kitchen'});
const task = createTask({
  roomId: room.id,
  title: 'Install gypsum partition',
  instructions: 'Install 12.5mm gypsum board partition along marked line. Tape and finish joints to level 4.',
  trade: TRADES.DRYWALL,
  createdByUserId: foreman.id,
});
const worker = createUser({name: 'Dan Drywall', role: ROLES.WORKER, trade: TRADES.DRYWALL});
requestMembership({userId: worker.id, projectId: project.id});
const mem = getMembershipsForProject(project.id).find(x => x.userId === worker.id);
grantMembership(mem.id, [room.id]);
setTaskAssignees(task.id, [worker.id]);
setTaskStatus(task.id, 'in_progress');
addPhoto({taskId: task.id, uploadedByUserId: worker.id, imageData: swatch, caption: 'Framing complete'});
addPhoto({taskId: task.id, uploadedByUserId: worker.id, imageData: swatch, caption: 'First board up'});
raiseIssue({taskId: task.id, raisedByUserId: foreman.id, description: 'Gap at ceiling track exceeds 10mm — needs shimming.', responsibleUserId: worker.id});

const nav = {user: foreman, go() {}, back() {}, reset() {}, logout() {}};

// Static replica of the App shell header so the screen shows in context.
const Shell = ({children}) => (
  <div className="min-h-screen bg-zinc-100">
    <header className="sticky top-0 z-10 border-b-4 border-brand bg-steel text-white">
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

globalThis.__PREVIEW_HTML = renderToString(
  <Shell>
    <TaskDetail nav={nav} params={{taskId: task.id}} />
  </Shell>
);
