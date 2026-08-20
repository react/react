/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {render, screen, fireEvent} from '@testing-library/react';
import * as React from 'react';
import {useState} from 'react';
import {expectLogsAndClear, log} from './expectLogs';

function Counter() {
  let [state, setState] = useState(0);
  return (
    <div>
      <Title text="Counter" />
      <span>{state}</span>
      <button data-testid="button" onClick={() => setState(state + 1)}>
        increment
      </button>
    </div>
  );
}

function Title({text}) {
  log(`rendering: ${text}`);
  return <h1>{text}</h1>;
}

test('use-state', async () => {
  const {asFragment} = render(<Counter />);

  expect(asFragment()).toMatchInlineSnapshot(`
  <DocumentFragment>
    <div>
      <h1>
        Counter
      </h1>
      <span>
        0
      </span>
      <button
        data-testid="button"
      >
        increment
      </button>
    </div>
  </DocumentFragment>
  `);

  expectLogsAndClear(['rendering: Counter']);

  fireEvent.click(screen.getByTestId('button'));
  await screen.findByText('1');

  expectLogsAndClear(__FORGET__ ? [] : ['rendering: Counter']);
});
