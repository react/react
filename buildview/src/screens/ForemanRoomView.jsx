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

// Screen 4: Foreman room view. Tasks in the room + create/assign/status.
export default function ForemanRoomView({nav, params}) {
  useDbVersion();
  const room = getRoom(params.roomId);
  if (!room) return <p>Room not found.</p>;

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
    <div>
      <h1>Room: {room.name}</h1>

      <h2>Tasks</h2>
      {tasks.length === 0 ? (
        <p>No tasks yet.</p>
      ) : (
        <ul>
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

      <h2>Create a task</h2>
      <CreateTaskForm roomId={room.id} foremanId={nav.user.id} />
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
    <li>
      <div>
        <strong>{task.title}</strong> — trade: {task.trade} — status:{' '}
        <select
          value={task.status}
          onChange={e => setTaskStatus(task.id, e.target.value)}>
          {TASK_STATUS_LIST.map(s => (
            <option key={s} value={s}>
              {TASK_STATUS_LABEL[s]}
            </option>
          ))}
        </select>{' '}
        <button onClick={() => nav.go('task', {taskId: task.id})}>
          Open task
        </button>
      </div>
      {task.instructions && <div>Instructions: {task.instructions}</div>}
      <div>
        Assigned:{' '}
        {task.assignedWorkerIds.length === 0
          ? '(none)'
          : task.assignedWorkerIds.map(getUserName).join(', ')}
      </div>
      <div>
        Assign workers:{' '}
        {assignableWorkers.length === 0 ? (
          <em>(no granted workers in this project yet)</em>
        ) : (
          assignableWorkers.map(w => (
            <label key={w.id} style={{marginRight: '1em'}}>
              <input
                type="checkbox"
                checked={task.assignedWorkerIds.includes(w.id)}
                onChange={e => toggleAssignee(w.id, e.target.checked)}
              />
              {w.name} ({w.trade})
            </label>
          ))
        )}
      </div>
    </li>
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
    <form onSubmit={submit}>
      <div>
        <label>
          Title:{' '}
          <input value={title} onChange={e => setTitle(e.target.value)} />
        </label>
      </div>
      <div>
        <label>
          Instructions:{' '}
          <textarea
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
          />
        </label>
      </div>
      <div>
        <label>
          Trade:{' '}
          <select value={trade} onChange={e => setTrade(e.target.value)}>
            {WORKER_TRADES.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button type="submit">Create task</button>
    </form>
  );
}
