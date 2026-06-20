import React, {useState} from 'react';
import {useDbVersion} from '../lib/useDb.js';
import {db} from '../data/db.js';
import {requestMembership} from '../domain/entities.js';
import {findProjectByInviteCode, getProject} from '../domain/queries.js';
import {getVisibleTasksForWorker} from '../domain/permissions.js';
import {ACCESS_LEVEL} from '../domain/constants.js';
import {
  Button,
  Card,
  PageTitle,
  SectionTitle,
  StatusBadge,
  Field,
  TextInput,
} from '../components/ui.jsx';

// Screens 7 + 8: Worker join project (invite code) and "my tasks".
// Enforces the section-3 rule: pending membership shows nothing.
export default function WorkerHome({nav}) {
  useDbVersion();
  const user = nav.user;
  const memberships = db.memberships.list(m => m.userId === user.id);

  return (
    <div className="space-y-5">
      <PageTitle>My work</PageTitle>

      <section>
        <SectionTitle>Join a project</SectionTitle>
        <Card className="p-4">
          <JoinForm userId={user.id} />
        </Card>
      </section>

      {memberships.length === 0 ? (
        <Card className="p-6 text-center text-sm text-zinc-500">
          You haven&apos;t requested to join any project yet. Enter an invite
          code above.
        </Card>
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

function MembershipBlock({membership, user, nav}) {
  const project = getProject(membership.projectId);
  if (!project) return null;

  // Pending => sees nothing (section 3). Granted => the filtered task list.
  const isGranted = membership.accessLevel === ACCESS_LEVEL.GRANTED;
  const tasks = isGranted ? getVisibleTasksForWorker(user, project.id) : [];

  return (
    <section>
      <SectionTitle>{project.name}</SectionTitle>
      {!isGranted ? (
        <Card className="border-l-4 border-brand p-4">
          <p className="text-sm font-medium text-zinc-700">
            Pending approval — you can&apos;t see any tasks yet.
          </p>
        </Card>
      ) : tasks.length === 0 ? (
        <Card className="p-4 text-sm text-zinc-500">
          No tasks visible to you in this project yet.
        </Card>
      ) : (
        <ul className="space-y-3">
          {tasks.map(t => (
            <Card key={t.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-steel">{t.title}</h3>
                  <p className="mt-0.5 text-xs tracking-wide text-zinc-500 uppercase">
                    {t.trade}
                  </p>
                </div>
                <StatusBadge status={t.status} />
              </div>
              <div className="mt-3">
                <Button onClick={() => nav.go('task', {taskId: t.id})}>
                  Open task
                </Button>
              </div>
            </Card>
          ))}
        </ul>
      )}
    </section>
  );
}
