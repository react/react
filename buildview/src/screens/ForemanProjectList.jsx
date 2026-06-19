import React, {useState} from 'react';
import {useDbVersion} from '../lib/useDb.js';
import {createProject} from '../domain/entities.js';
import {getProjectsForForeman} from '../domain/queries.js';

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
    <div>
      <h1>Projects</h1>
      {projects.length === 0 ? (
        <p>No projects yet.</p>
      ) : (
        <ul>
          {projects.map(p => (
            <li key={p.id}>
              <strong>{p.name}</strong> — {p.address || '(no address)'} — invite
              code: <code>{p.inviteCode}</code>{' '}
              <button onClick={() => nav.go('project', {projectId: p.id})}>
                Open
              </button>{' '}
              <button onClick={() => nav.go('requests', {projectId: p.id})}>
                Pending requests
              </button>{' '}
              <button onClick={() => nav.go('dashboard', {projectId: p.id})}>
                Dashboard
              </button>
            </li>
          ))}
        </ul>
      )}

      <h2>Create a project</h2>
      <form onSubmit={handleCreate}>
        <div>
          <label>
            Name:{' '}
            <input value={name} onChange={e => setName(e.target.value)} />
          </label>
        </div>
        <div>
          <label>
            Address:{' '}
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
          </label>
        </div>
        <button type="submit">Create project</button>
      </form>
    </div>
  );
}
