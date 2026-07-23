'use client';

import React from 'react';
import './client.css';

export function ClientCounter(): React.ReactElement {
  const [count, setCount] = React.useState(0);
  return (
    <button onClick={() => setCount(c => c + 1)}>
      Client Counter: {count}
    </button>
  );
}

export function Hydrated() {
  const hydrated = React.useSyncExternalStore(
    React.useCallback(() => () => {}, []),
    () => true,
    () => false,
  );
  return <span data-testid="hydrated">[hydrated: {hydrated ? 1 : 0}]</span>;
}

export function TestStyleClient() {
  return <span className="test-style-client">test-style-client</span>;
}
