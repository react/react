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

// Screen 5: Foreman pending requests. Grant access + select visible rooms.
export default function ForemanPendingRequests({nav, params}) {
  useDbVersion();
  const project = getProject(params.projectId);
  if (!project) return <p>Project not found.</p>;

  const memberships = getMembershipsForProject(project.id);
  const pending = memberships.filter(
    m => m.accessLevel === ACCESS_LEVEL.PENDING
  );
  const granted = memberships.filter(
    m => m.accessLevel === ACCESS_LEVEL.GRANTED
  );
  const rooms = getAllRoomsForProject(project.id);

  return (
    <div>
      <h1>Access requests — {project.name}</h1>

      <h2>Pending</h2>
      {pending.length === 0 ? (
        <p>No pending requests.</p>
      ) : (
        <ul>
          {pending.map(m => (
            <GrantRow key={m.id} membership={m} rooms={rooms} mode="grant" />
          ))}
        </ul>
      )}

      <h2>Granted workers</h2>
      {granted.length === 0 ? (
        <p>No granted workers yet.</p>
      ) : (
        <ul>
          {granted.map(m => (
            <GrantRow key={m.id} membership={m} rooms={rooms} mode="update" />
          ))}
        </ul>
      )}
    </div>
  );
}

function GrantRow({membership, rooms, mode}) {
  const worker = getUser(membership.userId);
  const [selected, setSelected] = useState(
    new Set(membership.visibleRoomIds)
  );

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
    <li>
      <div>
        <strong>{worker ? worker.name : '(unknown)'}</strong>
        {worker ? ` (${worker.trade})` : ''}
      </div>
      <div>Visible rooms:</div>
      {rooms.length === 0 ? (
        <em>No rooms in this project yet — add rooms first.</em>
      ) : (
        <ul>
          {rooms.map(r => (
            <li key={r.id}>
              <label>
                <input
                  type="checkbox"
                  checked={selected.has(r.id)}
                  onChange={e => toggle(r.id, e.target.checked)}
                />
                {getRoomLabel(r.id)}
              </label>
            </li>
          ))}
        </ul>
      )}
      <button onClick={submit}>
        {mode === 'grant' ? 'Grant access' : 'Update visible rooms'}
      </button>
    </li>
  );
}
