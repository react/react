/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {render, screen, fireEvent} from '@testing-library/react';
import * as React from 'react';
import {expectLogsAndClear, log} from './expectLogs';

function Counter(props) {
  'use memo';
  let value = props.value;
  let a = value++;
  expect(a).toBe(props.value); // postfix
  let b = ++value;
  expect(b).toBe(props.value + 2); // previous postfix operation + prefix operation
  let c = ++value;
  expect(c).toBe(props.value + 3);
  let d = value--;
  expect(d).toBe(props.value + 3);
  let e = --value;
  expect(e).toBe(props.value + 1);
  let f = --value;
  expect(f).toBe(props.value);
  expect(value).toBe(props.value);
  return <span>{value}</span>;
}

test('use-state', async () => {
  const {asFragment, rerender} = render(<Counter value={0} />);
  expect(asFragment()).toMatchInlineSnapshot(`
    <DocumentFragment>
      <span>
        0
      </span>
    </DocumentFragment>
  `);

  rerender(<Counter value={1} />);
  expect(asFragment()).toMatchInlineSnapshot(`
    <DocumentFragment>
      <span>
        1
      </span>
    </DocumentFragment>
  `);
});
