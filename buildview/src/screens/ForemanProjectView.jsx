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
import {
  Button,
  Card,
  PageTitle,
  InviteCode,
} from '../components/ui.jsx';

// Screen 3: Foreman project view. building > floor > room as nested lists.
// Add building / floor / room here. Rooms link to the room view (screen 4).
export default function ForemanProjectView({nav, params}) {
  useDbVersion();
  const project = getProject(params.projectId);
  if (!project) return <p>Project not found.</p>;

  const buildings = getBuildings(project.id);

  return (
    <div className="space-y-5">
      <PageTitle
        subtitle={project.address || '(no address)'}>
        {project.name}
      </PageTitle>
      <Card className="flex items-center justify-between gap-3 p-3">
        <span className="text-sm font-semibold text-zinc-600">Invite code</span>
        <InviteCode code={project.inviteCode} />
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 border-l-4 border-brand pl-3 text-lg font-bold tracking-tight text-steel uppercase">
          Buildings
        </h2>
        {buildings.length === 0 ? (
          <p className="text-sm text-zinc-500">No buildings yet.</p>
        ) : (
          <div className="space-y-3">
            {buildings.map(b => (
              <BuildingItem key={b.id} building={b} nav={nav} />
            ))}
          </div>
        )}
        <div className="mt-3">
          <AddForm
            label="Add building"
            placeholder='e.g. "Building A"'
            onAdd={name => createBuilding({projectId: project.id, name})}
          />
        </div>
      </Card>
    </div>
  );
}

function BuildingItem({building, nav}) {
  const floors = getFloors(building.id);
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <h3 className="font-bold text-steel">🏢 {building.name}</h3>
      <div className="mt-2 space-y-2 border-l-2 border-zinc-300 pl-3">
        {floors.length === 0 ? (
          <p className="text-sm text-zinc-500">No floors yet.</p>
        ) : (
          floors.map(f => <FloorItem key={f.id} floor={f} nav={nav} />)
        )}
        <AddForm
          label="Add floor"
          placeholder='e.g. "Floor 3"'
          onAdd={name => createFloor({buildingId: building.id, name})}
        />
      </div>
    </div>
  );
}

function FloorItem({floor, nav}) {
  const rooms = getRooms(floor.id);
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3">
      <h4 className="font-semibold text-zinc-700">{floor.name}</h4>
      <div className="mt-2 space-y-1.5 border-l-2 border-zinc-200 pl-3">
        {rooms.length === 0 ? (
          <p className="text-sm text-zinc-500">No rooms yet.</p>
        ) : (
          rooms.map(r => {
            const taskCount = getTasks(r.id).length;
            return (
              <div
                key={r.id}
                className="flex items-center justify-between gap-2">
                <span className="text-sm text-zinc-700">
                  {r.name}{' '}
                  <span className="text-zinc-400">
                    ({taskCount} task{taskCount === 1 ? '' : 's'})
                  </span>
                </span>
                <Button
                  variant="secondary"
                  onClick={() => nav.go('room', {roomId: r.id})}>
                  Open
                </Button>
              </div>
            );
          })
        )}
        <AddForm
          label="Add room"
          placeholder='e.g. "Apartment 12, kitchen"'
          onAdd={name => createRoom({floorId: floor.id, name})}
        />
      </div>
    </div>
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
    <form onSubmit={submit} className="flex gap-2 pt-1">
      <input
        value={value}
        placeholder={placeholder}
        onChange={e => setValue(e.target.value)}
        className="min-h-11 flex-1 rounded-md border-2 border-zinc-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none"
      />
      <Button type="submit" variant="secondary">
        {label}
      </Button>
    </form>
  );
}
