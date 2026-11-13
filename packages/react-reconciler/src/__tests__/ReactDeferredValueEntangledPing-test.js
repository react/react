/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

let React;
let ReactNoop;
let Scheduler;
let act;
let waitFor;

describe('deferred tasks spawned after an entangled ping', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    ({act, waitFor} = require('internal-test-utils'));
  });

  it('retains all entangled state updates in the spawned task', async () => {
    const resources = new Map();
    [
      'Gate 0:0',
      'Gate 1:0',
      'Gate 0:1',
      'Gate 2:1',
      'Gate 2:2',
      'Preview 2:2',
      'Final 2:1',
      'Final 2:2',
    ].forEach(name => {
      let resolve;
      const promise = new Promise(r => {
        resolve = r;
      });
      resources.set(name, {
        Component: React.lazy(() => promise),
        resolve() {
          resolve({
            default: ({children}) =>
              name.startsWith('Gate ') ? children : name,
          });
        },
      });
    });

    let setX;
    let setY;

    function Text({text}) {
      Scheduler.log(text);
      return text;
    }

    function Deferred({x, y}) {
      const name = React.useDeferredValue(
        `Final ${x}:${y}`,
        `Preview ${x}:${y}`,
      );
      const Resource = resources.get(name).Component;
      return <Resource />;
    }

    function Content({x, y}) {
      const Gate = resources.get(`Gate ${x}:${y}`).Component;
      return (
        <Gate>
          <Text text={`Ready ${x}:${y}`} />
          {x + y > 2 ? <Deferred x={x} y={y} /> : null}
        </Gate>
      );
    }

    function App() {
      const [x, updateX] = React.useState(0);
      const [y, updateY] = React.useState(0);
      setX = updateX;
      setY = updateY;
      Scheduler.log(`App ${x}:${y}`);
      return (
        <React.Suspense fallback="Fallback">
          <Content x={x} y={y} />
        </React.Suspense>
      );
    }

    resources.get('Gate 0:0').resolve();
    resources.get('Gate 2:1').resolve();
    resources.get('Final 2:1').resolve();
    const root = ReactNoop.createRoot();
    await act(() => root.render(<App />));
    Scheduler.unstable_clearLog();
    expect(root).toMatchRenderedOutput('Ready 0:0');

    // The third transition entangles both earlier updates before their
    // modules finish loading.
    await act(() => React.startTransition(() => setX(x => x + 1)));
    Scheduler.unstable_clearLog();
    await act(() => React.startTransition(() => setY(y => y + 1)));
    Scheduler.unstable_clearLog();
    await act(() =>
      React.startTransition(() => {
        setX(x => x + 1);
        setY(y => y + 1);
      }),
    );
    Scheduler.unstable_clearLog();
    expect(root).toMatchRenderedOutput('Ready 0:0');

    // The old Y-only module pings a different lane during the combined retry.
    await act(async () => {
      resources.get('Gate 2:2').resolve();
      await waitFor(['App 2:2', 'Ready 2:2']);
      resources.get('Gate 0:1').resolve();
    });
    Scheduler.unstable_clearLog();
    // Neither 2:2 deferred resource is ready. Do not commit a partial update.
    expect(root).toMatchRenderedOutput('Ready 0:0');

    await act(() => resources.get('Final 2:2').resolve());
    Scheduler.unstable_clearLog();
    expect(root).toMatchRenderedOutput('Ready 2:2Final 2:2');
  });
});
