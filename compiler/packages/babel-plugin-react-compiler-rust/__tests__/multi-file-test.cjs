/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const assert = require('node:assert/strict');
const {test} = require('node:test');
const {transformSync} = require('@babel/core');
const compiler = require('../dist').default;

test('compiles successive files with the same Babel plugin', () => {
  const source = `
    import {useState} from 'react';
    export function useValue(props) {
      const [count] = useState(0);
      return [props.value, count];
    }
  `;
  const options = {babelrc: false, configFile: false, plugins: [compiler]};

  const first = transformSync(source, {...options, filename: 'first.js'});
  const second = transformSync(source, {...options, filename: 'second.js'});

  assert.match(first.code, /react\/compiler-runtime/);
  assert.match(second.code, /react\/compiler-runtime/);
});
