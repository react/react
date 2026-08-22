'use client';

import React from 'react';
import {
  testAction,
  testActionState,
  testActionTemporaryReference,
} from './action';

export function TestActionFromClient() {
  return (
    <form action={testAction}>
      <button>test-action-from-client</button>
    </form>
  );
}

export function TestUseActionState() {
  const [state, formAction] = React.useActionState(testActionState, 0);

  return (
    <form action={formAction}>
      <button data-testid="use-action-state">
        test-useActionState: {state}
      </button>
    </form>
  );
}

export function TestTemporaryReference() {
  const [result, setResult] = React.useState<React.ReactNode>('(none)');

  return (
    <div style={{display: 'flex'}}>
      <form
        action={async () => {
          setResult(await testActionTemporaryReference(<span>[client]</span>));
        }}>
        <button>test-temporary-reference</button>
      </form>
      <div data-testid="temporary-reference">result: {result}</div>
    </div>
  );
}
