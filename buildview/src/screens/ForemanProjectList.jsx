import React, {useState} from 'react';
import {useDbVersion} from '../lib/useDb.js';
import {createProject} from '../domain/entities.js';
import {getProjectsForForeman} from '../domain/queries.js';
import {
  Button,
  Card,
  PageTitle,
  SectionTitle,
  InviteCode,
  Field,
  TextInput,
} from '../components/ui.jsx';

// Screen 2: Foreman project list. List projects (with invite code) + create.
export default function ForemanProjectList({nav}) {
  useDbVersion();
  const projects = getProjectsForForeman(nav.user.id);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    createProject({
      name: name.trim(),
      address: address.trim(),
      createdByUserId: nav.user.id,
    });
    setName('');
    setAddress('');
  }

  return (
    <div className="space-y-5">
      <PageTitle>Projects</PageTitle>

      {projects.length === 0 ? (
        <Card className="p-6 text-center text-sm text-zinc-500">
          No projects yet. Create your first one below.
        </Card>
      ) : (
        <ul className="space-y-3">
          {projects.map(p => (
            <Card key={p.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold text-steel">{p.name}</h3>
                  <p className="text-sm text-zinc-500">
                    {p.address || '(no address)'}
                  </p>
                </div>
                <div className="text-right text-xs text-zinc-500">
                  <div className="mb-1">Invite code</div>
                  <InviteCode code={p.inviteCode} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={() => nav.go('control', {projectId: p.id})}>
                  Site control
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => nav.go('project', {projectId: p.id})}>
                  Structure
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => nav.go('requests', {projectId: p.id})}>
                  Requests
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => nav.go('report', {projectId: p.id})}>
                  Report
                </Button>
              </div>
            </Card>
          ))}
        </ul>
      )}

      <section>
        <SectionTitle>Create a project</SectionTitle>
        <Card className="p-4">
          <form onSubmit={handleCreate} className="space-y-3">
            <Field label="Name">
              <TextInput value={name} onChange={e => setName(e.target.value)} />
            </Field>
            <Field label="Address">
              <TextInput
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
            </Field>
            <Button type="submit">Create project</Button>
          </form>
        </Card>
      </section>
    </div>
  );
}
