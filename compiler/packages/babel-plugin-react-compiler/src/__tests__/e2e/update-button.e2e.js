/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {render} from '@testing-library/react';
import * as React from 'react';

function Button({label}) {
  const theme = useTheme();
  const style = computeStyle(theme);
  return <button color={style}>{label}</button>;
}

let currentTheme = 'light';
function useTheme() {
  'use memo';
  return currentTheme;
}

let styleComputations = 0;
function computeStyle(theme) {
  styleComputations++;
  return theme === 'light' ? 'white' : 'black';
}

test('update-button', () => {
  const {asFragment, rerender} = render(<Button label="Click me" />);
  expect(asFragment()).toMatchInlineSnapshot(`
    <DocumentFragment>
      <button
        color="white"
      >
        Click me
      </button>
    </DocumentFragment>
  `);

  // Update the label, but not the theme
  rerender(<Button label="Click again" />);
  // `computeStyle` should not be called again when Forget is enabled
  expect(styleComputations).toBe(__FORGET__ ? 1 : 2);
  expect(asFragment()).toMatchInlineSnapshot(`
    <DocumentFragment>
      <button
        color="white"
      >
        Click again
      </button>
    </DocumentFragment>
  `);

  currentTheme = 'dark';
  rerender(<Button label="Click again" />);
  expect(asFragment()).toMatchInlineSnapshot(`
    <DocumentFragment>
      <button
        color="black"
      >
        Click again
      </button>
    </DocumentFragment>
  `);

  expect(styleComputations).toBe(__FORGET__ ? 2 : 3);
});
