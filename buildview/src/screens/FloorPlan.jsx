import React from 'react';
import {useDbVersion} from '../lib/useDb.js';
import {db} from '../data/db.js';
import {getRooms, getTasks, getProjectIdForRoom} from '../domain/queries.js';
import {getRoomStatus} from '../domain/status.js';
import {ROOM_STATUS, ROOM_STATUS_LABEL} from '../domain/constants.js';
import {Card, PageTitle, SectionTitle} from '../components/ui.jsx';

// Feature 2: Plan-first floor view. A simple, clean fake floor layout (a grid
// of room tiles, not a parsed blueprint) where each room is clickable and
// colored by its derived status.
const TILE_STYLE = {
  [ROOM_STATUS.TODO]: 'bg-zinc-200 text-zinc-800 hover:bg-zinc-300',
  [ROOM_STATUS.IN_PROGRESS]: 'bg-progress text-white hover:brightness-110',
  [ROOM_STATUS.BLOCKED]: 'bg-hazard text-white hover:brightness-110',
  [ROOM_STATUS.DONE]: 'bg-go text-white hover:brightness-110',
};

export default function FloorPlan({nav, params}) {
  useDbVersion();
  const floor = db.floors.get(params.floorId);
  if (!floor) {
    return <Card className="p-6 text-center text-zinc-600">Floor not found.</Card>;
  }
  const building = db.buildings.get(floor.buildingId);
  const rooms = getRooms(floor.id);

  return (
    <div className="space-y-5">
      <PageTitle subtitle={building ? `${building.name} · ${floor.name}` : floor.name}>
        Floor plan
      </PageTitle>

      <Legend />

      <SectionTitle count={rooms.length}>Rooms</SectionTitle>
      {rooms.length === 0 ? (
        <Card className="p-4 text-sm text-zinc-500">No rooms on this floor.</Card>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {rooms.map(r => {
            const status = getRoomStatus(r.id);
            const taskCount = getTasks(r.id).length;
            return (
              <button
                key={r.id}
                onClick={() => nav.go('room', {roomId: r.id})}
                className={`flex min-h-28 flex-col justify-between rounded-lg border-2 border-black/10 p-3 text-left shadow-sm transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none ${TILE_STYLE[status]}`}>
                <span className="text-base font-bold">{r.name}</span>
                <span className="text-xs font-semibold uppercase tracking-wide opacity-90">
                  {ROOM_STATUS_LABEL[status]} · {taskCount} task
                  {taskCount === 1 ? '' : 's'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Legend() {
  const items = [
    [ROOM_STATUS.TODO, 'bg-zinc-300'],
    [ROOM_STATUS.IN_PROGRESS, 'bg-progress'],
    [ROOM_STATUS.BLOCKED, 'bg-hazard'],
    [ROOM_STATUS.DONE, 'bg-go'],
  ];
  return (
    <div className="flex flex-wrap gap-3 text-xs text-zinc-600">
      {items.map(([status, color]) => (
        <span key={status} className="flex items-center gap-1.5">
          <span className={`inline-block size-3 rounded-sm ${color}`} />
          {ROOM_STATUS_LABEL[status]}
        </span>
      ))}
    </div>
  );
}
