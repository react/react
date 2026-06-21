import React, {useState} from 'react';
import {useDbVersion} from '../lib/useDb.js';
import {db} from '../data/db.js';
import {requestMembership, setTaskStatus} from '../domain/entities.js';
import {findProjectByInviteCode, getProject, getRoomLabel} from '../domain/queries.js';
import {
  getAllVisibleTasksForWorker,
  canEditTaskStatus,
} from '../domain/permissions.js';
import {
  ACCESS_LEVEL,
  TASK_STATUS,
} from '../domain/constants.js';
import {
  Button,
  Card,
  PageTitle,
  SectionTitle,
  StatusBadge,
  Field,
  TextInput,
} from '../components/ui.jsx';

// Features 3: Worker Mobile Task Mode — a field-worker "job card", not a
// dashboard. Shows the next assigned task with big actions, then the rest of
// the worker's accessible tasks. Permission rules are unchanged (we read the
// same getAllVisibleTasksForWorker + canEditTaskStatus helpers).
export default function WorkerHome({nav}) {
  useDbVersion();
  const user = nav.user;

  const memberships = db.memberships.list(m => m.userId === user.id);
  const pending = memberships.filter(m => m.accessLevel === ACCESS_LEVEL.PENDING);
  const hasGranted = memberships.some(
    m => m.accessLevel === ACCESS_LEVEL.GRANTED
  );

  // Visible tasks across all granted projects (the section-3 rule).
  const visible = getAllVisibleTasksForWorker(user);

  // "Next" = an assigned, not-done task — in-progress first, then to-do.
  const assignedOpen = visible
    .filter(
      t =>
        t.assignedWorkerIds.includes(user.id) &&
        t.status !== TASK_STATUS.DONE
    )
    .sort((a, b) => statusRank(a.status) - statusRank(b.status));
  const next = assignedOpen[0] || null;
  const remaining = visible.filter(t => !next || t.id !== next.id);

  return (
    <div className="space-y-5">
      <PageTitle subtitle={`${user.trade} · ${user.name}`}>My work</PageTitle>

      {pending.map(m => {
        const p = getProject(m.projectId);
        return (
          <Card key={m.id} className="border-l-4 border-brand p-4">
            <p className="text-sm font-medium text-zinc-700">
              Request to join <strong>{p ? p.name : 'project'}</strong> is
              pending approval — no tasks visible yet.
            </p>
          </Card>
        );
      })}

      {hasGranted && (
        <section>
          <SectionTitle>Next task</SectionTitle>
          {next ? (
            <JobCard task={next} user={user} nav={nav} />
          ) : (
            <Card className="p-6 text-center">
              <p className="text-lg font-bold text-go">All caught up 🎉</p>
              <p className="mt-1 text-sm text-zinc-500">
                No assigned tasks left to do.
              </p>
            </Card>
          )}
        </section>
      )}

      {remaining.length > 0 && (
        <section>
          <SectionTitle count={remaining.length}>Other tasks</SectionTitle>
          <ul className="space-y-2">
            {remaining.map(t => (
              <Card key={t.id} className="flex items-center justify-between gap-3 p-3">
                <div>
                  <div className="font-semibold text-steel">{t.title}</div>
                  <div className="text-xs text-zinc-500">
                    {getRoomLabel(t.roomId)} · {t.trade}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={t.status} />
                  <Button
                    variant="secondary"
                    onClick={() => nav.go('task', {taskId: t.id})}>
                    Open
                  </Button>
                </div>
              </Card>
            ))}
          </ul>
        </section>
      )}

      <section>
        <SectionTitle>Join a project</SectionTitle>
        <Card className="p-4">
          <JoinForm userId={user.id} />
        </Card>
      </section>
    </div>
  );
}

function statusRank(status) {
  // in-progress before to-do (done is filtered out before this is used).
  return status === TASK_STATUS.IN_PROGRESS ? 0 : 1;
}

// The big job card: room, trade, instruction, and the four field actions.
function JobCard({task, user, nav}) {
  const mayAct = canEditTaskStatus(user, task);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-3 bg-steel p-4 text-white">
        <div>
          <h2 className="text-xl font-black tracking-tight">{task.title}</h2>
          <p className="mt-1 text-sm text-zinc-300">{getRoomLabel(task.roomId)}</p>
        </div>
        <StatusBadge status={task.status} />
      </div>
      <div className="space-y-4 p-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded bg-zinc-200 px-2 py-1 font-bold uppercase tracking-wide text-zinc-700">
            {task.trade}
          </span>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Instruction
          </div>
          <p className="mt-1 text-zinc-800">
            {task.instructions || '(no instructions)'}
          </p>
        </div>

        {mayAct ? (
          <div className="grid grid-cols-2 gap-2">
            <Button
              disabled={task.status !== TASK_STATUS.TODO}
              onClick={() => setTaskStatus(task.id, TASK_STATUS.IN_PROGRESS)}>
              Start task
            </Button>
            <Button
              variant="secondary"
              onClick={() => nav.go('task', {taskId: task.id, focus: 'photo'})}>
              Upload photo
            </Button>
            <Button
              variant="danger"
              onClick={() => nav.go('task', {taskId: task.id, focus: 'issue'})}>
              Report issue
            </Button>
            <Button
              disabled={task.status === TASK_STATUS.DONE}
              onClick={() => setTaskStatus(task.id, TASK_STATUS.DONE)}>
              Mark done
            </Button>
          </div>
        ) : (
          <p className="text-sm italic text-zinc-500">
            You can&apos;t change this task.
          </p>
        )}

        <Button
          variant="ghost"
          className="w-full"
          onClick={() => nav.go('task', {taskId: task.id})}>
          Open full task detail →
        </Button>
      </div>
    </Card>
  );
}

function JoinForm({userId}) {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');

  function submit(e) {
    e.preventDefault();
    const project = findProjectByInviteCode(code);
    if (!project) {
      setMessage('No project found for that invite code.');
      return;
    }
    requestMembership({userId, projectId: project.id});
    setMessage(`Request sent for "${project.name}". Waiting for approval.`);
    setCode('');
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Invite code">
        <TextInput
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="e.g. BV-3F9K2"
        />
      </Field>
      <Button type="submit">Request to join</Button>
      {message && <p className="text-sm font-medium text-steel">{message}</p>}
    </form>
  );
}
