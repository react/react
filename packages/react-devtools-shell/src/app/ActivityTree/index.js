import * as React from 'react';
import {useState} from 'react';

const Activity = React.Activity || React.unstable_Activity;

function Profile({name}) {
  return (
    <div>
      <h4>{name}</h4>
      <Bio />
    </div>
  );
}

function Bio() {
  return <p>This is a bio section.</p>;
}

export default function ActivityTree() {
  const [mode, setMode] = useState('hidden');

  if (Activity == null) {
    return null;
  }

  return (
    <>
      <h2>Activity</h2>
      <button
        onClick={() => setMode(m => (m === 'visible' ? 'hidden' : 'visible'))}>
        Toggle mode (current: {mode})
      </button>
      <Activity mode={mode} name="profile-panel">
        <Profile name="Alice" />
        <Profile name="Bob" />
      </Activity>
    </>
  );
}
