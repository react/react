import React, {useState} from 'react';
import {useDbVersion} from '../lib/useDb.js';
import {db} from '../data/db.js';
import {
  createTask,
  setTaskStatus,
  setTaskAssignees,
} from '../domain/entities.js';
import {
  getRoom,
  getTasks,
  getProjectIdForRoom,
  getUserName,
} from '../domain/queries.js';
import {
  WORKER_TRADES,
  TASK_STATUS_LIST,
  TASK_STATUS_LABEL,
  ACCESS_LEVEL,
} from '../domain/constants.js';
import {
  Button,
  Card,
  PageTitle,
  SectionTitle,
  StatusBadge,
  Field,
  TextInput,
  TextArea,
  Select,
} from '../components/ui.jsx';

// Screen 4: Foreman room view. Tasks in the room + create/assign/status.
export default function ForemanRoomView({nav, params}) {
  useDbVersion();
  const room = getRoom(params.roomId);
  if (!room) {
    return <Card className="p-6 text-center text-zinc-600">Room not found.</Card>;
  }

  const projectId = getProjectIdForRoom(room.id);
  const tasks = getTasks(room.id);

  // Workers who can be assigned = those with GRANTED membership in this project.
  const grantedWorkerIds = db.memberships
    .list(
      m =>
        m.projectId === projectId &&
        m.accessLevel === ACCESS_LEVEL.GRANTED
    )
    .map(m => m.userId);
  const assignableWorkers = grantedWorkerIds
    .map(id => db.users.get(id))
    .filter(Boolean);

  return (
    <div className="space-y-5">
      <PageTitle subtitle="Room">{room.name}</PageTitle>

      <section>
        <SectionTitle count={tasks.length}>Tasks</SectionTitle>
        {tasks.length === 0 ? (
          <Card className="p-4 text-sm text-zinc-500">No tasks yet.</Card>
        ) : (
          <ul className="space-y-3">
            {tasks.map(t => (
              <TaskRow
                key={t.id}
                task={t}
                assignableWorkers={assignableWorkers}
                nav={nav}
              />
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionTitle>Create a task</SectionTitle>
        <Card className="p-4">
          <CreateTaskForm roomId={room.id} foremanId={nav.user.id} />
        </Card>
      </section>
    </div>
  );
}

function TaskRow({task, assignableWorkers, nav}) {
  function toggleAssignee(workerId, checked) {
    const next = checked
      ? [...task.assignedWorkerIds, workerId]
      : task.assignedWorkerIds.filter(id => id !== workerId);
    setTaskAssignees(task.id, next);
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-steel">{task.title}</h3>
          <p className="mt-0.5 text-xs tracking-wide text-zinc-500 uppercase">
            {task.trade}
          </p>
        </div>
        <StatusBadge status={task.status} />
      </div>

      {task.instructions && (
        <p className="mt-2 text-sm text-zinc-600">{task.instructions}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Select
          value={task.status}
          onChange={e => setTaskStatus(task.id, e.target.value)}
          className="w-auto">
          {TASK_STATUS_LIST.map(s => (
            <option key={s} value={s}>
              {TASK_STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
        <Button onClick={() => nav.go('task', {taskId: task.id})}>
          Open task
        </Button>
      </div>

      <div className="mt-3 rounded-md bg-zinc-50 p-3">
        <div className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
          Assign workers
        </div>
        {assignableWorkers.length === 0 ? (
          <p className="mt-1 text-sm text-zinc-400 italic">
            No granted workers in this project yet.
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-3">
            {assignableWorkers.map(w => (
              <label
                key={w.id}
                className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--color-brand)]"
                  checked={task.assignedWorkerIds.includes(w.id)}
                  onChange={e => toggleAssignee(w.id, e.target.checked)}
                />
                {w.name} ({w.trade})
              </label>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function CreateTaskForm({roomId, foremanId}) {
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [trade, setTrade] = useState(WORKER_TRADES[0]);

  function submit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    createTask({
      roomId,
      title: title.trim(),
      instructions: instructions.trim(),
      trade,
      createdByUserId: foremanId,
    });
    setTitle('');
    setInstructions('');
    setTrade(WORKER_TRADES[0]);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Title">
        <TextInput value={title} onChange={e => setTitle(e.target.value)} />
      </Field>
      <Field label="Instructions">
        <TextArea
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
        />
      </Field>
      <Field label="Trade">
        <Select value={trade} onChange={e => setTrade(e.target.value)}>
          {WORKER_TRADES.map(t => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit">Create task</Button>
    </form>
  );
}
