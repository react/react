'use client';

import * as React from 'react';

import Container from './Container.js';

export function Counter({incrementAction}) {
  const [count, incrementFormAction] = React.useActionState(incrementAction, 0);
  return (
    <Container>
      <form>
        <button formAction={incrementFormAction}>Count: {count}</button>
      </form>
    </Container>
  );
}
