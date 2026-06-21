import React from 'react';
import {useDbVersion} from '../lib/useDb.js';
import {
  getProject,
  getBuildings,
  getFloors,
  getRoomLabel,
  getMembershipsForProject,
  getUserName,
  getTask,
} from '../domain/queries.js';
import {
  getProjectProgress,
  getActiveRooms,
  getBlockedRooms,
  getOpenIssuesForProject,
  getTasksForReview,
} from '../domain/status.js';
import {ACCESS_LEVEL} from '../domain/constants.js';
import {Button, Card, PageTitle, SectionTitle} from '../components/ui.jsx';

// Feature 4: Foreman Daily Control View — run the whole site from one screen.
export default function ForemanControl({nav, params}) {
  useDbVersion();
  const project = getProject(params.projectId);
  if (!project) {
    return <Card className="p-6 text-center text-zinc-600">Project not found.</Card>;
  }

  const progress = getProjectProgress(project.id);
  const active = getActiveRooms(project.id);
  const blocked = getBlockedRooms(project.id);
  const openIssues = getOpenIssuesForProject(project.id);
  const review = getTasksForReview(project.id);
  const pending = getMembershipsForProject(project.id).filter(
    m => m.accessLevel === ACCESS_LEVEL.PENDING
  );

  // First floor (if any) for the plan-view shortcut.
  const firstBuilding = getBuildings(project.id)[0];
  const firstFloor = firstBuilding ? getFloors(firstBuilding.id)[0] : null;

  return (
    <div className="space-y-5">
      <PageTitle subtitle={project.name}>Site control</PageTitle>

      {/* Progress */}
      <Card className="p-4">
        <div className="flex items-end justify-between">
          <span className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">
            Project progress
          </span>
          <span className="text-2xl font-black text-steel">
            {progress.percent}%
          </span>
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full rounded-full bg-go transition-all"
            style={{width: `${progress.percent}%`}}
          />
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          {progress.done} done · {progress.inProgress} in progress ·{' '}
          {progress.todo} to do · {progress.total} total
        </p>
      </Card>

      {/* Quick nav */}
      <div className="flex flex-wrap gap-2">
        {firstFloor && (
          <Button onClick={() => nav.go('floor', {floorId: firstFloor.id})}>
            Floor plan
          </Button>
        )}
        <Button variant="secondary" onClick={() => nav.go('project', {projectId: project.id})}>
          Project structure
        </Button>
        <Button variant="secondary" onClick={() => nav.go('dashboard', {projectId: project.id})}>
          Dashboard
        </Button>
        <Button variant="secondary" onClick={() => nav.go('report', {projectId: project.id})}>
          Report
        </Button>
      </div>

      {/* Blocked rooms — most urgent first */}
      <section>
        <SectionTitle count={blocked.length}>Blocked rooms</SectionTitle>
        {blocked.length === 0 ? (
          <Card className="p-4 text-sm text-zinc-500">Nothing blocked. 👍</Card>
        ) : (
          <ul className="space-y-2">
            {blocked.map(({room}) => (
              <RoomRow key={room.id} room={room} nav={nav} accent="border-hazard" />
            ))}
          </ul>
        )}
      </section>

      {/* Open issues */}
      <section>
        <SectionTitle count={openIssues.length}>Open issues</SectionTitle>
        {openIssues.length === 0 ? (
          <Card className="p-4 text-sm text-zinc-500">No open issues.</Card>
        ) : (
          <ul className="space-y-2">
            {openIssues.map(i => {
              const task = getTask(i.taskId);
              return (
                <Card key={i.id} className="border-l-4 border-hazard p-3">
                  <p className="font-medium text-zinc-800">{i.description}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {task ? getRoomLabel(task.roomId) : ''} · responsible:{' '}
                    {i.responsibleUserId ? getUserName(i.responsibleUserId) : '(none)'}
                  </p>
                  {task && (
                    <div className="mt-2">
                      <Button
                        variant="secondary"
                        onClick={() => nav.go('task', {taskId: task.id})}>
                        Open task
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </ul>
        )}
      </section>

      {/* Active rooms */}
      <section>
        <SectionTitle count={active.length}>Active rooms</SectionTitle>
        {active.length === 0 ? (
          <Card className="p-4 text-sm text-zinc-500">No rooms in progress.</Card>
        ) : (
          <ul className="space-y-2">
            {active.map(({room}) => (
              <RoomRow key={room.id} room={room} nav={nav} accent="border-progress" />
            ))}
          </ul>
        )}
      </section>

      {/* Waiting for review (completed tasks) */}
      <section>
        <SectionTitle count={review.length}>Completed — for review</SectionTitle>
        {review.length === 0 ? (
          <Card className="p-4 text-sm text-zinc-500">
            Nothing completed yet.
          </Card>
        ) : (
          <ul className="space-y-2">
            {review.map(t => (
              <Card key={t.id} className="flex items-center justify-between gap-3 border-l-4 border-go p-3">
                <div>
                  <div className="font-semibold text-steel">{t.title}</div>
                  <div className="text-xs text-zinc-500">{getRoomLabel(t.roomId)}</div>
                </div>
                <Button variant="secondary" onClick={() => nav.go('task', {taskId: t.id})}>
                  Review
                </Button>
              </Card>
            ))}
          </ul>
        )}
      </section>

      {/* Pending worker requests */}
      <section>
        <SectionTitle count={pending.length}>Pending worker requests</SectionTitle>
        {pending.length === 0 ? (
          <Card className="p-4 text-sm text-zinc-500">No pending requests.</Card>
        ) : (
          <Card className="p-4">
            <p className="text-sm text-zinc-700">
              {pending.map(m => getUserName(m.userId)).join(', ')} waiting for
              access.
            </p>
            <div className="mt-2">
              <Button onClick={() => nav.go('requests', {projectId: project.id})}>
                Review requests
              </Button>
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}

function RoomRow({room, nav, accent}) {
  return (
    <Card className={`flex items-center justify-between gap-3 border-l-4 ${accent} p-3`}>
      <span className="font-medium text-steel">{getRoomLabel(room.id)}</span>
      <Button variant="secondary" onClick={() => nav.go('room', {roomId: room.id})}>
        Open room
      </Button>
    </Card>
  );
}
