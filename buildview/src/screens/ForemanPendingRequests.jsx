import React, {useState} from 'react';
import {useDbVersion} from '../lib/useDb.js';
import {grantMembership, setVisibleRooms} from '../domain/entities.js';
import {
  getProject,
  getMembershipsForProject,
  getAllRoomsForProject,
  getRoomLabel,
  getUser,
} from '../domain/queries.js';
import {ACCESS_LEVEL} from '../domain/constants.js';
import {
  Button,
  Card,
  PageTitle,
  SectionTitle,
} from '../components/ui.jsx';

// Screen 5: Foreman pending requests. Grant access + select visible rooms.
export default function ForemanPendingRequests({nav, params}) {
  useDbVersion();
  const project = getProject(params.projectId);
  if (!project) {
    return <Card className="p-6 text-center text-zinc-600">Project not found.</Card>;
  }

  const memberships = getMembershipsForProject(project.id);
  const pending = memberships.filter(
    m => m.accessLevel === ACCESS_LEVEL.PENDING
  );
  const granted = memberships.filter(
    m => m.accessLevel === ACCESS_LEVEL.GRANTED
  );
  const rooms = getAllRoomsForProject(project.id);

  return (
    <div className="space-y-5">
      <PageTitle subtitle={project.name}>Access requests</PageTitle>

      <section>
        <SectionTitle count={pending.length}>Pending</SectionTitle>
        {pending.length === 0 ? (
          <Card className="p-4 text-sm text-zinc-500">No pending requests.</Card>
        ) : (
          <ul className="space-y-3">
            {pending.map(m => (
              <GrantRow key={m.id} membership={m} rooms={rooms} mode="grant" />
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionTitle count={granted.length}>Granted workers</SectionTitle>
        {granted.length === 0 ? (
          <Card className="p-4 text-sm text-zinc-500">
            No granted workers yet.
          </Card>
        ) : (
          <ul className="space-y-3">
            {granted.map(m => (
              <GrantRow key={m.id} membership={m} rooms={rooms} mode="update" />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function GrantRow({membership, rooms, mode}) {
  const worker = getUser(membership.userId);
  const [selected, setSelected] = useState(new Set(membership.visibleRoomIds));

  function toggle(roomId, checked) {
    setSelected(prev => {
      const next = new Set(prev);
      if (checked) next.add(roomId);
      else next.delete(roomId);
      return next;
    });
  }

  function submit() {
    const ids = [...selected];
    if (mode === 'grant') grantMembership(membership.id, ids);
    else setVisibleRooms(membership.id, ids);
  }

  return (
    <Card className="p-4">
      <h3 className="font-bold text-steel">
        {worker ? worker.name : '(unknown)'}
        {worker && (
          <span className="ml-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">
            {worker.trade}
          </span>
        )}
      </h3>

      <div className="mt-3 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
        Visible rooms
      </div>
      {rooms.length === 0 ? (
        <p className="mt-1 text-sm text-zinc-400 italic">
          No rooms in this project yet — add rooms first.
        </p>
      ) : (
        <div className="mt-2 space-y-1.5">
          {rooms.map(r => (
            <label
              key={r.id}
              className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                className="size-4 accent-[var(--color-brand)]"
                checked={selected.has(r.id)}
                onChange={e => toggle(r.id, e.target.checked)}
              />
              {getRoomLabel(r.id)}
            </label>
          ))}
        </div>
      )}

      <div className="mt-3">
        <Button onClick={submit}>
          {mode === 'grant' ? 'Grant access' : 'Update visible rooms'}
        </Button>
      </div>
    </Card>
  );
}
