/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as React from 'react';
import {render} from '@testing-library/react';
import {expectLogsAndClear, log} from './expectLogs';

function Hello({name}) {
  const items = [1, 2, 3].map(item => {
    log(`recomputing ${item}`);
    return <div key={item}>Item {item}</div>;
  });
  return (
    <div>
      Hello<b>{name}</b>
      {items}
    </div>
  );
}

test('hello', () => {
  const {asFragment, rerender} = render(<Hello name="World" />);

  expect(asFragment()).toMatchInlineSnapshot(`
    <DocumentFragment>
      <div>
        Hello
        <b>
          World
        </b>
        <div>
          Item 1
        </div>
        <div>
          Item 2
        </div>
        <div>
          Item 3
        </div>
      </div>
    </DocumentFragment>
  `);

  expectLogsAndClear(['recomputing 1', 'recomputing 2', 'recomputing 3']);

  rerender(<Hello name="Universe" />);

  expect(asFragment()).toMatchInlineSnapshot(`
    <DocumentFragment>
      <div>
        Hello
        <b>
          Universe
        </b>
        <div>
          Item 1
        </div>
        <div>
          Item 2
        </div>
        <div>
          Item 3
        </div>
      </div>
    </DocumentFragment>
  `);

  expectLogsAndClear(
    __FORGET__ ? [] : ['recomputing 1', 'recomputing 2', 'recomputing 3']
  );
});
