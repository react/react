import React, {useState} from 'react';
import {useDbVersion} from '../lib/useDb.js';
import {db} from '../data/db.js';
import {requestMembership} from '../domain/entities.js';
import {findProjectByInviteCode, getProject} from '../domain/queries.js';
import {getVisibleTasksForWorker} from '../domain/permissions.js';
import {ACCESS_LEVEL, TASK_STATUS_LABEL} from '../domain/constants.js';

// Screens 7 + 8: Worker join project (invite code) and "my tasks".
// Enforces the section-3 rule: pending membership shows nothing.
export default function WorkerHome({nav}) {
  useDbVersion();
  const user = nav.user;
  const memberships = db.memberships.list(m => m.userId === user.id);

  return (
    <div>
      <h1>My projects</h1>
      <JoinForm userId={user.id} />

      {memberships.length === 0 ? (
        <p>You haven't requested to join any project yet.</p>
      ) : (
        memberships.map(m => (
          <MembershipBlock key={m.id} membership={m} user={user} nav={nav} />
        ))
      )}
    </div>
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
    <form onSubmit={submit}>
      <label>
        Join with invite code:{' '}
        <input value={code} onChange={e => setCode(e.target.value)} />
      </label>{' '}
      <button type="submit">Request to join</button>
      {message && <p>{message}</p>}
    </form>
  );
}

function MembershipBlock({membership, user, nav}) {
  const project = getProject(membership.projectId);
  if (!project) return null;

  // Pending => sees nothing (section 3). Granted => the filtered task list.
  const isGranted = membership.accessLevel === ACCESS_LEVEL.GRANTED;
  const tasks = isGranted
    ? getVisibleTasksForWorker(user, project.id)
    : [];

  return (
    <div>
      <h2>{project.name}</h2>
      <p>Access: {membership.accessLevel}</p>
      {!isGranted ? (
        <p>Pending approval — you can't see any tasks yet.</p>
      ) : tasks.length === 0 ? (
        <p>No tasks visible to you in this project yet.</p>
      ) : (
        <ul>
          {tasks.map(t => (
            <li key={t.id}>
              <strong>{t.title}</strong> — trade: {t.trade} — status:{' '}
              {TASK_STATUS_LABEL[t.status]}{' '}
              <button onClick={() => nav.go('task', {taskId: t.id})}>
                Open task
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
