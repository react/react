'use client';

import React from 'react';

export function TestSerializationClient(props: {action: () => Promise<any>}) {
  const [state, setState] = React.useState('?');
  return (
    <button
      data-testid="serialization"
      onClick={async () => {
        const result = await props.action();
        setState(result);
      }}>
      {state}
    </button>
  );
}
