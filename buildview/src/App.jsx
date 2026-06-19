import React from 'react';
import {db, COLLECTIONS} from './data/db.js';
import {useDbVersion} from './lib/useDb.js';

// -----------------------------------------------------------------------------
// STEP 1 PLACEHOLDER SCREEN
//
// This is a temporary smoke-test screen, not a real flow. It only exists to
// prove the data-access seam works (write -> persist -> reload survives) before
// we build the login screen and Flow A on top of it. It will be replaced in
// step 3.
// -----------------------------------------------------------------------------
export default function App() {
  useDbVersion(); // re-render on any store change

  const counts = COLLECTIONS.map(name => [name, db.list(name).length]);

  return (
    <div>
      <h1>BuildView — storage seam check (step 1)</h1>
      <p>
        Record counts per collection (read through the data-access module). Add a
        test record, then reload the page: the count should survive.
      </p>
      <ul>
        {counts.map(([name, count]) => (
          <li key={name}>
            {name}: {count}
          </li>
        ))}
      </ul>
      <button
        onClick={() =>
          db.users.create({
            name: 'Test User',
            role: 'foreman',
            trade: 'none',
            joinedProjectIds: [],
          })
        }>
        Add a test user
      </button>{' '}
      <button onClick={() => db.reset()}>Reset all data</button>
    </div>
  );
}
