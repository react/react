/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

let normalizeConsoleFormat;

describe('normalizeConsoleFormat', () => {
  beforeEach(() => {
    normalizeConsoleFormat = require('shared/normalizeConsoleFormat').default;
  });

  it('normalize empty string', async () => {
    expect(normalizeConsoleFormat('', [1, {}, 'foo'], 0)).toMatchInlineSnapshot(
      `"%o %o %s"`,
    );
  });

  it('normalize extra args', async () => {
    expect(
      normalizeConsoleFormat('%f', [1, {}, 'foo'], 0),
    ).toMatchInlineSnapshot(`"%f %o %s"`);
  });

  it('normalize fewer than args', async () => {
    expect(
      normalizeConsoleFormat('%s %O %o %f', [1, {}, 'foo'], 0),
    ).toMatchInlineSnapshot(`"%s %O %o %%f"`);
  });

  it('normalize escape sequences', async () => {
    expect(
      normalizeConsoleFormat('hel%lo %s %%s world', [1, 'foo'], 0),
    ).toMatchInlineSnapshot(`"hel%lo %s %%s world %s"`);
  });

  it('normalize ending with escape', async () => {
    expect(
      normalizeConsoleFormat('hello %s world %', [1, {}, 'foo'], 0),
    ).toMatchInlineSnapshot(`"hello %s world % %o %s"`);
    expect(
      normalizeConsoleFormat('hello %s world %', [], 0),
    ).toMatchInlineSnapshot(`"hello %%s world %"`);
  });
});
