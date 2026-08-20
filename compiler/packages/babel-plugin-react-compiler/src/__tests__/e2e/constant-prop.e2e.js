/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as React from 'react';
import {render} from '@testing-library/react';

globalThis.constantValue = 'global test value';

test('literal-constant-propagation', () => {
  function Component() {
    'use memo';
    const x = 'test value 1';
    return <div>{x}</div>;
  }
  const {asFragment, rerender} = render(<Component />);

  expect(asFragment()).toMatchInlineSnapshot(`
    <DocumentFragment>
      <div>
        test value 1
      </div>
    </DocumentFragment>
  `);

  rerender(<Component />);

  expect(asFragment()).toMatchInlineSnapshot(`
    <DocumentFragment>
      <div>
        test value 1
      </div>
    </DocumentFragment>
  `);
});

test('global-constant-propagation', () => {
  function Component() {
    'use memo';
    const x = constantValue;

    return <div>{x}</div>;
  }
  const {asFragment, rerender} = render(<Component />);

  expect(asFragment()).toMatchInlineSnapshot(`
    <DocumentFragment>
      <div>
        global test value
      </div>
    </DocumentFragment>
  `);

  rerender(<Component />);

  expect(asFragment()).toMatchInlineSnapshot(`
    <DocumentFragment>
      <div>
        global test value
      </div>
    </DocumentFragment>
  `);
});

test('lambda-constant-propagation', () => {
  function Component() {
    'use memo';
    const x = 'test value 1';
    const getDiv = () => <div>{x}</div>;
    return getDiv();
  }
  const {asFragment, rerender} = render(<Component />);

  expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div>
          test value 1
        </div>
      </DocumentFragment>
    `);

  rerender(<Component />);

  expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div>
          test value 1
        </div>
      </DocumentFragment>
    `);
});

test('lambda-constant-propagation-of-phi-node', () => {
  function Component({noopCallback}) {
    'use memo';
    const x = 'test value 1';
    if (constantValue) {
      noopCallback();
    }
    for (let i = 0; i < 5; i++) {
      if (!constantValue) {
        noopCallback();
      }
    }
    const getDiv = () => <div>{x}</div>;
    return getDiv();
  }

  const {asFragment, rerender} = render(<Component noopCallback={() => {}} />);

  expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div>
          test value 1
        </div>
      </DocumentFragment>
    `);

  rerender(<Component noopCallback={() => {}} />);

  expect(asFragment()).toMatchInlineSnapshot(`
    <DocumentFragment>
      <div>
        test value 1
      </div>
    </DocumentFragment>
  `);
});
