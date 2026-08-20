'use client';

import * as React from 'react';
import Container from './Container.js';

export function Navigate() {
  /** Repro for https://issues.chromium.org/u/1/issues/419746417 */
  function provokeChromeCrash() {
    React.startTransition(async () => {
      console.log('Default transition triggered');

      await new Promise(resolve => {
        setTimeout(
          () => {
            history.pushState(
              {},
              '',
              `?chrome-crash-419746417=${performance.now()}`
            );
          },
          // This needs to happen before React's default transition indicator
          // is displayed but after it's scheduled.
          100 + -50
        );

        setTimeout(() => {
          console.log('Default transition completed');
          resolve();
        }, 1000);
      });
    });
  }

  return (
    <Container>
      <h2>Navigation fixture</h2>
      <button onClick={provokeChromeCrash}>Provoke Chrome Crash (fixed)</button>
    </Container>
  );
}
