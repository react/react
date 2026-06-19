import React, {useState} from 'react';
import {useDbVersion} from '../lib/useDb.js';
import {
  createBuilding,
  createFloor,
  createRoom,
} from '../domain/entities.js';
import {
  getProject,
  getBuildings,
  getFloors,
  getRooms,
  getTasks,
} from '../domain/queries.js';

// Screen 3: Foreman project view. building > floor > room as nested lists.
// Add building / floor / room here. Rooms link to the room view (screen 4).
export default function ForemanProjectView({nav, params}) {
  useDbVersion();
  const project = getProject(params.projectId);
  if (!project) return <p>Project not found.</p>;

  const buildings = getBuildings(project.id);

  return (
    <div>
      <h1>{project.name}</h1>
      <p>
        {project.address || '(no address)'} — invite code:{' '}
        <code>{project.inviteCode}</code>
      </p>

      <h2>Buildings</h2>
      {buildings.length === 0 ? (
        <p>No buildings yet.</p>
      ) : (
        <ul>
          {buildings.map(b => (
            <BuildingItem key={b.id} building={b} nav={nav} />
          ))}
        </ul>
      )}
      <AddForm
        label="Add building"
        placeholder='e.g. "Building A"'
        onAdd={name => createBuilding({projectId: project.id, name})}
      />
    </div>
  );
}

function BuildingItem({building, nav}) {
  const floors = getFloors(building.id);
  return (
    <li>
      <strong>{building.name}</strong>
      {floors.length === 0 ? (
        <p>No floors yet.</p>
      ) : (
        <ul>
          {floors.map(f => (
            <FloorItem key={f.id} floor={f} nav={nav} />
          ))}
        </ul>
      )}
      <AddForm
        label="Add floor"
        placeholder='e.g. "Floor 3"'
        onAdd={name => createFloor({buildingId: building.id, name})}
      />
    </li>
  );
}

function FloorItem({floor, nav}) {
  const rooms = getRooms(floor.id);
  return (
    <li>
      {floor.name}
      {rooms.length === 0 ? (
        <p>No rooms yet.</p>
      ) : (
        <ul>
          {rooms.map(r => {
            const taskCount = getTasks(r.id).length;
            return (
              <li key={r.id}>
                {r.name} ({taskCount} task{taskCount === 1 ? '' : 's'}){' '}
                <button onClick={() => nav.go('room', {roomId: r.id})}>
                  Open room
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <AddForm
        label="Add room"
        placeholder='e.g. "Apartment 12, kitchen"'
        onAdd={name => createRoom({floorId: floor.id, name})}
      />
    </li>
  );
}

// Small reusable inline add form (one text input + button).
function AddForm({label, placeholder, onAdd}) {
  const [value, setValue] = useState('');
  function submit(e) {
    e.preventDefault();
    if (!value.trim()) return;
    onAdd(value.trim());
    setValue('');
  }
  return (
    <form onSubmit={submit}>
      <input
        value={value}
        placeholder={placeholder}
        onChange={e => setValue(e.target.value)}
      />{' '}
      <button type="submit">{label}</button>
    </form>
  );
}
